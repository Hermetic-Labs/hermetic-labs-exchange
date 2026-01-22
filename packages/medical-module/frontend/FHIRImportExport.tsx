/**
 * FHIR Import/Export UI Component
 * 
 * Provides UI for:
 * - Importing patient data from FHIR servers or files
 * - Exporting patient data as FHIR R4 bundles
 * - Server configuration management
 * - Data validation and preview
 * - Batch operations
 * 
 * Integrates with FHIRComplianceService for all FHIR operations.
 */

import { useState, useCallback, useRef } from 'react'

// Types for FHIR Import/Export
interface FHIRServerConfig {
    name: string
    baseUrl: string
    authenticationType: 'none' | 'basic' | 'bearer' | 'oauth2'
    credentials?: {
        username?: string
        password?: string
        token?: string
        clientId?: string
        clientSecret?: string
    }
    status: 'connected' | 'disconnected' | 'error' | 'testing'
    lastSync?: string
}

interface ImportedResource {
    id: string
    resourceType: string
    name?: string
    status: 'pending' | 'imported' | 'skipped' | 'error'
    errorMessage?: string
    data: any
}

interface ExportResult {
    patientId: string
    patientName: string
    resourceCount: number
    timestamp: string
    format: 'json' | 'xml'
    size: number
    downloadUrl?: string
}

interface ImportProgress {
    total: number
    processed: number
    imported: number
    skipped: number
    errors: number
    currentResource?: string
}

interface ExportOptions {
    includeObservations: boolean
    includeEncounters: boolean
    includeDevices: boolean
    includeMedications: boolean
    includeConditions: boolean
    includeHistory: boolean
    dateRange?: {
        start: string
        end: string
    }
}

interface FHIRImportExportProps {
    patientId?: string
    serverName?: string
    onImportComplete?: (resources: ImportedResource[]) => void
    onExportComplete?: (result: ExportResult) => void
}

// Demo FHIR data for preview
function generateDemoBundle(): any {
    const patientId = `patient-${Date.now()}`
    return {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
            {
                resource: {
                    resourceType: 'Patient',
                    id: patientId,
                    name: [{ use: 'official', family: 'Smith', given: ['John', 'Robert'] }],
                    gender: 'male',
                    birthDate: '1985-04-12',
                    telecom: [
                        { system: 'phone', value: '555-123-4567', use: 'home' },
                        { system: 'email', value: 'john.smith@email.com' }
                    ],
                    address: [{
                        use: 'home',
                        line: ['123 Main St'],
                        city: 'Springfield',
                        state: 'IL',
                        postalCode: '62701'
                    }]
                }
            },
            {
                resource: {
                    resourceType: 'Observation',
                    id: 'obs-1',
                    status: 'final',
                    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
                    subject: { reference: `Patient/${patientId}` },
                    effectiveDateTime: new Date().toISOString(),
                    valueQuantity: { value: 72, unit: 'beats/minute' }
                }
            },
            {
                resource: {
                    resourceType: 'Observation',
                    id: 'obs-2',
                    status: 'final',
                    code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
                    subject: { reference: `Patient/${patientId}` },
                    effectiveDateTime: new Date().toISOString(),
                    component: [
                        { code: { coding: [{ code: '8480-6', display: 'Systolic BP' }] }, valueQuantity: { value: 120, unit: 'mmHg' } },
                        { code: { coding: [{ code: '8462-4', display: 'Diastolic BP' }] }, valueQuantity: { value: 80, unit: 'mmHg' } }
                    ]
                }
            },
            {
                resource: {
                    resourceType: 'Encounter',
                    id: 'enc-1',
                    status: 'finished',
                    class: { code: 'AMB', display: 'Ambulatory' },
                    subject: { reference: `Patient/${patientId}` },
                    period: { start: '2024-12-15T09:00:00Z', end: '2024-12-15T09:45:00Z' },
                    type: [{ text: 'Annual Physical' }]
                }
            }
        ]
    }
}

