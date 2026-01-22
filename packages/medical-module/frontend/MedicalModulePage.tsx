/**
 * Medical Module Page - Tabbed Navigation Container
 * 
 * Provides tabbed access to all Medical module components:
 * - MedicalViewport: 3D anatomical visualization
 * - PatientIntakeForms: Patient registration and intake
 * - NurseStationDashboard: Multi-room nurse station
 * - FHIRImportExport: FHIR R4 data management
 * - HealthKitVitalsChart: Real-time vitals monitoring
 * - EveBedsideAssistant: Bedside AI assistant with fall detection
 */

import React, { useState, Suspense } from 'react';
import {
    Activity,
    FileText,
    Users,
    Settings,
    Heart,
    Zap,
    Loader,
    Shield
} from 'lucide-react';

// Import components directly (no lazy loading for simplicity in marketplace modules)
import { MedicalViewport } from './MedicalViewport';
import PatientIntakeForms from './PatientIntakeForms';
import NurseStationDashboard from './NurseStationDashboard';
import FHIRImportExport from './FHIRImportExport';
import HealthKitVitalsChart from './HealthKitVitalsChart';
import EveBedsideAssistant from './EveBedsideAssistant';
import { AdminPortal } from './AdminPortalBridge';

interface TabConfig {
    id: string;
    label: string;
    icon: React.ReactNode;
    component: React.FC;
    description: string;
}

const TABS: TabConfig[] = [
    {
        id: 'viewport',
        label: 'Medical Viewport',
        icon: <Activity className="w-4 h-4" />,
        component: MedicalViewport,
        description: 'Advanced anatomical visualization'
    },
    {
        id: 'intake',
        label: 'Patient Intake',
        icon: <FileText className="w-4 h-4" />,
        component: PatientIntakeForms,
        description: 'Patient registration forms'
    },
    {
        id: 'nurse-station',
        label: 'Nurse Station',
        icon: <Users className="w-4 h-4" />,
        component: NurseStationDashboard,
        description: 'Multi-room monitoring dashboard'
    },
    {
        id: 'vitals',
        label: 'Vitals Chart',
        icon: <Heart className="w-4 h-4" />,
        component: HealthKitVitalsChart,
        description: 'Real-time vitals monitoring'
    },
    {
        id: 'fhir',
        label: 'FHIR Data',
        icon: <Settings className="w-4 h-4" />,
        component: FHIRImportExport,
        description: 'FHIR R4 import/export'
    },
    {
        id: 'bedside',
        label: 'Bedside Assistant',
        icon: <Zap className="w-4 h-4" />,
        component: EveBedsideAssistant,
        description: 'AI assistant with fall detection'
    },
    {
        id: 'admin',
        label: 'Admin Portal',
        icon: <Shield className="w-4 h-4" />,
        component: AdminPortal,
        description: 'Medical system administration'
    }
];

const LoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm">Loading component...</span>
        </div>
    </div>
);

export const MedicalModulePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('viewport');

    const activeTabConfig = TABS.find(t => t.id === activeTab);

    if (!activeTabConfig) {
        return <div className="text-red-400">Tab not found</div>;
    }

    const ActiveComponent = activeTabConfig.component;

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
            {/* Tab Navigation Bar */}
            <div className="flex-shrink-0 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }
              `}
                            title={tab.description}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Tab Description */}
            <div className="flex-shrink-0 px-4 py-2 text-xs text-slate-500 border-b border-slate-800/50">
                <span className="text-cyan-400/80">{activeTabConfig.label}</span>
                <span className="mx-2">—</span>
                <span>{activeTabConfig.description}</span>
            </div>

            {/* Tab Content - scrollable */}
            <div className="flex-1 overflow-auto">
                <Suspense fallback={<LoadingFallback />}>
                    <ActiveComponent />
                </Suspense>
            </div>
        </div>
    );
};

export default MedicalModulePage;
