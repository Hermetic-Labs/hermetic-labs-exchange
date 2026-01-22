import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Try to import from host app, but provide fallback for standalone operation
// This allows the module to work both when installed in EVE OS and standalone (e.g., RPi deployment)
let useAppData: () => any;
try {
  // When installed in EVE OS, this import will resolve via the main app's tsconfig
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hostContext = require('@/components/devportal/context/AppDataContext');
  useAppData = hostContext.useAppData;
} catch {
  // Standalone mode - provide a stub that returns empty data
  useAppData = () => ({
    cortex: null,
    loadingCortex: false,
    refreshCortex: () => Promise.resolve()
  });
}

// Inline utility since original module was missing
const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Performance optimization for hospital deployment
const PERFORMANCE_CONFIG = {
  vitalsUpdateInterval: 5000, // Update vitals every 5 seconds (reduced from 3)
  cortexRefreshInterval: 3000, // Refresh cortex every 3 seconds (reduced from 2)
  maxConversationHistory: 20, // Limit conversation history for memory
  debounceDelay: 300, // Debounce user input
  enableAnimations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  fallDetectionInterval: 1000, // Check for falls every second
  fallAlertCooldown: 30000, // 30 seconds between fall alerts
  movementHistoryLength: 30 // Keep 30 seconds of movement data
}

// Healthcare Cards (Modular AI capabilities) - Memoized for performance
const HEALTHCARE_CARDS: HealthcareCard[] = [
  {
    id: 'card-vitals-monitor',
    title: 'Vitals Monitor',
    type: 'Monitoring',
    preview: 'Real-time patient vitals analysis',
    description: 'Continuous monitoring of heart rate, blood pressure, oxygen saturation, and temperature trends.',
    schema: {
      input: 'vitals_data',
      output: 'trend_analysis',
      model: 'local-ai',
      temperature: 0.3
    }
  },
  {
    id: 'card-emergency-triage',
    title: 'Emergency Triage',
    type: 'Assessment',
    preview: 'Priority-based patient assessment',
    description: 'AI-powered triage system using vital signs, symptoms, and medical history.',
    schema: {
      input: 'patient_data',
      output: 'triage_level',
      model: 'hybrid-ai',
      temperature: 0.2
    }
  },
  {
    id: 'card-drug-interaction',
    title: 'Drug Interaction Checker',
    type: 'Safety',
    preview: 'Medication safety analysis',
    description: 'Comprehensive drug interaction screening with contraindications and dosage recommendations.',
    schema: {
      input: 'medication_list',
      output: 'interaction_analysis',
      model: 'cloud-ai',
      temperature: 0.1
    }
  },
  {
    id: 'card-protocol-assistant',
    title: 'Protocol Assistant',
    type: 'Guidance',
    preview: 'Evidence-based clinical protocols',
    description: 'Access to current medical protocols, guidelines, and treatment recommendations.',
    schema: {
      input: 'clinical_question',
      output: 'protocol_guidance',
      model: 'cloud-ai',
      temperature: 0.3
    }
  },
  {
    id: 'card-emergency-response',
    title: 'Emergency Response',
    type: 'Critical',
    preview: 'Life-saving emergency protocols',
    description: 'Immediate response protocols for cardiac arrest, stroke, respiratory failure, and other critical events.',
    schema: {
      input: 'emergency_type',
      output: 'response_protocol',
      model: 'local-ai',
      temperature: 0.0
    }
  },
  {
    id: 'card-fall-detection',
    title: 'Fall Detection',
    type: 'Safety',
    preview: 'Visual movement & fall tracking',
    description: 'AI-powered visual tracking for patient movement, posture analysis, and fall detection with instant nurse station alerts.',
    schema: {
      input: 'visual_stream',
      output: 'fall_risk_analysis',
      model: 'local-ai',
      temperature: 0.1
    }
  },
  {
    id: 'card-mobility-assessment',
    title: 'Mobility Assessment',
    type: 'Monitoring',
    preview: 'Patient mobility tracking',
    description: 'Continuous assessment of patient mobility, bed exit detection, and movement pattern analysis.',
    schema: {
      input: 'movement_data',
      output: 'mobility_score',
      model: 'local-ai',
      temperature: 0.2
    }
  }
]

// Medical Personas (Context switching) - Memoized for performance
const MEDICAL_PERSONAS: MedicalPersona[] = [
  {
    id: 'persona-attending-physician',
    name: 'Attending Physician',
    role: 'Senior Medical Decision Maker',
    description: 'Experienced physician with full decision-making authority.',
    tone: 'Professional, authoritative, precise',
    systemPrompt: 'You are an experienced attending physician. Provide definitive medical guidance based on your extensive clinical experience and current evidence-based medicine.',
    icon: '👨‍⚕️'
  },
  {
    id: 'persona-registered-nurse',
    name: 'Registered Nurse',
    role: 'Patient Care Coordinator',
    description: 'Experienced registered nurse specializing in patient care coordination.',
    tone: 'Compassionate, detail-oriented, protective',
    systemPrompt: 'You are an experienced registered nurse. Focus on patient safety, care coordination, and vigilant monitoring with a compassionate bedside manner.',
    icon: '👩‍⚕️'
  },
  {
    id: 'persona-emergency-nurse',
    name: 'Emergency Nurse',
    role: 'Critical Care Specialist',
    description: 'Emergency department nurse specializing in rapid assessment and stabilization.',
    tone: 'Calm under pressure, decisive, systematic',
    systemPrompt: 'You are an emergency department nurse. Excel at rapid patient assessment, stabilization, and critical decision-making under time pressure.',
    icon: '🚨'
  },
  {
    id: 'persona-nurse-aid',
    name: 'Certified Nurse Assistant',
    role: 'Patient Support Specialist',
    description: 'Certified nursing assistant providing direct patient support and monitoring.',
    tone: 'Supportive, vigilant, caring',
    systemPrompt: 'You are a certified nursing assistant. Provide essential patient monitoring, comfort care, and early warning detection with compassionate support.',
    icon: '🤝'
  }
]

