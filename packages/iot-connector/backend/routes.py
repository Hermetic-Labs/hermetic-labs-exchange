"""
FastAPI routes for IoT Connector

Provides REST API endpoints for universal IoT device
discovery, protocol handlers, and workflow automation.
"""

from typing import Any, Dict, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    IoTCredentials,
    IoTConnectionConfig,
    IoTConnectionResponse,
    DeviceCategory,
    DeviceStatus,
    DeviceProtocol,
    DeviceSpec,
    DiscoveredDevice,
    DeviceListResponse,
    DeviceControlRequest,
    DeviceControlResponse,
    WorkflowDefinition,
    WorkflowExecutionResult,
    SafetyRule,
    DiscoveryScanRequest,
    DiscoveryScanResponse,
)
from .service import IoTService

router = APIRouter(prefix="/iot", tags=["iot"])

# Service instance (in production, use dependency injection)
_service: Optional[IoTService] = None


def get_service() -> IoTService:
    """Dependency to get IoT service instance"""
    global _service
    if _service is None:
        _service = IoTService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=IoTConnectionResponse)
async def connect(
    config: IoTConnectionConfig,
    credentials: Optional[IoTCredentials] = Body(None),
    service: IoTService = Depends(get_service),
) -> IoTConnectionResponse:
    """Establish IoT connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: IoTService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from IoT network"""
    result = await service.disconnect()
    return {"disconnected": result}


# Discovery Endpoints
@router.post("/discover", response_model=DiscoveryScanResponse)
async def discover_devices(
    request: DiscoveryScanRequest = Body(...),
    service: IoTService = Depends(get_service),
) -> DiscoveryScanResponse:
    """Scan network for IoT devices"""
    try:
        return await service.scan_network(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


# Device Endpoints
@router.get("/devices", response_model=DeviceListResponse)
async def get_devices(
    category: Optional[DeviceCategory] = Query(None, description="Filter by category"),
    status: Optional[DeviceStatus] = Query(None, description="Filter by status"),
    service: IoTService = Depends(get_service),
) -> DeviceListResponse:
    """Get list of discovered devices"""
    try:
        return await service.get_devices(category, status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get devices: {str(e)}")


@router.get("/devices/{device_id}", response_model=DiscoveredDevice)
async def get_device(
    device_id: str = Path(..., description="Device identifier"),
    service: IoTService = Depends(get_service),
) -> DiscoveredDevice:
    """Get device by ID"""
    device = await service.get_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device not found: {device_id}")
    return device


@router.post("/devices", response_model=DiscoveredDevice)
async def register_device(
    spec: DeviceSpec = Body(...),
    service: IoTService = Depends(get_service),
) -> DiscoveredDevice:
    """Register a device with specification"""
    try:
        return await service.register_device(spec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register device: {str(e)}")


# Control Endpoints
@router.post("/control", response_model=DeviceControlResponse)
async def execute_control(
    request: DeviceControlRequest = Body(...),
    service: IoTService = Depends(get_service),
) -> DeviceControlResponse:
    """Execute device control command"""
    try:
        return await service.execute_control(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Control failed: {str(e)}")


@router.post("/devices/{device_id}/control", response_model=DeviceControlResponse)
async def control_device(
    device_id: str = Path(..., description="Device identifier"),
    capability: str = Query(..., description="Capability to execute"),
    parameters: Dict[str, Any] = Body(default={}),
    service: IoTService = Depends(get_service),
) -> DeviceControlResponse:
    """Execute control command on specific device"""
    request = DeviceControlRequest(
        device_id=device_id,
        capability=capability,
        parameters=parameters,
    )
    try:
        return await service.execute_control(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Control failed: {str(e)}")


# Workflow Endpoints
@router.post("/workflows", response_model=WorkflowDefinition)
async def create_workflow(
    workflow: WorkflowDefinition = Body(...),
    service: IoTService = Depends(get_service),
) -> WorkflowDefinition:
    """Create or update workflow"""
    try:
        return await service.create_workflow(workflow)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")


@router.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecutionResult)
async def execute_workflow(
    workflow_id: str = Path(..., description="Workflow identifier"),
    service: IoTService = Depends(get_service),
) -> WorkflowExecutionResult:
    """Execute workflow"""
    try:
        return await service.execute_workflow(workflow_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


# Safety Rules Endpoints
@router.get("/safety-rules", response_model=List[SafetyRule])
async def get_safety_rules(
    service: IoTService = Depends(get_service),
) -> List[SafetyRule]:
    """Get all safety rules"""
    return service.get_safety_rules()


@router.post("/safety-rules", response_model=SafetyRule)
async def add_safety_rule(
    rule: SafetyRule = Body(...),
    service: IoTService = Depends(get_service),
) -> SafetyRule:
    """Add safety rule"""
    service.add_safety_rule(rule)
    return rule


@router.delete("/safety-rules/{rule_id}")
async def remove_safety_rule(
    rule_id: str = Path(..., description="Rule identifier"),
    service: IoTService = Depends(get_service),
) -> Dict[str, bool]:
    """Remove safety rule"""
    result = service.remove_safety_rule(rule_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Rule not found: {rule_id}")
    return {"deleted": True}
