"""
Medical Data API Routes

Endpoints for medical record sync, station management, and audit queries.
Local-first architecture - devices sync to this server.
Includes WebSocket endpoints for real-time bedside-to-nurse-station communication.
"""

import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Query, status, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

# Imports from main app (absolute imports instead of relative escaping package)
from app.db.session import get_db
from app.auth.dependencies import get_current_user, get_optional_user, get_client_ip
from app.auth.models import User

from .schemas import (
    MedicalRecord,
    SyncRequest,
    SyncResponse,
    RecordQueryParams,
    StationRegistration,
    StationStatus,
    AuditEntry
)
from .service import MedicalRecordService
from .websocket import handle_room_websocket, handle_station_websocket
from .device_bridge import get_bridge, check_ble_available

# Check if bleak is available
try:
    from bleak import BleakScanner
    BLEAK_AVAILABLE = True
except ImportError:
    BLEAK_AVAILABLE = False


router = APIRouter(prefix="/medical", tags=["medical"])


# ============================================================================
# Record Sync Endpoints
# ============================================================================

@router.post("/records", response_model=SyncResponse)
async def sync_record(
    record: MedicalRecord,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> SyncResponse:
    """
    Sync a single medical record from a station.

    This is the primary endpoint for bedside/station devices to sync data.
    Records are stored locally first on the device, then synced here.

    Headers:
        X-Station-ID: Station identifier
        X-Checksum: Data integrity checksum

    Returns:
        SyncResponse with timestamp and sync token
    """
    station_id = request.headers.get("X-Station-ID", "unknown")
    client_ip = get_client_ip(request)

    service = MedicalRecordService(db)
    return await service.sync_records([record], station_id, client_ip)


@router.post("/records/batch", response_model=SyncResponse)
async def sync_records_batch(
    sync_request: SyncRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> SyncResponse:
    """
    Sync a batch of medical records from a station.

    Used when a station comes back online and has multiple pending records.

    Returns:
        SyncResponse with counts and any conflicts
    """
    client_ip = get_client_ip(request)

    service = MedicalRecordService(db)
    return await service.sync_records(
        sync_request.records,
        sync_request.station_id,
        client_ip
    )


@router.get("/records")
async def get_records(
    type: Optional[str] = Query(None, description="Record type filter"),
    patient_id: Optional[str] = Query(None, description="Patient ID filter"),
    station_id: Optional[str] = Query(None, description="Station ID filter"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    """
    Query medical records with filters.

    Requires authentication. Results filtered by user permissions.

    Returns:
        List of matching records
    """
    params = RecordQueryParams(
        type=type,
        patient_id=patient_id,
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

    service = MedicalRecordService(db)
    records = await service.get_records(params)

    return [
        {
            "id": r.id,
            "type": r.type,
            "patientId": r.patient_id,
            "deviceId": r.device_id,
            "stationId": r.station_id,
            "data": r.data,
            "timestamp": r.timestamp,
            "createdBy": r.created_by,
            "syncStatus": r.sync_status,
            "serverTimestamp": r.server_timestamp
        }
        for r in records
    ]


@router.get("/records/{record_id}")
async def get_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get a single record by ID.

    Returns:
        Record details
    """
    service = MedicalRecordService(db)
    record = await service.get_record_by_id(record_id)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record {record_id} not found"
        )

    return {
        "id": record.id,
        "type": record.type,
        "patientId": record.patient_id,
        "deviceId": record.device_id,
        "stationId": record.station_id,
        "data": record.data,
        "timestamp": record.timestamp,
        "createdBy": record.created_by,
        "syncStatus": record.sync_status,
        "serverTimestamp": record.server_timestamp
    }


# ============================================================================
# Station Management Endpoints
# ============================================================================

@router.post("/stations/register")
async def register_station(
    registration: StationRegistration,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Register a bedside or nurse station with the server.

    Called when a station initializes or reconnects.

    Returns:
        Registration confirmation with server time
    """
    client_ip = get_client_ip(request)

    service = MedicalRecordService(db)
    station = await service.register_station(
        station_id=registration.station_id,
        station_type=registration.station_type,
        location=registration.location,
        capabilities=registration.capabilities,
        ip_address=registration.ip_address or client_ip
    )

    return {
        "success": True,
        "stationId": station.station_id,
        "serverTime": station.last_heartbeat,
        "message": f"Station registered: {station.station_type} at {station.location}"
    }


@router.post("/stations/{station_id}/heartbeat")
async def station_heartbeat(
    station_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Station heartbeat to maintain online status.

    Should be called periodically (every 30-60 seconds).

    Returns:
        Acknowledgment with server time
    """
    service = MedicalRecordService(db)
    success = await service.update_station_heartbeat(station_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station {station_id} not registered"
        )

    from datetime import datetime
    return {
        "success": True,
        "stationId": station_id,
        "serverTime": datetime.utcnow().isoformat()
    }


@router.get("/stations/{station_id}/status", response_model=StationStatus)
async def get_station_status(
    station_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get current status of a station.

    Returns:
        Station status including sync info and pending records
    """
    service = MedicalRecordService(db)
    status = await service.get_station_status(station_id)

    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station {station_id} not found"
        )

    return status


# ============================================================================
# Audit Log Endpoints
# ============================================================================

@router.get("/audit")
async def get_audit_log(
    record_id: Optional[str] = Query(None, description="Filter by record ID"),
    station_id: Optional[str] = Query(None, description="Filter by station ID"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    """
    Query audit log entries.

    HIPAA-compliant audit trail of all record access and modifications.

    Returns:
        List of audit entries
    """
    service = MedicalRecordService(db)
    entries = await service.get_audit_log(
        record_id=record_id,
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )

    return [
        {
            "id": e.id,
            "action": e.action,
            "recordId": e.record_id,
            "recordType": e.record_type,
            "userId": e.user_id,
            "stationId": e.station_id,
            "timestamp": e.timestamp,
            "details": e.details,
            "ipAddress": e.ip_address,
            "success": e.success,
            "errorMessage": e.error_message
        }
        for e in entries
    ]


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check() -> dict:
    """
    Medical module health check.

    Returns:
        Service status
    """
    return {
        "status": "healthy",
        "service": "medical",
        "localFirst": True,
        "syncEnabled": True
    }


# ============================================================================
# WebSocket Endpoints
# ============================================================================

@router.websocket("/ws/video/{room_id}")
async def video_room_websocket(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for bedside/patient room video connections.

    Handles:
    - Room registration
    - Fall/bed exit alerts
    - Video call signaling with nurse station
    - Prompt messages during calls

    Args:
        websocket: WebSocket connection
        room_id: Unique room identifier (e.g., 'ICU-203')
    """
    await handle_room_websocket(websocket, room_id)


@router.websocket("/ws/nurse-station/{station_id}")
async def nurse_station_websocket(websocket: WebSocket, station_id: str):
    """
    WebSocket endpoint for nurse station connections.

    Handles:
    - Station registration
    - Receiving fall/bed exit alerts from rooms
    - Video call management (initiate, receive, end)
    - Call queue with overflow to other stations
    - Prompt messages during calls

    Args:
        websocket: WebSocket connection
        station_id: Unique station identifier (e.g., 'NS-FLOOR2')
    """
    await handle_station_websocket(websocket, station_id)


@router.websocket("/ws/nurse-station")
async def nurse_station_alert_websocket(websocket: WebSocket):
    """
    Generic WebSocket endpoint for nurse station alert reception.

    Used by rooms to send one-off alerts (fall detection) when they
    don't have a persistent video WebSocket connection.

    This is a simplified endpoint that broadcasts received alerts
    to all connected nurse stations.
    """
    from .websocket import medical_ws_manager

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "FALL_ALERT":
                await medical_ws_manager.send_fall_alert(
                    data.get("event", {}).get("location", "unknown"),
                    data.get("event", {}),
                    data.get("patient", {}),
                    data.get("vitals", {})
                )
                # Send acknowledgment
                await websocket.send_json({
                    "type": "ALERT_RECEIVED",
                    "timestamp": data.get("timestamp")
                })

    except Exception:
        pass  # Connection closed


# ============================================================================
# BLE Device Endpoints (using eve_peripheral_bridge)
# ============================================================================

@router.get("/ble/status")
async def ble_status():
    """
    Check BLE availability status.

    Returns:
        BLE availability info and any connected devices
    """
    bridge = get_bridge()
    status = await check_ble_available()

    return {
        **status,
        "connectedDevices": bridge.get_connected_devices(),
        "discoveredDevices": bridge.get_discovered_devices(),
    }


@router.get("/ble/scan")
async def scan_ble_devices(
    timeout: int = Query(10, ge=1, le=60, description="Scan duration in seconds"),
    health_only: bool = Query(True, description="Only return health devices")
):
    """
    Scan for BLE health devices.

    Scans for pulse oximeters, blood pressure monitors, heart rate monitors, etc.

    Args:
        timeout: Scan duration (1-60 seconds)
        health_only: Filter to only health service devices

    Returns:
        List of discovered devices with their types
    """
    bridge = get_bridge()

    if not bridge.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BLE not available. Install bleak: pip install bleak"
        )

    devices = await bridge.scan(
        timeout=float(timeout),
        filter_health_only=health_only
    )

    return {
        "devices": [d.to_dict() for d in devices],
        "count": len(devices),
        "scanDuration": timeout,
    }


@router.post("/ble/connect/{device_address}")
async def connect_ble_device(
    device_address: str,
):
    """
    Connect to a BLE device.

    Must scan for devices first to discover the device.

    Args:
        device_address: Device MAC address (e.g., "AA:BB:CC:DD:EE:FF")

    Returns:
        Connection status
    """
    bridge = get_bridge()

    if not bridge.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BLE not available"
        )

    success = await bridge.connect(device_address)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to {device_address}. Ensure device is discovered and in range."
        )

    return {
        "connected": True,
        "deviceAddress": device_address,
        "message": f"Connected to {device_address}",
    }


@router.post("/ble/disconnect/{device_address}")
async def disconnect_ble_device(
    device_address: str,
):
    """
    Disconnect from a BLE device.

    Args:
        device_address: Device MAC address

    Returns:
        Disconnection status
    """
    bridge = get_bridge()
    success = await bridge.disconnect(device_address)

    return {
        "disconnected": success,
        "deviceAddress": device_address,
    }


@router.post("/ble/disconnect-all")
async def disconnect_all_ble_devices():
    """
    Disconnect from all connected BLE devices.

    Returns:
        Status
    """
    bridge = get_bridge()
    await bridge.disconnect_all()

    return {
        "disconnected": True,
        "message": "All devices disconnected",
    }


@router.get("/ble/discover/{device_address}")
async def discover_device_services(device_address: str):
    """
    Discover all services and characteristics on a connected device.

    Useful for exploring unknown devices before subscribing.

    Args:
        device_address: Device MAC address

    Returns:
        Service and characteristic details
    """
    bridge = get_bridge()
    return await bridge.discover_services(device_address)


@router.post("/ble/capture/start/{device_address}")
async def start_capture(device_address: str):
    """
    Start capturing GATT traffic for protocol analysis.

    Use for reverse-engineering unknown/proprietary devices.

    Args:
        device_address: Connected device MAC address

    Returns:
        Capture status
    """
    bridge = get_bridge()
    success = await bridge.start_capture(device_address)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to start capture. Ensure device is connected."
        )

    return {"capturing": True, "deviceAddress": device_address}


@router.post("/ble/capture/stop")
async def stop_capture():
    """
    Stop capturing GATT traffic.

    Returns:
        Capture session summary
    """
    bridge = get_bridge()
    return await bridge.stop_capture()


@router.post("/ble/capture/analyze")
async def analyze_capture():
    """
    Analyze captured session and extract protocol profile.

    Returns:
        Protocol analysis results
    """
    bridge = get_bridge()
    return await bridge.analyze_capture()


@router.post("/ble/capture/generate-plugin")
async def generate_plugin():
    """
    Generate plugin code from capture analysis.

    Returns:
        Generated plugin Python code
    """
    bridge = get_bridge()
    code = bridge.generate_plugin()
    return {"code": code}


# Global store for WebSocket connections receiving vitals
_vitals_subscribers: set = set()


@router.websocket("/ws/vitals-stream")
async def vitals_stream_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time vitals streaming.

    Connects to BLE devices and streams their measurements in real-time.
    Now powered by eve_peripheral_bridge for unified device connectivity.

    Message Types (Server -> Client):
        - VITALS_READING: { deviceId, deviceType, readings: {...}, timestamp }
        - DEVICE_CONNECTED: { deviceId, deviceName, deviceType }
        - DEVICE_DISCONNECTED: { deviceId }
        - ERROR: { message }

    Message Types (Client -> Server):
        - SCAN: { timeout?: number } - Start BLE scan
        - CONNECT: { deviceAddress: string } - Connect to device
        - DISCONNECT: { deviceAddress: string } - Disconnect from device
        - SUBSCRIBE: { deviceAddress: string } - Start receiving readings
        - CAPTURE_START: { deviceAddress: string } - Start protocol capture
        - CAPTURE_STOP: {} - Stop capture and get results
    """
    import logging
    logger = logging.getLogger(__name__)

    await websocket.accept()
    _vitals_subscribers.add(websocket)

    bridge = get_bridge()

    # Callback for BLE readings - sends to this WebSocket
    def reading_callback(device_id: str, device_type: str, reading: dict):
        asyncio.create_task(_send_reading(websocket, device_id, device_type, reading))

    try:
        # Send initial status
        await websocket.send_json({
            "type": "STATUS",
            "available": bridge.is_available,
            "bleAvailable": bridge.is_available,
            "bleakInstalled": BLEAK_AVAILABLE,
            "message": "BLE ready (eve_peripheral_bridge)" if bridge.is_available else "BLE not available",
            "connectedDevices": bridge.get_connected_devices(),
            "discoveredDevices": bridge.get_discovered_devices(),
        })

        # Message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "").upper()

            if msg_type == "SCAN":
                logger.info(f"[BLE SCAN] Received SCAN request")

                if not bridge.is_available:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "BLE not available"
                    })
                    continue

                timeout = data.get("timeout", 10)
                await websocket.send_json({
                    "type": "SCAN_STARTED",
                    "timeout": timeout
                })

                try:
                    # Use filter_health_only=False for debugging
                    devices = await bridge.scan(timeout=timeout, filter_health_only=False)
                    logger.info(f"[BLE SCAN] Scan complete, found {len(devices)} devices")
                except Exception as scan_error:
                    logger.error(f"[BLE SCAN] Scan failed: {scan_error}")
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": f"Scan failed: {str(scan_error)}"
                    })
                    continue

                await websocket.send_json({
                    "type": "SCAN_COMPLETE",
                    "devices": [d.to_dict() for d in devices],
                    "count": len(devices),
                })

            elif msg_type == "CONNECT":
                device_address = data.get("deviceAddress")
                if not device_address:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "deviceAddress required"
                    })
                    continue

                logger.info(f"[BLE WS] CONNECT request for: {device_address}")
                success = await bridge.connect(device_address)

                if success:
                    devices = bridge.get_connected_devices()
                    device_info = next(
                        (d for d in devices if d["address"] == device_address),
                        {"address": device_address, "name": "Unknown"}
                    )

                    await websocket.send_json({
                        "type": "DEVICE_CONNECTED",
                        "deviceId": device_address,
                        "deviceName": device_info.get("name", "Unknown"),
                        "deviceType": device_info.get("deviceType", "unknown"),
                    })

                    # Auto-discover services for proprietary devices
                    device_type = device_info.get("deviceType", "unknown")
                    if device_type in ("unknown", "pulse_oximeter_quintic", "quintic_device"):
                        discovery_result = await bridge.discover_services(device_address)
                        await websocket.send_json({
                            "type": "DISCOVER_RESULT",
                            "deviceId": device_address,
                            **discovery_result
                        })
                else:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": f"Failed to connect to {device_address}"
                    })

            elif msg_type == "DISCOVER":
                device_address = data.get("deviceAddress")
                if not device_address:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "deviceAddress required"
                    })
                    continue

                discovery_result = await bridge.discover_services(device_address)
                await websocket.send_json({
                    "type": "DISCOVER_RESULT",
                    "deviceId": device_address,
                    **discovery_result
                })

            elif msg_type == "SUBSCRIBE":
                device_address = data.get("deviceAddress")
                if not device_address:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "deviceAddress required"
                    })
                    continue

                success = await bridge.subscribe(device_address, reading_callback)

                await websocket.send_json({
                    "type": "SUBSCRIBE_RESULT",
                    "deviceId": device_address,
                    "subscribed": success,
                })

            elif msg_type == "DISCONNECT":
                device_address = data.get("deviceAddress")
                if device_address:
                    await bridge.disconnect(device_address)
                    await websocket.send_json({
                        "type": "DEVICE_DISCONNECTED",
                        "deviceId": device_address,
                    })

            elif msg_type == "CAPTURE_START":
                device_address = data.get("deviceAddress")
                if not device_address:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "deviceAddress required"
                    })
                    continue

                success = await bridge.start_capture(device_address)
                await websocket.send_json({
                    "type": "CAPTURE_STARTED",
                    "deviceId": device_address,
                    "success": success,
                })

            elif msg_type == "CAPTURE_STOP":
                result = await bridge.stop_capture()
                await websocket.send_json({
                    "type": "CAPTURE_STOPPED",
                    **result
                })

            elif msg_type == "GET_STATUS":
                await websocket.send_json({
                    "type": "STATUS",
                    "available": bridge.is_available,
                    "bleAvailable": bridge.is_available,
                    "bleakInstalled": BLEAK_AVAILABLE,
                    "message": "BLE ready (eve_peripheral_bridge)" if bridge.is_available else "BLE not available",
                    "connectedDevices": bridge.get_connected_devices(),
                    "discoveredDevices": bridge.get_discovered_devices(),
                })

    except Exception:
        pass  # Connection closed or error
    finally:
        _vitals_subscribers.discard(websocket)


async def _send_reading(websocket: WebSocket, device_id: str, device_type: str, reading: dict):
    """Helper to send reading via WebSocket."""
    try:
        await websocket.send_json({
            "type": "VITALS_READING",
            "deviceId": device_id,
            "deviceType": device_type,
            "readings": reading,
            "timestamp": reading.get("timestamp"),
        })
    except Exception:
        pass