// Sample Patient for Demo
const DEMO_PATIENT = {
  id: 'patient-alpha-001',
  name: 'John Mitchell',
  age: 67,
  gender: 'male',
  diagnosis: 'Acute Myocardial Infarction (STEMI)',
  admissionTime: '2024-01-15T14:30:00Z',
  room: 'ICU-203'
}

const STATUS_COLORS: Record<string, string> = {
  'local': '#10b981',      // Green
  'cloud': '#3b82f6',      // Blue  
  'hybrid': '#f59e0b',     // Amber
  'offline': '#6b7280'     // Gray
}

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  admissionTime: string;
  room: string;
}

interface VitalsData {
  heartRate: number;
  bloodPressure: string;
  oxygenSaturation: number;
  temperature: number;
}

interface HealthcareCard {
  id: string;
  title: string;
  type: string;
  preview: string;
  description: string;
  schema: {
    input: string;
    output: string;
    model: string;
    temperature: number;
  };
}

interface MedicalPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  tone: string;
  systemPrompt: string;
  icon: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  timestamp: string;
}

// Fall Detection Types
interface MovementFrame {
  timestamp: number;
  posture: 'standing' | 'sitting' | 'lying' | 'transitioning' | 'fallen';
  confidence: number;
  velocity: { x: number; y: number; z: number };
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface FallEvent {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'slip' | 'trip' | 'collapse' | 'bed_exit' | 'chair_exit';
  location: string;
  patientId: string;
  acknowledged: boolean;
  notifiedNurseStation: boolean;
  responseTime?: number;
}

interface FallRiskAssessment {
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'very_high';
  factors: string[];
  recommendations: string[];
  lastUpdated: string;
}

interface VisualTrackingState {
  isActive: boolean;
  cameraConnected: boolean;
  currentPosture: MovementFrame['posture'];
  movementHistory: MovementFrame[];
  fallEvents: FallEvent[];
  riskAssessment: FallRiskAssessment;
  bedExitAlertEnabled: boolean;
  lastAlertTime: number | null;
}

// Video Chat Types
interface VideoCallState {
  isActive: boolean;
  isIncoming: boolean;
  isConnecting: boolean;
  remoteStationId: string | null;
  remoteStationName: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callStartTime: number | null;
  promptMessage: string | null;
}

interface VideoCallRequest {
  id: string;
  fromStationId: string;
  fromStationName: string;
  toRoomId: string;
  promptMessage?: string;
  timestamp: string;
}

// Add window type augmentation
declare global {
  interface Window {
    cloudAI: any;
    localAI: any;
  }
}

export default function EveBedsideAssistant() {
  // Performance-optimized state management for hospital deployment
  const [selectedFlow, setSelectedFlow] = useState<string>('emergency-triage')
  const [activeCards, setActiveCards] = useState<string[]>(['card-vitals-monitor', 'card-emergency-triage'])
  const [currentPersona, setCurrentPersona] = useState<string>('persona-attending-physician')
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [patientData] = useState<PatientData>(DEMO_PATIENT)
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [inputText, setInputText] = useState<string>('')
  const [aiProvider, setAiProvider] = useState<string>('hybrid')
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false)
  const [vitals, setVitals] = useState<VitalsData>({
    heartRate: 95,
    bloodPressure: '150/90',
    oxygenSaturation: 96,
    temperature: 37.2
  })

  // Fall Detection State
  const [visualTracking, setVisualTracking] = useState<VisualTrackingState>({
    isActive: true,
    cameraConnected: true,
    currentPosture: 'lying',
    movementHistory: [],
    fallEvents: [],
    riskAssessment: {
      score: 65,
      level: 'moderate',
      factors: ['Age > 65', 'Recent surgery', 'Medication side effects'],
      recommendations: ['Bed rails up', 'Call button within reach', 'Non-slip footwear'],
      lastUpdated: new Date().toISOString()
    },
    bedExitAlertEnabled: true,
    lastAlertTime: null
  })
  const [showFallAlert, setShowFallAlert] = useState<FallEvent | null>(null)

  // Video Chat State
  const [videoCall, setVideoCall] = useState<VideoCallState>({
    isActive: false,
    isIncoming: false,
    isConnecting: false,
    remoteStationId: null,
    remoteStationName: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    callStartTime: null,
    promptMessage: null
  })
  const [incomingCallRequest, setIncomingCallRequest] = useState<VideoCallRequest | null>(null)