export default function FHIRImportExport({
    patientId,
    serverName,
    onImportComplete,
    onExportComplete
}: FHIRImportExportProps) {
    // State
    const [activeTab, setActiveTab] = useState<'import' | 'export' | 'servers'>('import')
    const [servers, setServers] = useState<FHIRServerConfig[]>([
        {
            name: 'Demo HAPI FHIR',
            baseUrl: 'https://hapi.fhir.org/baseR4',
            authenticationType: 'none',
            status: 'connected',
            lastSync: new Date().toISOString()
        }
    ])
    const [selectedServer, setSelectedServer] = useState<string>('Demo HAPI FHIR')

    // Import state
    const [importSource, setImportSource] = useState<'file' | 'server' | 'paste'>('file')
    const [importedResources, setImportedResources] = useState<ImportedResource[]>([])
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
    const [pastedJson, setPastedJson] = useState('')
    const [_importPreview, setImportPreview] = useState<any>(null)
    const [parseError, setParseError] = useState<string | null>(null)

    // Export state
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        includeObservations: true,
        includeEncounters: true,
        includeDevices: true,
        includeMedications: true,
        includeConditions: true,
        includeHistory: false
    })
    const [exportPatientSearch, setExportPatientSearch] = useState('')
    const [exportResults, setExportResults] = useState<ExportResult[]>([])
    const [isExporting, setIsExporting] = useState(false)

    // Server config state
    const [showAddServer, setShowAddServer] = useState(false)
    const [newServer, setNewServer] = useState<Partial<FHIRServerConfig>>({
        name: '',
        baseUrl: '',
        authenticationType: 'none'
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Handle file import
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const parsed = JSON.parse(content)
                setImportPreview(parsed)
                setParseError(null)

                // Extract resources from bundle
                if (parsed.resourceType === 'Bundle' && parsed.entry) {
                    const resources: ImportedResource[] = parsed.entry.map((entry: any, index: number) => ({
                        id: entry.resource?.id || `temp-${index}`,
                        resourceType: entry.resource?.resourceType || 'Unknown',
                        name: getResourceDisplayName(entry.resource),
                        status: 'pending' as const,
                        data: entry.resource
                    }))
                    setImportedResources(resources)
                } else if (parsed.resourceType) {
                    // Single resource
                    setImportedResources([{
                        id: parsed.id || 'temp-1',
                        resourceType: parsed.resourceType,
                        name: getResourceDisplayName(parsed),
                        status: 'pending',
                        data: parsed
                    }])
                }
            } catch (_err) {
                setParseError('Invalid JSON file. Please upload a valid FHIR Bundle or Resource.')
                setImportPreview(null)
                setImportedResources([])
            }
        }
        reader.readAsText(file)
    }, [])

    // Handle pasted JSON
    const handlePasteJson = useCallback(() => {
        if (!pastedJson.trim()) {
            setParseError('Please enter JSON content')
            return
        }

        try {
            const parsed = JSON.parse(pastedJson)
            setImportPreview(parsed)
            setParseError(null)

            if (parsed.resourceType === 'Bundle' && parsed.entry) {
                const resources: ImportedResource[] = parsed.entry.map((entry: any, index: number) => ({
                    id: entry.resource?.id || `temp-${index}`,
                    resourceType: entry.resource?.resourceType || 'Unknown',
                    name: getResourceDisplayName(entry.resource),
                    status: 'pending' as const,
                    data: entry.resource
                }))
                setImportedResources(resources)
            } else if (parsed.resourceType) {
                setImportedResources([{
                    id: parsed.id || 'temp-1',
                    resourceType: parsed.resourceType,
                    name: getResourceDisplayName(parsed),
                    status: 'pending',
                    data: parsed
                }])
            }
        } catch (_err) {
            setParseError('Invalid JSON. Please check the format.')
            setImportPreview(null)
            setImportedResources([])
        }
    }, [pastedJson])

    // Get display name for resource
    function getResourceDisplayName(resource: any): string {
        if (!resource) return 'Unknown'

        switch (resource.resourceType) {
            case 'Patient':
                const name = resource.name?.[0]
                if (name) {
                    return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() || 'Unnamed Patient'
                }
                return 'Patient ' + (resource.id || '')
            case 'Observation':
                return resource.code?.coding?.[0]?.display || resource.code?.text || 'Observation'
            case 'Encounter':
                return resource.type?.[0]?.text || 'Encounter'
            case 'Device':
                return resource.deviceName?.[0]?.name || 'Device'
            case 'Medication':
                return resource.code?.text || 'Medication'
            case 'Condition':
                return resource.code?.text || 'Condition'
            default:
                return resource.resourceType
        }
    }

    // Process import
    const processImport = useCallback(async () => {
        if (importedResources.length === 0) return

        setImportProgress({
            total: importedResources.length,
            processed: 0,
            imported: 0,
            skipped: 0,
            errors: 0
        })

        const results: ImportedResource[] = []

        for (let i = 0; i < importedResources.length; i++) {
            const resource = importedResources[i]

            setImportProgress(prev => prev ? {
                ...prev,
                processed: i,
                currentResource: resource.name || resource.resourceType
            } : null)

            // Simulate import delay
            await new Promise(resolve => setTimeout(resolve, 300))

            // In production, this would call FHIRComplianceService methods
            // For demo, we simulate successful import
            const imported = Math.random() > 0.1 // 90% success rate

            results.push({
                ...resource,
                status: imported ? 'imported' : 'error',
                errorMessage: imported ? undefined : 'Duplicate resource detected'
            })

            setImportProgress(prev => prev ? {
                ...prev,
                processed: i + 1,
                imported: prev.imported + (imported ? 1 : 0),
                errors: prev.errors + (imported ? 0 : 1)
            } : null)
        }

        setImportedResources(results)
        setImportProgress(prev => prev ? { ...prev, currentResource: undefined } : null)
        onImportComplete?.(results)
    }, [importedResources, onImportComplete])

    // Load demo data from server
    const loadFromServer = useCallback(async () => {
        setImportProgress({
            total: 0,
            processed: 0,
            imported: 0,
            skipped: 0,
            errors: 0,
            currentResource: 'Connecting to server...'
        })

        // Simulate server connection
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Generate demo bundle
        const bundle = generateDemoBundle()
        setImportPreview(bundle)

        const resources: ImportedResource[] = bundle.entry.map((entry: any, index: number) => ({
            id: entry.resource?.id || `temp-${index}`,
            resourceType: entry.resource?.resourceType || 'Unknown',
            name: getResourceDisplayName(entry.resource),
            status: 'pending' as const,
            data: entry.resource
        }))

        setImportedResources(resources)
        setImportProgress(null)
        setParseError(null)
    }, [])

    // Export patient data
    const exportPatient = useCallback(async (patientIdToExport: string) => {
        setIsExporting(true)

        // Simulate export process
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Generate demo bundle
        const bundle = generateDemoBundle()
        const jsonString = JSON.stringify(bundle, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const result: ExportResult = {
            patientId: patientIdToExport,
            patientName: 'John Smith',
            resourceCount: bundle.entry.length,
            timestamp: new Date().toISOString(),
            format: 'json',
            size: jsonString.length,
            downloadUrl: url
        }

        setExportResults(prev => [result, ...prev])
        setIsExporting(false)
        onExportComplete?.(result)

        // Auto-download
        const a = document.createElement('a')
        a.href = url
        a.download = `fhir-export-${patientIdToExport}-${Date.now()}.json`
        a.click()
    }, [onExportComplete])

    // Add server
    const addServer = useCallback(() => {
        if (!newServer.name || !newServer.baseUrl) return

        const server: FHIRServerConfig = {
            name: newServer.name,
            baseUrl: newServer.baseUrl,
            authenticationType: newServer.authenticationType || 'none',
            credentials: newServer.credentials,
            status: 'disconnected'
        }

        setServers(prev => [...prev, server])
        setNewServer({ name: '', baseUrl: '', authenticationType: 'none' })
        setShowAddServer(false)
    }, [newServer])

    // Test server connection
    const testServerConnection = useCallback(async (serverNameToTest: string) => {
        setServers(prev => prev.map(s =>
            s.name === serverNameToTest ? { ...s, status: 'testing' } : s
        ))

        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1500))

        const success = Math.random() > 0.2 // 80% success rate

        setServers(prev => prev.map(s =>
            s.name === serverNameToTest ? {
                ...s,
                status: success ? 'connected' : 'error',
                lastSync: success ? new Date().toISOString() : s.lastSync
            } : s
        ))
    }, [])

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🔄</span> FHIR Data Exchange
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0', fontSize: '14px' }}>
                        HL7 FHIR R4 Compatible
                    </p>
                </div>
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '8px 16px',
                    borderRadius: '20px'
                }}>
                    <span style={{ color: '#fff', fontSize: '13px' }}>
                        {servers.filter(s => s.status === 'connected').length} / {servers.length} Servers Connected
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid #333',
                backgroundColor: '#222'
            }}>
                {(['import', 'export', 'servers'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: '14px',
                            backgroundColor: 'transparent',
                            color: activeTab === tab ? '#3b82f6' : '#888',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: activeTab === tab ? 600 : 400,
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab === 'import' && '📥 '}
                        {tab === 'export' && '📤 '}
                        {tab === 'servers' && '🖥️ '}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
                {/* Import Tab */}
                {activeTab === 'import' && (
                    <div>
                        {/* Import Source Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                                Import Source
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(['file', 'server', 'paste'] as const).map(source => (
                                    <button
                                        key={source}
                                        onClick={() => setImportSource(source)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            backgroundColor: importSource === source ? '#3b82f6' : '#2a2a2a',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {source === 'file' && '📁 File Upload'}
                                        {source === 'server' && '🌐 FHIR Server'}
                                        {source === 'paste' && '📋 Paste JSON'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File Upload */}
                        {importSource === 'file' && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '2px dashed #444',
                                    borderRadius: '8px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: '#222',
                                    marginBottom: '20px'
                                }}
                            >
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
                                <p style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
                                    Click to upload FHIR Bundle
                                </p>
                                <p style={{ color: '#666', margin: '8px 0 0 0', fontSize: '13px' }}>
                                    Supports .json files (FHIR R4 format)
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}

                        {/* Server Selection */}
                        {importSource === 'server' && (
                            <div style={{ marginBottom: '20px' }}>
                                <select
                                    value={selectedServer}
                                    onChange={(e) => setSelectedServer(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#2a2a2a',
                                        color: '#fff',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        marginBottom: '12px'
                                    }}
                                >
                                    {servers.map(server => (
                                        <option key={server.name} value={server.name}>
                                            {server.name} ({server.status})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={loadFromServer}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    🔍 Fetch Resources from Server
                                </button>
                            </div>
                        )}

                        {/* Paste JSON */}
                        {importSource === 'paste' && (
                            <div style={{ marginBottom: '20px' }}>
                                <textarea
                                    value={pastedJson}
                                    onChange={(e) => setPastedJson(e.target.value)}
                                    placeholder='Paste FHIR JSON here...\n{\n  "resourceType": "Bundle",\n  "entry": [...]\n}'
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        padding: '12px',
                                        backgroundColor: '#2a2a2a',
                                        color: '#fff',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        marginBottom: '12px'
                                    }}
                                />
                                <button
                                    onClick={handlePasteJson}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✓ Parse JSON
                                </button>
                            </div>
                        )}

                        {/* Parse Error */}
                        {parseError && (
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#dc2626',
                                borderRadius: '6px',
                                marginBottom: '20px'
                            }}>
                                <p style={{ color: '#fff', margin: 0, fontSize: '13px' }}>
                                    ⚠️ {parseError}
                                </p>
                            </div>
                        )}

                        {/* Import Progress */}
                        {importProgress && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#222',
                                borderRadius: '6px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#888', fontSize: '13px' }}>
                                        {importProgress.currentResource || 'Processing...'}
                                    </span>
                                    <span style={{ color: '#fff', fontSize: '13px' }}>
                                        {importProgress.processed} / {importProgress.total}
                                    </span>
                                </div>
                                <div style={{
                                    height: '4px',
                                    backgroundColor: '#333',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}%`,
                                        height: '100%',
                                        backgroundColor: '#3b82f6',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                    <span style={{ color: '#10b981', fontSize: '12px' }}>
                                        ✓ {importProgress.imported} imported
                                    </span>
                                    <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                                        ⊖ {importProgress.skipped} skipped
                                    </span>
                                    <span style={{ color: '#ef4444', fontSize: '12px' }}>
                                        ✗ {importProgress.errors} errors
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Resources Preview */}
                        {importedResources.length > 0 && (
                            <div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px'
                                }}>
                                    <h4 style={{ color: '#fff', margin: 0 }}>
                                        Resources to Import ({importedResources.length})
                                    </h4>
                                    <button
                                        onClick={processImport}
                                        disabled={importProgress !== null}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: importProgress ? '#444' : '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: importProgress ? 'not-allowed' : 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {importProgress ? 'Importing...' : '✓ Import All'}
                                    </button>
                                </div>

                                <div style={{
                                    backgroundColor: '#222',
                                    borderRadius: '6px',
                                    overflow: 'hidden'
                                }}>
                                    {importedResources.map((resource, index) => (
                                        <div
                                            key={resource.id}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: index < importedResources.length - 1 ? '1px solid #333' : 'none',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '20px' }}>
                                                    {resource.resourceType === 'Patient' && '👤'}
                                                    {resource.resourceType === 'Observation' && '📊'}
                                                    {resource.resourceType === 'Encounter' && '🏥'}
                                                    {resource.resourceType === 'Device' && '📱'}
                                                    {resource.resourceType === 'Medication' && '💊'}
                                                    {resource.resourceType === 'Condition' && '🩺'}
                                                </span>
                                                <div>
                                                    <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>
                                                        {resource.name}
                                                    </p>
                                                    <p style={{ color: '#666', margin: '2px 0 0 0', fontSize: '11px' }}>
                                                        {resource.resourceType} • ID: {resource.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                backgroundColor:
                                                    resource.status === 'imported' ? 'rgba(16, 185, 129, 0.2)' :
                                                        resource.status === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                                                            resource.status === 'skipped' ? 'rgba(245, 158, 11, 0.2)' :
                                                                'rgba(59, 130, 246, 0.2)',
                                                color:
                                                    resource.status === 'imported' ? '#10b981' :
                                                        resource.status === 'error' ? '#ef4444' :
                                                            resource.status === 'skipped' ? '#f59e0b' :
                                                                '#3b82f6'
                                            }}>
                                                {resource.status === 'imported' && '✓ '}
                                                {resource.status === 'error' && '✗ '}
                                                {resource.status === 'skipped' && '⊖ '}
                                                {resource.status === 'pending' && '○ '}
                                                {resource.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Export Tab */}
                {activeTab === 'export' && (
                    <div>
                        {/* Patient Search */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                                Select Patient to Export
                            </label>
                            <input
                                type="text"
                                value={exportPatientSearch}
                                onChange={(e) => setExportPatientSearch(e.target.value)}
                                placeholder="Search by name, MRN, or date of birth..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {/* Export Options */}
                        <div style={{
                            backgroundColor: '#222',
                            borderRadius: '6px',
                            padding: '16px',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px' }}>
                                Export Options
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {[
                                    { key: 'includeObservations', label: 'Observations (Vitals, Labs)' },
                                    { key: 'includeEncounters', label: 'Encounters (Visits)' },
                                    { key: 'includeDevices', label: 'Devices' },
                                    { key: 'includeMedications', label: 'Medications' },
                                    { key: 'includeConditions', label: 'Conditions (Diagnoses)' },
                                    { key: 'includeHistory', label: 'Include Historical Versions' }
                                ].map(option => (
                                    <label
                                        key={option.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={exportOptions[option.key as keyof ExportOptions] as boolean}
                                            onChange={(e) => setExportOptions(prev => ({
                                                ...prev,
                                                [option.key]: e.target.checked
                                            }))}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Demo Patient Card */}
                        <div style={{
                            backgroundColor: '#222',
                            borderRadius: '6px',
                            padding: '16px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3b82f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '20px'
                                    }}>
                                        👤
                                    </div>
                                    <div>
                                        <p style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: 500 }}>
                                            John Smith
                                        </p>
                                        <p style={{ color: '#666', margin: '2px 0 0 0', fontSize: '12px' }}>
                                            MRN: 12345678 • DOB: 04/12/1985 • Male
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => exportPatient('patient-demo')}
                                    disabled={isExporting}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: isExporting ? '#444' : '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: isExporting ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isExporting ? (
                                        <>⏳ Exporting...</>
                                    ) : (
                                        <>📤 Export</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Export History */}
                        {exportResults.length > 0 && (
                            <div>
                                <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>
                                    Recent Exports
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {exportResults.map((result, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                backgroundColor: '#222',
                                                borderRadius: '6px',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>
                                                    {result.patientName}
                                                </p>
                                                <p style={{ color: '#666', margin: '2px 0 0 0', fontSize: '11px' }}>
                                                    {result.resourceCount} resources • {(result.size / 1024).toFixed(1)} KB •
                                                    {new Date(result.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            {result.downloadUrl && (
                                                <a
                                                    href={result.downloadUrl}
                                                    download={`fhir-export-${result.patientId}.json`}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#2a2a2a',
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    ⬇️ Download
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Servers Tab */}
                {activeTab === 'servers' && (
                    <div>
                        {/* Server List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {servers.map(server => (
                                <div
                                    key={server.name}
                                    style={{
                                        backgroundColor: '#222',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        border: selectedServer === server.name ? '1px solid #3b82f6' : '1px solid #333'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        server.status === 'connected' ? '#10b981' :
                                                            server.status === 'testing' ? '#f59e0b' :
                                                                server.status === 'error' ? '#ef4444' : '#666'
                                                }} />
                                                <h4 style={{ color: '#fff', margin: 0 }}>{server.name}</h4>
                                            </div>
                                            <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '12px' }}>
                                                {server.baseUrl}
                                            </p>
                                            {server.lastSync && (
                                                <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '11px' }}>
                                                    Last sync: {new Date(server.lastSync).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => testServerConnection(server.name)}
                                                disabled={server.status === 'testing'}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#2a2a2a',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: server.status === 'testing' ? 'not-allowed' : 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {server.status === 'testing' ? '⏳ Testing...' : '🔍 Test'}
                                            </button>
                                            <button
                                                onClick={() => setSelectedServer(server.name)}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: selectedServer === server.name ? '#3b82f6' : '#2a2a2a',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {selectedServer === server.name ? '✓ Selected' : 'Select'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Server Button */}
                        {!showAddServer ? (
                            <button
                                onClick={() => setShowAddServer(true)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#3b82f6',
                                    border: '1px dashed #3b82f6',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                + Add FHIR Server
                            </button>
                        ) : (
                            <div style={{
                                backgroundColor: '#222',
                                borderRadius: '6px',
                                padding: '16px'
                            }}>
                                <h4 style={{ color: '#fff', margin: '0 0 16px 0' }}>Add FHIR Server</h4>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                        Server Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newServer.name || ''}
                                        onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="My Hospital FHIR Server"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2a2a2a',
                                            color: '#fff',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                        Base URL
                                    </label>
                                    <input
                                        type="text"
                                        value={newServer.baseUrl || ''}
                                        onChange={(e) => setNewServer(prev => ({ ...prev, baseUrl: e.target.value }))}
                                        placeholder="https://fhir.example.com/baseR4"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2a2a2a',
                                            color: '#fff',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                        Authentication
                                    </label>
                                    <select
                                        value={newServer.authenticationType || 'none'}
                                        onChange={(e) => setNewServer(prev => ({
                                            ...prev,
                                            authenticationType: e.target.value as FHIRServerConfig['authenticationType']
                                        }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2a2a2a',
                                            color: '#fff',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="none">None (Public Server)</option>
                                        <option value="basic">Basic Authentication</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="oauth2">OAuth 2.0</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowAddServer(false)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: '#2a2a2a',
                                            color: '#888',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addServer}
                                        disabled={!newServer.name || !newServer.baseUrl}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: newServer.name && newServer.baseUrl ? '#3b82f6' : '#444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: newServer.name && newServer.baseUrl ? 'pointer' : 'not-allowed',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Add Server
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Server Info */}
                        <div style={{
                            marginTop: '20px',
                            padding: '12px 16px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '6px',
                            border: '1px solid #333'
                        }}>
                            <p style={{ color: '#888', margin: 0, fontSize: '12px' }}>
                                💡 <strong>Tip:</strong> Public test servers like HAPI FHIR (https://hapi.fhir.org/baseR4)
                                can be used for development and testing. For production, configure your hospital's FHIR server.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
