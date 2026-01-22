import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Utility function for generating IDs
const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`
}

// Configuration
const DASHBOARD_CONFIG = {
  alertRefreshInterval: 1000, // Check for new alerts every second
  callQueueTimeout: 30000, // 30 seconds before overflow
  stationHeartbeatInterval: 5000, // Station status check every 5 seconds
  maxQueuedCalls: 10,
  overflowCheckInterval: 5000 // Check for overflow every 5 seconds
}

// Types
interface PatientRoom {
  roomId: string
  patientId: string
  patientName: string
  patientAge: number
  diagnosis: string
  vitals: {
    heartRate: number
    bloodPressure: string
    oxygenSaturation: number
    temperature: number
  }
  fallRiskLevel: 'low' | 'moderate' | 'high' | 'very_high'
  lastUpdate: string
  status: 'stable' | 'attention' | 'critical'
  bedExitAlertEnabled: boolean
}

interface Alert {
  id: string
  type: 'fall' | 'bed_exit' | 'call_request' | 'vitals_warning' | 'emergency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  roomId: string
  patientName: string
  message: string
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

interface QueuedCall {
  id: string
  roomId: string
  patientName: string
  patientId: string
  promptMessage?: string
  timestamp: string
  status: 'waiting' | 'connecting' | 'active' | 'overflow'
  assignedTo?: string
  overflowAttempts: number
  offer?: RTCSessionDescriptionInit
}

interface NurseStation {
  stationId: string
  stationName: string
  location: string
  online: boolean
  currentCalls: number
  maxCalls: number
  lastHeartbeat: string
}

interface VideoCallState {
  isActive: boolean
  currentCall: QueuedCall | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  callStartTime: number | null
}

// Sample data for demo
const DEMO_ROOMS: PatientRoom[] = [
  {
    roomId: 'ICU-201',
    patientId: 'patient-001',
    patientName: 'John Mitchell',
    patientAge: 67,
    diagnosis: 'Acute MI (STEMI)',
    vitals: { heartRate: 95, bloodPressure: '150/90', oxygenSaturation: 96, temperature: 37.2 },
    fallRiskLevel: 'high',
    lastUpdate: new Date().toISOString(),
    status: 'attention',
    bedExitAlertEnabled: true
  },
  {
    roomId: 'ICU-202',
    patientId: 'patient-002',
    patientName: 'Mary Johnson',
    patientAge: 72,
    diagnosis: 'Post-Hip Replacement',
    vitals: { heartRate: 78, bloodPressure: '130/85', oxygenSaturation: 98, temperature: 36.8 },
    fallRiskLevel: 'very_high',
    lastUpdate: new Date().toISOString(),
    status: 'stable',
    bedExitAlertEnabled: true
  },
  {
    roomId: 'ICU-203',
    patientId: 'patient-003',
    patientName: 'Robert Davis',
    patientAge: 55,
    diagnosis: 'Pneumonia',
    vitals: { heartRate: 88, bloodPressure: '125/80', oxygenSaturation: 94, temperature: 38.1 },
    fallRiskLevel: 'moderate',
    lastUpdate: new Date().toISOString(),
    status: 'attention',
    bedExitAlertEnabled: false
  },
  {
    roomId: 'MED-101',
    patientId: 'patient-004',
    patientName: 'Susan Williams',
    patientAge: 45,
    diagnosis: 'Observation - Chest Pain',
    vitals: { heartRate: 72, bloodPressure: '120/75', oxygenSaturation: 99, temperature: 36.6 },
    fallRiskLevel: 'low',
    lastUpdate: new Date().toISOString(),
    status: 'stable',
    bedExitAlertEnabled: false
  }
]

const DEMO_STATIONS: NurseStation[] = [
  {
    stationId: 'NS-FLOOR2',
    stationName: 'Floor 2 Central',
    location: '2nd Floor Nurses Station',
    online: true,
    currentCalls: 0,
    maxCalls: 2,
    lastHeartbeat: new Date().toISOString()
  },
  {
    stationId: 'NS-FLOOR3',
    stationName: 'Floor 3 Central',
    location: '3rd Floor Nurses Station',
    online: true,
    currentCalls: 1,
    maxCalls: 2,
    lastHeartbeat: new Date().toISOString()
  },
  {
    stationId: 'NS-ICU',
    stationName: 'ICU Station',
    location: 'ICU Command Center',
    online: true,
    currentCalls: 0,
    maxCalls: 3,
    lastHeartbeat: new Date().toISOString()
  }
]

export default function NurseStationDashboard() {
  // Station identity
  const [stationId] = useState('NS-FLOOR2')
  const [stationName] = useState('Floor 2 Central')

  // Room and patient data
  const [rooms, setRooms] = useState<PatientRoom[]>(DEMO_ROOMS)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)

  // Call queue
  const [callQueue, setCallQueue] = useState<QueuedCall[]>([])
  const [otherStations, setOtherStations] = useState<NurseStation[]>(DEMO_STATIONS.filter(s => s.stationId !== stationId))

  // Video call state
  const [videoCall, setVideoCall] = useState<VideoCallState>({
    isActive: false,
    currentCall: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    callStartTime: null
  })

  // Prompt input for calls
  const [callPrompt, setCallPrompt] = useState('')

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const overflowTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // WebSocket connection for alerts and calls
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8001/marketplace/modules/medical-module/medical/ws/nurse-station/${stationId}`

    const connectWs = () => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('Nurse station WebSocket connected')
          // Register this station
          ws.send(JSON.stringify({
            type: 'REGISTER_STATION',
            stationId,
            stationName,
            maxCalls: 2
          }))
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'FALL_ALERT':
              handleFallAlert(data)
              break

            case 'CALL_REQUEST':
              handleIncomingCallRequest(data)
              break

            case 'ROOM_UPDATE':
              handleRoomUpdate(data)
              break

            case 'STATION_UPDATE':
              handleStationUpdate(data)
              break

            case 'CALL_OVERFLOW':
              handleOverflowCall(data)
              break

            case 'ICE_CANDIDATE':
              if (peerConnectionRef.current) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
              }
              break

            case 'CALL_ACCEPTED':
              handleCallAccepted(data)
              break

            case 'CALL_ENDED':
              handleCallEnded(data.roomId)
              break

            case 'PROMPT_MESSAGE':
              // Patient sent a prompt during call
              addAlert({
                type: 'call_request',
                severity: 'medium',
                roomId: data.roomId,
                patientName: data.patientName || 'Patient',
                message: `Call prompt: "${data.message}"`
              })
              break
          }
        }

        ws.onclose = () => {
          console.log('Nurse station WebSocket disconnected, reconnecting...')
          setTimeout(connectWs, 5000)
        }

        ws.onerror = (error) => {
          console.error('Nurse station WebSocket error:', error)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
      }
    }

    connectWs()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId])

  // Add an alert (defined early as it's used by initiateOverflow)
  const addAlert = useCallback((alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const alert: Alert = {
      ...alertData,
      id: generateId('alert'),
      timestamp: new Date().toISOString(),
      acknowledged: false
    }
    setAlerts(prev => [alert, ...prev].slice(0, 50)) // Keep last 50 alerts
  }, [])

  // Initiate overflow to another station - defined early as it's used by handleIncomingCallRequest
  const initiateOverflow = useCallback((call: QueuedCall) => {
    // Find available station
    const availableStation = otherStations.find(s =>
      s.online && s.currentCalls < s.maxCalls
    )

    if (availableStation && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'OVERFLOW_CALL',
        callId: call.id,
        toStationId: availableStation.stationId,
        fromStation: stationName,
        roomId: call.roomId,
        patientName: call.patientName,
        patientId: call.patientId,
        promptMessage: call.promptMessage,
        timestamp: call.timestamp,
        overflowAttempts: call.overflowAttempts + 1,
        offer: call.offer
      }))

      // Update call status
      setCallQueue(prev => prev.map(c =>
        c.id === call.id ? { ...c, status: 'overflow' as const } : c
      ))

      // Remove from queue after short delay
      setTimeout(() => {
        setCallQueue(prev => prev.filter(c => c.id !== call.id))
      }, 2000)
    } else {
      // No available station, escalate alert
      addAlert({
        type: 'emergency',
        severity: 'critical',
        roomId: call.roomId,
        patientName: call.patientName,
        message: `NO AVAILABLE STATIONS - Call waiting ${Math.floor((Date.now() - new Date(call.timestamp).getTime()) / 1000)}s`
      })
    }
  }, [otherStations, stationName, addAlert])

  // Overflow timer management
  useEffect(() => {
    const checkOverflow = setInterval(() => {
      callQueue.forEach(call => {
        if (call.status === 'waiting') {
          const waitTime = Date.now() - new Date(call.timestamp).getTime()

          if (waitTime > DASHBOARD_CONFIG.callQueueTimeout && !overflowTimersRef.current.has(call.id)) {
            // Start overflow process
            initiateOverflow(call)
          }
        }
      })
    }, DASHBOARD_CONFIG.overflowCheckInterval)

    return () => clearInterval(checkOverflow)
  }, [callQueue, initiateOverflow])

  // Vitals simulation for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms(prev => prev.map(room => ({
        ...room,
        vitals: {
          heartRate: Math.max(60, Math.min(120, room.vitals.heartRate + (Math.random() - 0.5) * 4)),
          bloodPressure: room.vitals.bloodPressure,
          oxygenSaturation: Math.max(90, Math.min(100, room.vitals.oxygenSaturation + (Math.random() - 0.5) * 2)),
          temperature: Math.max(36, Math.min(39, room.vitals.temperature + (Math.random() - 0.5) * 0.2))
        },
        lastUpdate: new Date().toISOString()
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Update unacknowledged count
  useEffect(() => {
    setUnacknowledgedCount(alerts.filter(a => !a.acknowledged).length)
  }, [alerts])

  // Handle fall alert
  const handleFallAlert = useCallback((data: any) => {
    addAlert({
      type: data.event.type === 'bed_exit' ? 'bed_exit' : 'fall',
      severity: data.event.severity,
      roomId: data.event.location,
      patientName: data.patient?.name || 'Unknown Patient',
      message: data.event.type === 'bed_exit'
        ? `BED EXIT DETECTED - ${data.patient?.name}`
        : `FALL DETECTED - ${data.patient?.name}`
    })

    // Update room status
    setRooms(prev => prev.map(room =>
      room.roomId === data.event.location
        ? { ...room, status: 'critical' as const }
        : room
    ))
  }, [addAlert])

  // Handle incoming call request
  const handleIncomingCallRequest = useCallback((data: any) => {
    const newCall: QueuedCall = {
      id: data.callId || generateId('call'),
      roomId: data.roomId,
      patientName: data.patientName,
      patientId: data.patientId,
      promptMessage: data.promptMessage,
      timestamp: new Date().toISOString(),
      status: 'waiting',
      overflowAttempts: 0,
      offer: data.offer
    }

    setCallQueue(prev => {
      if (prev.length >= DASHBOARD_CONFIG.maxQueuedCalls) {
        // Queue full, immediately overflow
        initiateOverflow(newCall)
        return prev
      }
      return [...prev, newCall]
    })

    addAlert({
      type: 'call_request',
      severity: 'medium',
      roomId: data.roomId,
      patientName: data.patientName,
      message: data.promptMessage
        ? `Call request: "${data.promptMessage}"`
        : 'Patient requesting call'
    })
  }, [addAlert, initiateOverflow])

  // Handle room update
  const handleRoomUpdate = useCallback((data: any) => {
    setRooms(prev => prev.map(room =>
      room.roomId === data.roomId
        ? { ...room, ...data.updates }
        : room
    ))
  }, [])

  // Handle station update
  const handleStationUpdate = useCallback((data: any) => {
    setOtherStations(prev => prev.map(station =>
      station.stationId === data.stationId
        ? { ...station, ...data.updates }
        : station
    ))
  }, [])

  // Handle overflow call
  const handleOverflowCall = useCallback((data: any) => {
    // This station is receiving an overflow call
    const overflowCall: QueuedCall = {
      id: data.callId,
      roomId: data.roomId,
      patientName: data.patientName,
      patientId: data.patientId,
      promptMessage: data.promptMessage,
      timestamp: data.timestamp,
      status: 'waiting',
      overflowAttempts: data.overflowAttempts || 1,
      offer: data.offer
    }

    setCallQueue(prev => [...prev, overflowCall])

    addAlert({
      type: 'call_request',
      severity: 'high',
      roomId: data.roomId,
      patientName: data.patientName,
      message: `OVERFLOW: Call transferred from ${data.fromStation}`
    })
  }, [addAlert])

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? { ...alert, acknowledged: true, acknowledgedBy: stationName, acknowledgedAt: new Date().toISOString() }
        : alert
    ))
  }, [stationName])

  // Answer a queued call
  const answerCall = useCallback(async (call: QueuedCall) => {
    setCallQueue(prev => prev.map(c =>
      c.id === call.id ? { ...c, status: 'connecting' as const, assignedTo: stationId } : c
    ))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize peer connection
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }

      const pc = new RTCPeerConnection(config)

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            candidate: event.candidate,
            roomId: call.roomId
          }))
        }
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setVideoCall(prev => ({ ...prev, remoteStream: event.streams[0] }))
        }
      }

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Set remote offer and create answer
      if (call.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Send answer to room
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'CALL_ACCEPTED',
            roomId: call.roomId,
            answer: answer
          }))
        }
      }

      peerConnectionRef.current = pc

      setVideoCall({
        isActive: true,
        currentCall: call,
        localStream: stream,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        callStartTime: Date.now()
      })

      // Update call queue
      setCallQueue(prev => prev.map(c =>
        c.id === call.id ? { ...c, status: 'active' as const } : c
      ))

    } catch (error) {
      console.error('Failed to answer call:', error)
      // Return call to queue
      setCallQueue(prev => prev.map(c =>
        c.id === call.id ? { ...c, status: 'waiting' as const } : c
      ))
    }
  }, [stationId])

  // Handle call accepted by room
  const handleCallAccepted = useCallback(async (data: any) => {
    if (peerConnectionRef.current && data.answer) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
    }
  }, [])

  // End call - defined first as it's used by handleCallEnded
  const endCall = useCallback(() => {
    if (videoCall.localStream) {
      videoCall.localStream.getTracks().forEach(track => track.stop())
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (wsRef.current && videoCall.currentCall) {
      wsRef.current.send(JSON.stringify({
        type: 'END_CALL',
        roomId: videoCall.currentCall.roomId
      }))
    }

    // Remove from queue
    if (videoCall.currentCall) {
      setCallQueue(prev => prev.filter(c => c.id !== videoCall.currentCall!.id))
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setVideoCall({
      isActive: false,
      currentCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      callStartTime: null
    })
  }, [videoCall])

  // Handle call ended
  const handleCallEnded = useCallback((roomId: string) => {
    if (videoCall.currentCall?.roomId === roomId) {
      endCall()
    }
  }, [videoCall.currentCall, endCall])

  // Call a room
  const callRoom = useCallback(async (room: PatientRoom, promptMessage?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }

      const pc = new RTCPeerConnection(config)

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            candidate: event.candidate,
            roomId: room.roomId
          }))
        }
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'CALL_ROOM',
          roomId: room.roomId,
          fromStationId: stationId,
          fromStationName: stationName,
          offer: offer,
          promptMessage
        }))
      }

      peerConnectionRef.current = pc

      const newCall: QueuedCall = {
        id: generateId('call'),
        roomId: room.roomId,
        patientName: room.patientName,
        patientId: room.patientId,
        promptMessage,
        timestamp: new Date().toISOString(),
        status: 'connecting',
        overflowAttempts: 0
      }

      setVideoCall({
        isActive: true,
        currentCall: newCall,
        localStream: stream,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        callStartTime: null
      })

    } catch (error) {
      console.error('Failed to call room:', error)
    }
  }, [stationId, stationName])

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

  // Send prompt to patient
  const sendPromptToPatient = useCallback((message: string) => {
    if (wsRef.current && videoCall.currentCall) {
      wsRef.current.send(JSON.stringify({
        type: 'PROMPT_MESSAGE',
        roomId: videoCall.currentCall.roomId,
        message
      }))
      setCallPrompt('')
    }
  }, [videoCall.currentCall])

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      default: return '#10b981'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#dc2626'
      case 'attention': return '#f59e0b'
      default: return '#10b981'
    }
  }

  // Selected room data
  const selectedRoomData = useMemo(() =>
    rooms.find(r => r.roomId === selectedRoom),
    [rooms, selectedRoom]
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '350px 1fr 350px',
      gap: '16px',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      padding: '16px',
      boxSizing: 'border-box'
    }}>

      {/* Video Call Overlay */}
      {videoCall.isActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.95)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Video Area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
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

            {/* Local Video PiP */}
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
                  transform: 'scaleX(-1)'
                }}
              />
            </div>

            {/* Call Info */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '12px 20px',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#10b981', marginRight: '8px' }}>● LIVE</span>
              <span style={{ color: '#fff', fontWeight: '500' }}>
                Room {videoCall.currentCall?.roomId} - {videoCall.currentCall?.patientName}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            padding: '20px',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
          }}>
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
                cursor: 'pointer'
              }}
            >
              {videoCall.isMuted ? '🔇' : '🎤'}
            </button>

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
                cursor: 'pointer'
              }}
            >
              {videoCall.isVideoOff ? '📷' : '📹'}
            </button>

            <button
              onClick={endCall}
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontSize: '28px',
                cursor: 'pointer'
              }}
            >
              📞
            </button>

            {/* Prompt Input */}
            <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
              <input
                type="text"
                value={callPrompt}
                onChange={(e) => setCallPrompt(e.target.value)}
                placeholder="Send message to patient..."
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#374151',
                  color: '#fff',
                  width: '250px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && callPrompt && sendPromptToPatient(callPrompt)}
              />
              <button
                onClick={() => callPrompt && sendPromptToPatient(callPrompt)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel - Alerts & Call Queue */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto'
      }}>
        {/* Station Info */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '12px',
          borderRadius: '6px'
        }}>
          <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '16px' }}>
            🏥 {stationName}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }} />
            <span style={{ color: '#888', fontSize: '12px' }}>Online</span>
          </div>
        </div>

        {/* Call Queue */}
        <div>
          <h4 style={{ color: '#fff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📞 Call Queue
            {callQueue.length > 0 && (
              <span style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {callQueue.length}
              </span>
            )}
          </h4>

          {callQueue.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
              No calls in queue
            </p>
          ) : (
            callQueue.map(call => (
              <div
                key={call.id}
                style={{
                  backgroundColor: call.status === 'overflow' ? '#991b1b' : '#2a2a2a',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  border: call.status === 'connecting' ? '2px solid #3b82f6' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#fff', margin: '0 0 4px 0', fontWeight: '500' }}>
                      {call.patientName}
                    </p>
                    <p style={{ color: '#888', margin: 0, fontSize: '12px' }}>
                      Room {call.roomId}
                    </p>
                    {call.promptMessage && (
                      <p style={{ color: '#f59e0b', margin: '4px 0 0 0', fontSize: '12px' }}>
                        "{call.promptMessage}"
                      </p>
                    )}
                  </div>
                  {call.status === 'waiting' && (
                    <button
                      onClick={() => answerCall(call)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Answer
                    </button>
                  )}
                  {call.status === 'connecting' && (
                    <span style={{ color: '#3b82f6', fontSize: '12px' }}>Connecting...</span>
                  )}
                  {call.status === 'overflow' && (
                    <span style={{ color: '#ef4444', fontSize: '12px' }}>Transferring...</span>
                  )}
                </div>
                <p style={{ color: '#666', margin: '8px 0 0 0', fontSize: '11px' }}>
                  Waiting: {Math.floor((Date.now() - new Date(call.timestamp).getTime()) / 1000)}s
                </p>
              </div>
            ))
          )}
        </div>

        {/* Alerts */}
        <div>
          <h4 style={{ color: '#fff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚨 Alerts
            {unacknowledgedCount > 0 && (
              <span style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {unacknowledgedCount}
              </span>
            )}
          </h4>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                No recent alerts
              </p>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    backgroundColor: alert.acknowledged ? '#1a1a1a' : '#2a2a2a',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                    opacity: alert.acknowledged ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px' }}>
                          {alert.type === 'fall' ? '⚠️' :
                            alert.type === 'bed_exit' ? '🛏️' :
                              alert.type === 'emergency' ? '🚨' :
                                alert.type === 'vitals_warning' ? '❤️' : '📞'}
                        </span>
                        <span style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>
                          {alert.patientName}
                        </span>
                        <span style={{ color: '#888', fontSize: '12px' }}>
                          {alert.roomId}
                        </span>
                      </div>
                      <p style={{ color: '#ccc', margin: 0, fontSize: '12px' }}>
                        {alert.message}
                      </p>
                      <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '11px' }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#374151',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ACK
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center Panel - Room Grid */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px 0' }}>
          Patient Rooms
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {rooms.map(room => (
            <div
              key={room.roomId}
              onClick={() => setSelectedRoom(room.roomId)}
              style={{
                backgroundColor: selectedRoom === room.roomId ? '#3a3a3a' : '#2a2a2a',
                padding: '16px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: `2px solid ${selectedRoom === room.roomId ? '#3b82f6' : 'transparent'}`,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Room Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
                    {room.roomId}
                  </h4>
                  <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '14px' }}>
                    {room.patientName}, {room.patientAge}
                  </p>
                </div>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(room.status)
                }} />
              </div>

              {/* Diagnosis */}
              <p style={{ color: '#f59e0b', margin: '0 0 12px 0', fontSize: '12px' }}>
                {room.diagnosis}
              </p>

              {/* Vitals */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                    {Math.round(room.vitals.heartRate)}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>HR</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                    {room.vitals.bloodPressure}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>BP</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                    {Math.round(room.vitals.oxygenSaturation)}%
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>SpO2</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                    {room.vitals.temperature.toFixed(1)}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>Temp</div>
                </div>
              </div>

              {/* Fall Risk & Bed Exit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: room.fallRiskLevel === 'low' ? '#10b981' :
                    room.fallRiskLevel === 'moderate' ? '#f59e0b' :
                      room.fallRiskLevel === 'high' ? '#ef4444' : '#dc2626',
                  color: '#fff'
                }}>
                  Fall Risk: {room.fallRiskLevel.toUpperCase()}
                </span>
                {room.bedExitAlertEnabled && (
                  <span style={{ color: '#10b981', fontSize: '11px' }}>
                    🛏️ Bed Exit Alert
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Selected Room Details */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        overflowY: 'auto'
      }}>
        {selectedRoomData ? (
          <>
            <h3 style={{ color: '#fff', margin: '0 0 16px 0' }}>
              Room {selectedRoomData.roomId}
            </h3>

            {/* Patient Info */}
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: '#fff', margin: '0 0 8px 0' }}>
                {selectedRoomData.patientName}
              </h4>
              <p style={{ color: '#888', margin: '0 0 4px 0', fontSize: '14px' }}>
                Age: {selectedRoomData.patientAge}
              </p>
              <p style={{ color: '#f59e0b', margin: 0, fontSize: '14px' }}>
                {selectedRoomData.diagnosis}
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#888', margin: '0 0 12px 0', fontSize: '14px' }}>
                Quick Actions
              </h4>
              <button
                onClick={() => callRoom(selectedRoomData)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                📞 Call Room
              </button>
              <button
                onClick={() => callRoom(selectedRoomData, 'Medication check-in')}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                💊 Medication Check
              </button>
              <button
                onClick={() => callRoom(selectedRoomData, 'Checking on you')}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                👋 Wellness Check
              </button>
            </div>

            {/* Detailed Vitals */}
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: '#888', margin: '0 0 12px 0', fontSize: '14px' }}>
                Current Vitals
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Heart Rate</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {Math.round(selectedRoomData.vitals.heartRate)} bpm
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Blood Pressure</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {selectedRoomData.vitals.bloodPressure} mmHg
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Oxygen Saturation</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {Math.round(selectedRoomData.vitals.oxygenSaturation)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Temperature</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {selectedRoomData.vitals.temperature.toFixed(1)}°C
                  </span>
                </div>
              </div>
            </div>

            {/* Other Stations */}
            <div>
              <h4 style={{ color: '#888', margin: '0 0 12px 0', fontSize: '14px' }}>
                Other Stations
              </h4>
              {otherStations.map(station => (
                <div
                  key={station.stationId}
                  style={{
                    backgroundColor: '#2a2a2a',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>
                        {station.stationName}
                      </p>
                      <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '12px' }}>
                        {station.location}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: station.currentCalls < station.maxCalls ? '#10b981' : '#ef4444',
                        fontSize: '12px'
                      }}>
                        {station.currentCalls}/{station.maxCalls}
                      </span>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: station.online ? '#10b981' : '#ef4444'
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '100px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</p>
            <p>Select a room to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