  const { cortex, loadingCortex: _loadingCortex, refreshCortex: _refreshCortex } = useAppData() as any // Temporary cast until context is typed
  const conversationRef = useRef<HTMLDivElement>(null)
  const inputTimeoutRef = useRef<NodeJS.Timeout>(null)
  const vitalsIntervalRef = useRef<NodeJS.Timeout>(null)
  const cortexIntervalRef = useRef<NodeJS.Timeout>(null)
  const fallDetectionIntervalRef = useRef<NodeJS.Timeout>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const videoCallWsRef = useRef<WebSocket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Optimized addMessage with memory management - MUST be defined before any hooks that use it
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string, provider: string = 'local') => {
    const message: ChatMessage = {
      id: generateId('msg'),
      role,
      content,
      provider,
      timestamp: new Date().toISOString()
    }

    setConversationHistory(prev => {
      // Enforce conversation history limit for hospital deployment
      const newHistory = [...prev, message]
      if (newHistory.length > PERFORMANCE_CONFIG.maxConversationHistory) {
        return newHistory.slice(-PERFORMANCE_CONFIG.maxConversationHistory)
      }
      return newHistory
    })

    // Optimized auto-scroll (only if user is at bottom)
    if (conversationRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = conversationRef.current
      const isAtBottom = scrollTop >= scrollHeight - clientHeight - 10

      if (isAtBottom) {
        setTimeout(() => {
          if (conversationRef.current) {
            conversationRef.current.scrollTop = conversationRef.current.scrollHeight
          }
        }, 100)
      }
    }
  }, [])

  // Performance-optimized vitals simulation (reduced frequency for hospital hardware)
  useEffect(() => {
    vitalsIntervalRef.current = setInterval(() => {
      setVitals(prev => ({
        heartRate: Math.max(60, Math.min(140, prev.heartRate + (Math.random() - 0.5) * 8)), // Reduced volatility
        bloodPressure: `${Math.floor(Math.max(110, Math.min(180, 150 + (Math.random() - 0.5) * 16)))}/${Math.floor(Math.max(70, Math.min(110, 90 + (Math.random() - 0.5) * 12)))}`,
        oxygenSaturation: Math.max(88, Math.min(100, prev.oxygenSaturation + (Math.random() - 0.5) * 3)), // Less fluctuation
        temperature: Math.max(35.5, Math.min(39.5, prev.temperature + (Math.random() - 0.5) * 0.6)) // Reduced changes
      }))
    }, PERFORMANCE_CONFIG.vitalsUpdateInterval)

    return () => {
      if (vitalsIntervalRef.current) {
        clearInterval(vitalsIntervalRef.current)
      }
    }
  }, [])

  // Fall Detection & Visual Tracking Simulation
  useEffect(() => {
    if (!visualTracking.isActive) return

    const postures: MovementFrame['posture'][] = ['lying', 'sitting', 'standing', 'transitioning']

    fallDetectionIntervalRef.current = setInterval(() => {
      // Simulate movement frame from camera/sensor
      const currentTime = Date.now()
      const randomPosture = postures[Math.floor(Math.random() * postures.length)]

      // Simulate occasional position change (10% chance)
      const shouldChangePosition = Math.random() < 0.1
      const newPosture = shouldChangePosition ? randomPosture : visualTracking.currentPosture

      // Simulate rare fall event (0.5% chance when transitioning)
      const isFallRisk = newPosture === 'transitioning' && Math.random() < 0.005

      const newFrame: MovementFrame = {
        timestamp: currentTime,
        posture: isFallRisk ? 'fallen' : newPosture,
        confidence: 0.85 + Math.random() * 0.15,
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: isFallRisk ? -5 - Math.random() * 3 : (Math.random() - 0.5)
        }
      }

      setVisualTracking(prev => {
        // Maintain movement history with fixed length
        const newHistory = [...prev.movementHistory, newFrame]
          .slice(-PERFORMANCE_CONFIG.movementHistoryLength)

        // Detect bed exit (transition from lying to standing/sitting)
        const bedExitDetected = prev.bedExitAlertEnabled &&
          prev.currentPosture === 'lying' &&
          (newPosture === 'sitting' || newPosture === 'standing')

        // Handle fall or bed exit detection
        if (isFallRisk || bedExitDetected) {
          const canAlert = !prev.lastAlertTime ||
            (currentTime - prev.lastAlertTime) > PERFORMANCE_CONFIG.fallAlertCooldown

          if (canAlert) {
            const fallEvent: FallEvent = {
              id: generateId('fall'),
              timestamp: new Date().toISOString(),
              severity: isFallRisk ? 'critical' : 'medium',
              type: isFallRisk ? 'collapse' : 'bed_exit',
              location: patientData.room,
              patientId: patientData.id,
              acknowledged: false,
              notifiedNurseStation: false
            }

            // Trigger alert
            setShowFallAlert(fallEvent)

            // Notify nurse station via WebSocket (if available)
            notifyNurseStation(fallEvent)

            return {
              ...prev,
              currentPosture: newFrame.posture,
              movementHistory: newHistory,
              fallEvents: [...prev.fallEvents, fallEvent],
              lastAlertTime: currentTime
            }
          }
        }

        return {
          ...prev,
          currentPosture: newPosture,
          movementHistory: newHistory
        }
      })
    }, PERFORMANCE_CONFIG.fallDetectionInterval)

    return () => {
      if (fallDetectionIntervalRef.current) {
        clearInterval(fallDetectionIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualTracking.isActive, visualTracking.bedExitAlertEnabled, patientData])

  // Notify nurse station of fall/alert
  const notifyNurseStation = useCallback((event: FallEvent) => {
    // Send to nurse station via WebSocket
    const wsUrl = `ws://${window.location.hostname}:8001/marketplace/modules/medical-module/medical/ws/nurse-station`

    try {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'FALL_ALERT',
          event,
          patient: patientData,
          vitals,
          timestamp: new Date().toISOString()
        }))

        // Update event as notified
        setVisualTracking(prev => ({
          ...prev,
          fallEvents: prev.fallEvents.map(e =>
            e.id === event.id ? { ...e, notifiedNurseStation: true } : e
          )
        }))

        // Add system message
        addMessage('system',
          `🚨 ${event.type === 'bed_exit' ? 'BED EXIT' : 'FALL'} DETECTED - Nurse station notified`
        )

        ws.close()
      }
      ws.onerror = () => {
        // Fallback: try HTTP endpoint
        fetch('/api/medical/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'FALL_ALERT',
            event,
            patient: patientData,
            vitals
          })
        }).catch(console.error)

        addMessage('system',
          `🚨 ${event.type === 'bed_exit' ? 'BED EXIT' : 'FALL'} DETECTED - Alert sent via backup channel`
        )
      }
    } catch (error) {
      console.error('Failed to notify nurse station:', error)
      addMessage('system', '⚠️ Alert system error - Please check manually')
    }
  }, [patientData, vitals, addMessage])

  // Acknowledge fall alert
  const acknowledgeFallAlert = useCallback((eventId: string) => {
    setVisualTracking(prev => ({
      ...prev,
      fallEvents: prev.fallEvents.map(e =>
        e.id === eventId ? { ...e, acknowledged: true, responseTime: Date.now() - new Date(e.timestamp).getTime() } : e
      )
    }))
    setShowFallAlert(null)
    addMessage('system', '✅ Fall alert acknowledged - Response logged')
  }, [addMessage])

  // Toggle bed exit alert
  const toggleBedExitAlert = useCallback(() => {
    setVisualTracking(prev => {
      const newState = !prev.bedExitAlertEnabled
      addMessage('system', `Bed exit alert ${newState ? 'ENABLED' : 'DISABLED'}`)
      return { ...prev, bedExitAlertEnabled: newState }
    })
  }, [addMessage])

  // Video Call WebSocket Connection
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8001/marketplace/modules/medical-module/medical/ws/video/${patientData.room}`

    const connectVideoWs = () => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('Video call WebSocket connected')
          // Register this room as available for calls
          ws.send(JSON.stringify({
            type: 'REGISTER_ROOM',
            roomId: patientData.room,
            patientId: patientData.id,
            patientName: patientData.name
          }))
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'INCOMING_CALL':
              // Nurse station is calling
              setIncomingCallRequest({
                id: data.callId,
                fromStationId: data.fromStationId,
                fromStationName: data.fromStationName,
                toRoomId: patientData.room,
                promptMessage: data.promptMessage,
                timestamp: new Date().toISOString()
              })
              addMessage('system', `📞 Incoming call from ${data.fromStationName}${data.promptMessage ? `: "${data.promptMessage}"` : ''}`)
              break

            case 'CALL_ACCEPTED':
              // Remote accepted our call
              handleCallAccepted(data.answer)
              break

            case 'ICE_CANDIDATE':
              // ICE candidate from remote
              if (peerConnectionRef.current) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
              }
              break

            case 'CALL_ENDED':
              endVideoCall()
              addMessage('system', '📞 Call ended by nurse station')
              break

            case 'PROMPT_MESSAGE':
              // Nurse sent a prompt/message during call
              setVideoCall(prev => ({ ...prev, promptMessage: data.message }))
              addMessage('system', `💬 Nurse: ${data.message}`)
              break
          }
        }

        ws.onclose = () => {
          console.log('Video call WebSocket disconnected, reconnecting...')
          setTimeout(connectVideoWs, 5000)
        }

        ws.onerror = (error) => {
          console.error('Video call WebSocket error:', error)
        }

        videoCallWsRef.current = ws
      } catch (error) {
        console.error('Failed to connect video WebSocket:', error)
      }
    }

    connectVideoWs()

    return () => {
      if (videoCallWsRef.current) {
        videoCallWsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData.room])

  // End video call - defined first as it's used by other callbacks
  const endVideoCall = useCallback(() => {
    // Stop local stream
    if (videoCall.localStream) {
      videoCall.localStream.getTracks().forEach(track => track.stop())
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Notify remote
    if (videoCallWsRef.current && videoCall.isActive) {
      videoCallWsRef.current.send(JSON.stringify({
        type: 'END_CALL',
        roomId: patientData.room
      }))
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setVideoCall({
      isActive: false,
      isIncoming: false,
      isConnecting: false,
      remoteStationId: null,
      remoteStationName: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      callStartTime: null,
      promptMessage: null
    })
  }, [videoCall.localStream, videoCall.isActive, patientData.room])

  // Reject incoming call - defined before acceptIncomingCall which uses it
  const rejectIncomingCall = useCallback(() => {
    if (incomingCallRequest && videoCallWsRef.current) {
      videoCallWsRef.current.send(JSON.stringify({
        type: 'REJECT_CALL',
        callId: incomingCallRequest.id,
        roomId: patientData.room
      }))
    }
    setIncomingCallRequest(null)
    addMessage('system', '📞 Call declined')
  }, [incomingCallRequest, patientData.room, addMessage])

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(async () => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const pc = new RTCPeerConnection(config)

    pc.onicecandidate = (event) => {
      if (event.candidate && videoCallWsRef.current) {
        videoCallWsRef.current.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          candidate: event.candidate,
          roomId: patientData.room
        }))
      }
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setVideoCall(prev => ({ ...prev, remoteStream: event.streams[0] }))
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endVideoCall()
      }
    }

    peerConnectionRef.current = pc
    return pc
  }, [patientData.room, endVideoCall])

  // Accept incoming call
  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCallRequest) return

    setVideoCall(prev => ({
      ...prev,
      isActive: true,
      isIncoming: true,
      isConnecting: true,
      remoteStationId: incomingCallRequest.fromStationId,
      remoteStationName: incomingCallRequest.fromStationName,
      promptMessage: incomingCallRequest.promptMessage || null
    }))

    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      setVideoCall(prev => ({ ...prev, localStream: stream }))

      // Initialize peer connection
      const pc = await initializePeerConnection()

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Create answer (the nurse station sent the offer)
      // This will be handled when we receive the offer
      if (videoCallWsRef.current) {
        videoCallWsRef.current.send(JSON.stringify({
          type: 'ACCEPT_CALL',
          callId: incomingCallRequest.id,
          roomId: patientData.room
        }))
      }

      setVideoCall(prev => ({
        ...prev,
        isConnecting: false,
        callStartTime: Date.now()
      }))

      setIncomingCallRequest(null)
      addMessage('system', `📞 Call connected with ${incomingCallRequest.fromStationName}`)

    } catch (error) {
      console.error('Failed to accept call:', error)
      addMessage('system', '⚠️ Failed to start video - check camera permissions')
      rejectIncomingCall()
    }
  }, [incomingCallRequest, initializePeerConnection, patientData.room, addMessage, rejectIncomingCall])

  // Handle call accepted (when we made the call)
  const handleCallAccepted = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      setVideoCall(prev => ({
        ...prev,
        isConnecting: false,
        callStartTime: Date.now()
      }))
    }
  }, [])

  // Call nurse station (patient/bedside initiated)
  const callNurseStation = useCallback(async (promptMessage?: string) => {
    setVideoCall(prev => ({
      ...prev,
      isActive: true,
      isConnecting: true,
      remoteStationName: 'Nurse Station'
    }))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      setVideoCall(prev => ({ ...prev, localStream: stream }))

      const pc = await initializePeerConnection()

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (videoCallWsRef.current) {
        videoCallWsRef.current.send(JSON.stringify({
          type: 'CALL_NURSE_STATION',
          roomId: patientData.room,
          patientId: patientData.id,
          patientName: patientData.name,
          offer: offer,
          promptMessage: promptMessage
        }))
      }

      addMessage('system', `📞 Calling nurse station...${promptMessage ? ` Message: "${promptMessage}"` : ''}`)

    } catch (error) {
      console.error('Failed to start call:', error)
      addMessage('system', '⚠️ Failed to start video call - check camera permissions')
      endVideoCall()
    }
  }, [initializePeerConnection, patientData, addMessage, endVideoCall])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoCall.localStream) {
      const audioTrack = videoCall.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setVideoCall(prev => ({ ...prev, isMuted: !audioTrack.enabled }))
      }
    }
  }, [videoCall.localStream])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (videoCall.localStream) {
      const videoTrack = videoCall.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoCall(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }))
      }
    }
  }, [videoCall.localStream])

  // Send prompt message during call
  const sendCallPrompt = useCallback((message: string) => {
    if (videoCallWsRef.current && videoCall.isActive) {
      videoCallWsRef.current.send(JSON.stringify({
        type: 'PROMPT_MESSAGE',
        roomId: patientData.room,
        message
      }))
      addMessage('user', `💬 ${message}`)
    }
  }, [videoCall.isActive, patientData.room, addMessage])

  // Optimized AI Provider status monitoring (less frequent checks)
  useEffect(() => {
    const checkAIStatus = async () => {
      if (window.cloudAI) {
        try {
          const status = await window.cloudAI.getStatus()
          setAiProvider(status.routingStrategy || 'hybrid')
          setIsOnline(status.isOnline || false)
        } catch (error) {
          console.warn('AI status check failed:', error)
          setIsOnline(false)
        }
      }
    }

    checkAIStatus()
    cortexIntervalRef.current = setInterval(checkAIStatus, 8000) // Less frequent for performance

    return () => {
      if (cortexIntervalRef.current) {
        clearInterval(cortexIntervalRef.current)
      }
    }
  }, [])

  // Optimized message handler with debouncing
  const handleSendMessage = useCallback(async () => {
    const message = inputText.trim()
    if (!message || isProcessing) return

    // Clear any existing timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current)
    }

    // Add user message
    addMessage('user', message)
    setInputText('')
    setIsProcessing(true)

    try {
      // Determine AI routing based on message content and context
      // eslint-disable-next-line prefer-const
      let routingOptions = { priority: 'hybrid', modality: 'text' }

      if (emergencyMode || message.toLowerCase().includes('emergency')) {
        routingOptions.priority = 'speed' // Route to local AI for immediate response
        setEmergencyMode(true)
      } else if (message.toLowerCase().includes('drug') || message.toLowerCase().includes('medication')) {
        routingOptions.priority = 'accuracy' // Route to cloud AI for drug info
      }

      // Prepare request with context (optimized payload)
      const request = {
        message,
        session_id: `patient-${patientData.id}`,
        systemPrompt: MEDICAL_PERSONAS.find(p => p.id === currentPersona)?.systemPrompt,
        append_history: true,
        maxTokens: 500,
        temperature: 0.7,
        context: {
          patient: { id: patientData.id, name: patientData.name }, // Reduced context
          vitals: { heartRate: vitals.heartRate, oxygenSaturation: vitals.oxygenSaturation },
          activeCards,
          persona: currentPersona,
          emergency: emergencyMode
        }
      }

      // Route to appropriate AI service
      let response
      if (window.cloudAI) {
        response = await window.cloudAI.routeRequest(request, routingOptions)
      } else if (window.localAI) {
        response = await window.localAI.chat(request)
      } else {
        throw new Error('No AI service available')
      }

      // Add AI response
      addMessage(
        'assistant',
        response.response,
        response.provider || aiProvider
      )

      // Auto-switch persona based on context (optimized)
      const messageLower = message.toLowerCase()
      if (messageLower.includes('nurse') && currentPersona !== 'persona-registered-nurse') {
        setCurrentPersona('persona-registered-nurse')
      } else if (messageLower.includes('emergency') && currentPersona !== 'persona-emergency-nurse') {
        setCurrentPersona('persona-emergency-nurse')
      }

    } catch (error) {
      console.error('AI request failed:', error)
      addMessage(
        'assistant',
        `[SYSTEM] AI service temporarily unavailable. Operating in offline mode with basic protocols.`,
        'offline'
      )
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, patientData, vitals, activeCards, currentPersona, emergencyMode, aiProvider, addMessage, isProcessing])

  // Debounced input handler for performance
  const _handleInputChange = useCallback((e) => {
    const value = e.target.value
    setInputText(value)

    // Clear existing timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current)
    }

    // Set new timeout for potential auto-send or validation
    inputTimeoutRef.current = setTimeout(() => {
      // Future: Implement auto-send for emergency keywords
      if (value.toLowerCase().includes('code blue') || value.toLowerCase().includes('cardiac arrest')) {
        setEmergencyMode(true)
        addMessage('system', '🚨 EMERGENCY KEYWORDS DETECTED - Activating emergency protocols')
      }
    }, PERFORMANCE_CONFIG.debounceDelay)
  }, [addMessage])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // Optimized card toggle with memory management
  const toggleCard = useCallback((cardId) => {
    setActiveCards(prev => {
      const newCards = prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]

      // Limit active cards for performance
      if (newCards.length > 5) {
        addMessage('system', 'Performance notice: Limiting active cards to 5 for optimal response times')
        return newCards.slice(0, 5)
      }

      return newCards
    })
  }, [addMessage])

  // Optimized persona selection
  const selectPersona = useCallback((personaId) => {
    if (personaId !== currentPersona) {
      setCurrentPersona(personaId)
      const persona = MEDICAL_PERSONAS.find(p => p.id === personaId)
      addMessage('system', `Switched to ${persona?.name || personaId} persona`)
    }
  }, [currentPersona, addMessage])

  // Emergency simulation with performance monitoring
  const simulateEmergency = useCallback(() => {
    setEmergencyMode(true)
    addMessage('system', '🚨 EMERGENCY MODE ACTIVATED 🚨')
    addMessage('assistant',
      `[EMERGENCY PROTOCOL] Patient ALPHA-001 showing signs of cardiac distress. Initiating ACLS protocol. All systems routing to LOCAL AI for immediate response.`,
      'local'
    )

    // Performance monitoring for emergency scenarios
    if (window.localAI && window.localAI.getPerformanceHealth) {
      const health = window.localAI.getPerformanceHealth()
      if (health.status !== 'healthy') {
        addMessage('system', `⚠️ System health warning: ${health.warnings.join(', ')}`)
      }
    }
  }, [addMessage])

  // Memoized computed values for performance
  const currentPersonaData = useMemo(() =>
    MEDICAL_PERSONAS.find(p => p.id === currentPersona),
    [currentPersona]
  )

  const _filteredHealthcareCards = useMemo(() =>
    HEALTHCARE_CARDS.filter(card => activeCards.includes(card.id)),
    [activeCards]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current)
      }
      if (vitalsIntervalRef.current) {
        clearInterval(vitalsIntervalRef.current)
      }
      if (cortexIntervalRef.current) {
        clearInterval(cortexIntervalRef.current)
      }
      if (fallDetectionIntervalRef.current) {
        clearInterval(fallDetectionIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="eve-bedside-container" style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr 300px',
      gap: '20px',
      height: '100vh',
      backgroundColor: emergencyMode ? '#1f1f1f' : '#0a0a0a',
      position: 'relative'
    }}>

      {/* Fall Alert Modal */}
      {showFallAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'pulse 1s infinite'
        }}>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.9; }
              50% { opacity: 1; }
            }
          `}</style>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            textAlign: 'center',
            border: '4px solid #dc2626'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {showFallAlert.type === 'bed_exit' ? '🛏️' : '⚠️'}
            </div>
            <h2 style={{ color: '#dc2626', fontSize: '28px', margin: '0 0 16px 0' }}>
              {showFallAlert.type === 'bed_exit' ? 'BED EXIT DETECTED' : 'FALL DETECTED'}
            </h2>
            <p style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px 0' }}>
              Patient: <strong>{patientData.name}</strong>
            </p>
            <p style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>
              Room: <strong>{patientData.room}</strong>
            </p>
            <p style={{ color: '#888', fontSize: '14px', margin: '0 0 24px 0' }}>
              {new Date(showFallAlert.timestamp).toLocaleTimeString()}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => acknowledgeFallAlert(showFallAlert.id)}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ ACKNOWLEDGE
              </button>
              <button
                onClick={() => {
                  acknowledgeFallAlert(showFallAlert.id)
                  simulateEmergency()
                }}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🚨 CODE TEAM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCallRequest && !videoCall.isActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '450px',
            textAlign: 'center',
            border: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📞</div>
            <h2 style={{ color: '#3b82f6', fontSize: '24px', margin: '0 0 16px 0' }}>
              Incoming Call
            </h2>
            <p style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px 0' }}>
              From: <strong>{incomingCallRequest.fromStationName}</strong>
            </p>
            {incomingCallRequest.promptMessage && (
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '12px 16px',
                borderRadius: '8px',
                margin: '16px 0'
              }}>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 4px 0' }}>Message:</p>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0, fontStyle: 'italic' }}>
                  "{incomingCallRequest.promptMessage}"
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button
                onClick={acceptIncomingCall}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ ACCEPT
              </button>
              <button
                onClick={rejectIncomingCall}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕ DECLINE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Video Call Overlay */}
      {videoCall.isActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9997
        }}>
          {/* Video Area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
            {/* Remote Video (Large) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#1a1a1a'
              }}
            />

            {/* Connecting Overlay */}
            {videoCall.isConnecting && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
                  <p style={{ color: '#fff', fontSize: '24px' }}>Connecting...</p>
                </div>
              </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            <div style={{
              position: 'absolute',
              bottom: '100px',
              right: '20px',
              width: '200px',
              height: '150px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #3b82f6'
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#2a2a2a',
                  transform: 'scaleX(-1)' // Mirror for self-view
                }}
              />
              {videoCall.isVideoOff && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a1a1a'
                }}>
                  <span style={{ fontSize: '32px' }}>📷</span>
                </div>
              )}
            </div>

            {/* Call Info Bar */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '12px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ color: '#10b981', fontSize: '12px' }}>● LIVE</span>
                <span style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>
                  {videoCall.remoteStationName || 'Nurse Station'}
                </span>
                {videoCall.callStartTime && (
                  <span style={{ color: '#888', fontSize: '14px' }}>
                    {Math.floor((Date.now() - videoCall.callStartTime) / 60000)}:
                    {String(Math.floor(((Date.now() - videoCall.callStartTime) / 1000) % 60)).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Patient Info */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '12px 20px',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#fff', fontSize: '14px' }}>
                  {patientData.name} • Room {patientData.room}
                </span>
              </div>
            </div>

            {/* Prompt Message Display */}
            {videoCall.promptMessage && (
              <div style={{
                position: 'absolute',
                top: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                padding: '12px 24px',
                borderRadius: '8px',
                maxWidth: '600px'
              }}>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0, textAlign: 'center' }}>
                  💬 {videoCall.promptMessage}
                </p>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div style={{
            padding: '20px',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
          }}>
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: videoCall.isMuted ? '#dc2626' : '#374151',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={videoCall.isMuted ? 'Unmute' : 'Mute'}
            >
              {videoCall.isMuted ? '🔇' : '🎤'}
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: videoCall.isVideoOff ? '#dc2626' : '#374151',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={videoCall.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {videoCall.isVideoOff ? '📷' : '📹'}
            </button>

            {/* End Call Button */}
            <button
              onClick={endVideoCall}
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontSize: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="End call"
            >
              📞
            </button>

            {/* Quick Prompt Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
              <button
                onClick={() => sendCallPrompt('I need help')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#f59e0b',
                  color: '#000',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Need Help
              </button>
              <button
                onClick={() => sendCallPrompt('Pain medication needed')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Pain Meds
              </button>
              <button
                onClick={() => sendCallPrompt('Water/Bathroom assistance')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Assistance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel: Flow & Cards */}
      <div className="flow-panel" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#ffffff', marginBottom: '16px' }}>🏥 Healthcare Flow</h3>

        {/* Flow Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>Active Flow</h4>
          <select
            title="Select Active Flow"
            value={selectedFlow}
            onChange={(e) => setSelectedFlow(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
          >
            <option value="emergency-triage">Emergency Triage</option>
            <option value="icu-monitoring">ICU Monitoring</option>
            <option value="medication-management">Medication Management</option>
            <option value="post-surgical-care">Post-Surgical Care</option>
          </select>
        </div>

        {/* Healthcare Cards */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>AI Capabilities</h4>
          {HEALTHCARE_CARDS.map(card => (
            <div
              key={card.id}
              onClick={() => toggleCard(card.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: activeCards.includes(card.id) ? '#2a2a2a' : '#1a1a1a',
                border: activeCards.includes(card.id) ? '2px solid #10b981' : '1px solid #444',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: activeCards.includes(card.id) ? '#10b981' : '#666',
                  marginRight: '8px'
                }}></span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                  {card.title}
                </span>
              </div>
              <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{card.preview}</p>
            </div>
          ))}
        </div>

        {/* Emergency Button */}
        <button
          onClick={simulateEmergency}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: emergencyMode ? '#dc2626' : '#991b1b',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          🚨 EMERGENCY MODE
        </button>

        {/* Call Nurse Station Button */}
        <button
          onClick={() => callNurseStation()}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          📞 CALL NURSE STATION
        </button>

        {/* Fall Detection Status */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <h4 style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>
            👁️ Visual Tracking
          </h4>

          {/* Camera Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: visualTracking.cameraConnected ? '#10b981' : '#ef4444',
              marginRight: '8px'
            }} />
            <span style={{ color: '#888', fontSize: '12px' }}>
              Camera: {visualTracking.cameraConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Current Posture */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ marginRight: '8px' }}>
              {visualTracking.currentPosture === 'lying' ? '🛏️' :
                visualTracking.currentPosture === 'sitting' ? '🪑' :
                  visualTracking.currentPosture === 'standing' ? '🧍' :
                    visualTracking.currentPosture === 'transitioning' ? '🔄' : '⚠️'}
            </span>
            <span style={{ color: '#fff', fontSize: '12px', textTransform: 'capitalize' }}>
              {visualTracking.currentPosture}
            </span>
          </div>

          {/* Fall Risk Score */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Fall Risk</span>
              <span style={{
                color: visualTracking.riskAssessment.level === 'low' ? '#10b981' :
                  visualTracking.riskAssessment.level === 'moderate' ? '#f59e0b' :
                    visualTracking.riskAssessment.level === 'high' ? '#ef4444' : '#dc2626',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {visualTracking.riskAssessment.score}% ({visualTracking.riskAssessment.level})
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#1a1a1a',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${visualTracking.riskAssessment.score}%`,
                height: '100%',
                backgroundColor: visualTracking.riskAssessment.level === 'low' ? '#10b981' :
                  visualTracking.riskAssessment.level === 'moderate' ? '#f59e0b' :
                    visualTracking.riskAssessment.level === 'high' ? '#ef4444' : '#dc2626',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Bed Exit Alert Toggle */}
          <button
            onClick={toggleBedExitAlert}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: visualTracking.bedExitAlertEnabled ? '#10b981' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            {visualTracking.bedExitAlertEnabled ? '✓ Bed Exit Alert ON' : '○ Bed Exit Alert OFF'}
          </button>

          {/* Fall Events Count */}
          {visualTracking.fallEvents.length > 0 && (
            <div style={{
              backgroundColor: '#dc2626',
              padding: '8px',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#fff', fontSize: '12px' }}>
                ⚠️ {visualTracking.fallEvents.filter(e => !e.acknowledged).length} Unacknowledged Events
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Panel: Patient Interface */}
      <div className="patient-interface" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* Patient Header */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: '#fff', margin: '0 0 4px 0' }}>{patientData.name}</h2>
              <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>
                {patientData.age}Y/O {patientData.gender} • Room {patientData.room}
              </p>
              <p style={{ color: '#f59e0b', margin: '4px 0 0 0', fontSize: '12px' }}>
                📋 {patientData.diagnosis}
              </p>
            </div>

            {/* AI Provider Status */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                marginBottom: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: STATUS_COLORS[aiProvider] || '#666',
                  marginRight: '6px'
                }}></div>
                <span style={{ color: '#888', fontSize: '12px', textTransform: 'capitalize' }}>
                  {aiProvider} AI
                </span>
              </div>
              <div style={{ color: isOnline ? '#10b981' : '#ef4444', fontSize: '12px' }}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
          </div>

          {/* Real-time Vitals */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginTop: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                {Math.round(vitals.heartRate)}
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>HR (bpm)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                {vitals.bloodPressure}
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>BP (mmHg)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                {Math.round(vitals.oxygenSaturation)}%
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>SpO2 (%)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                {vitals.temperature.toFixed(1)}°C
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>Temp (°C)</div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div style={{
          flex: 1,
          backgroundColor: '#2a2a2a',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* Conversation Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', marginRight: '8px' }}>
                {currentPersonaData?.icon}
              </span>
              <span style={{ color: '#fff', fontWeight: '500' }}>
                {currentPersonaData?.name}
              </span>
            </div>
            <span style={{ color: '#888', fontSize: '12px' }}>
              {conversationHistory.length} messages
            </span>
          </div>

          {/* Conversation History */}
          <div
            ref={conversationRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              maxHeight: '400px'
            }}
          >
            {conversationHistory.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#666',
                fontStyle: 'italic',
                padding: '40px 20px'
              }}>
                🏥 Eve Bedside Assistant Ready<br />
                Select cards and ask about patient care
              </div>
            )}

            {conversationHistory.map(msg => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#3b82f6' : '#374151',
                  color: '#fff',
                  fontSize: '14px'
                }}>
                  {msg.content}
                  {msg.provider && (
                    <div style={{
                      fontSize: '10px',
                      color: '#aaa',
                      marginTop: '4px',
                      textTransform: 'capitalize'
                    }}>
                      via {msg.provider} AI
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#374151',
                  color: '#888',
                  fontSize: '14px'
                }}>
                  Eve is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #444',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about patient care, protocols, or clinical decisions..."
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#374151',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '6px',
                outline: 'none'
              }}
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={isProcessing || !inputText.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isProcessing || !inputText.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Personas & Cortex */}
      <div className="personas-panel" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        overflowY: 'auto'
      }}>

        {/* Medical Personas */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>Medical Personas</h4>
          {MEDICAL_PERSONAS.map(persona => (
            <div
              key={persona.id}
              onClick={() => selectPersona(persona.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: currentPersona === persona.id ? '#2a2a2a' : '#1a1a1a',
                border: currentPersona === persona.id ? '2px solid #3b82f6' : '1px solid #444',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>
                  {persona.icon}
                </span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                  {persona.name}
                </span>
              </div>
              <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                {persona.role}
              </p>
            </div>
          ))}
        </div>

        {/* AI Cortex Metrics */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>AI Cortex</h4>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Vectors Processed</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                {cortex?.vectorsProcessed || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Active Models</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                {cortex?.activeModels || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Bridge Status</span>
              <span style={{
                color: cortex?.bridgeStatus === 'connected' ? '#10b981' : '#ef4444',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {cortex?.bridgeStatus || 'disconnected'}
              </span>
            </div>
          </div>

          {/* Emotion Trends */}
          {cortex?.emotionTrend && (
            <div>
              <h5 style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Emotional State</h5>
              {cortex.emotionTrend.map((emotion, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: '11px' }}>{emotion.label}</span>
                    <span style={{ color: '#fff', fontSize: '11px' }}>
                      {Math.round((emotion.value || 0) * 100)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#333',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(emotion.value || 0) * 100}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Controls */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '12px',
          borderRadius: '6px'
        }}>
          <h5 style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Demo Scenarios</h5>
          <button
            onClick={() => addMessage('user', 'What is the current status of patient ALPHA-001?')}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '4px',
              backgroundColor: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📊 Patient Status Check
          </button>
          <button
            onClick={() => addMessage('user', 'What are the contraindications for aspirin in elderly patients?')}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '4px',
              backgroundColor: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            💊 Drug Interaction Check
          </button>
          <button
            onClick={() => addMessage('user', 'What should I do if the patient goes into cardiac arrest?')}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🚨 Emergency Protocol
          </button>
        </div>
      </div>
    </div>
  )
}
