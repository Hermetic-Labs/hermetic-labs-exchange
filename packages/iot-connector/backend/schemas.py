"""
Pydantic schemas for IoT Connector API
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class DeviceCategory(str, Enum):
    """Device category classification"""
    MEDICAL = "medical"
    PERSONAL = "personal"
    INFRASTRUCTURE = "infrastructure"
    SENSOR = "sensor"


class DeviceProtocol(str, Enum):
    """Device communication protocol"""
    HTTP = "http"
    BLUETOOTH = "bluetooth"
    WEBSOCKET = "websocket"
    LOCAL = "local"
    MQTT = "mqtt"
    COAP = "coap"


class DeviceStatus(str, Enum):
    """Device connection status"""
    ONLINE = "online"
    OFFLINE = "offline"
    UNREACHABLE = "unreachable"
    ERROR = "error"


class SafetyLevel(str, Enum):
    """Safety rule severity level"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CommandPriority(str, Enum):
    """Command execution priority"""
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    EMERGENCY = "emergency"


# Connection Schemas
class IoTCredentials(BaseModel):
    """IoT connection credentials"""
    api_key: Optional[str] = Field(None, description="API key for cloud services")
    username: Optional[str] = Field(None, description="Username for authentication")
    password: Optional[str] = Field(None, description="Password for authentication")
    certificate: Optional[str] = Field(None, description="Client certificate")


class IoTConnectionConfig(BaseModel):
    """IoT connection configuration"""
    protocol: DeviceProtocol = Field(default=DeviceProtocol.HTTP, description="Communication protocol")
    base_url: Optional[str] = Field(None, description="Base URL for HTTP/WebSocket")
    broker_url: Optional[str] = Field(None, description="MQTT broker URL")
    port: int = Field(default=1883, description="Connection port")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    ssl: bool = Field(default=False, description="Use SSL/TLS")


class IoTConnectionResponse(BaseModel):
    """IoT connection response"""
    connected: bool
    protocol: DeviceProtocol
    devices_discovered: int


# Device Schemas
class DeviceEndpoint(BaseModel):
    """Device API endpoint definition"""
    name: str
    method: str = Field(default="GET", description="HTTP method")
    path: str
    parameters: List[Dict[str, Any]] = Field(default_factory=list)
    response_format: str = Field(default="json")
    timeout: int = Field(default=30)


class DeviceCapability(BaseModel):
    """Device capability definition"""
    name: str
    type: str = Field(description="control, monitor, sensor, or actuator")
    parameters: List[Dict[str, Any]] = Field(default_factory=list)
    return_type: str
    description: str
    requires_permissions: List[str] = Field(default_factory=list)


class SafetyRule(BaseModel):
    """Device safety rule"""
    id: str
    name: str
    type: str = Field(description="range_check, whitelist, blacklist, pattern, emergency")
    rule: Dict[str, Any]
    severity: SafetyLevel = SafetyLevel.MEDIUM
    enabled: bool = True
    description: str
    hospital_specific: bool = False


class NetworkConfig(BaseModel):
    """Device network configuration"""
    base_url: Optional[str] = None
    port: Optional[int] = None
    ssl: bool = False
    timeout: int = 30
    local_network: bool = True


class DeviceSpec(BaseModel):
    """Complete device specification"""
    device_id: str
    name: str
    type: str
    category: DeviceCategory = DeviceCategory.PERSONAL
    protocol: DeviceProtocol = DeviceProtocol.HTTP
    endpoints: List[DeviceEndpoint] = Field(default_factory=list)
    capabilities: List[DeviceCapability] = Field(default_factory=list)
    safety_rules: List[SafetyRule] = Field(default_factory=list)
    medical_override: bool = False
    network_config: Optional[NetworkConfig] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DiscoveredDevice(BaseModel):
    """Discovered device information"""
    device_id: str
    name: str
    type: str
    category: DeviceCategory
    protocol: DeviceProtocol
    capabilities: List[str] = Field(default_factory=list)
    status: DeviceStatus = DeviceStatus.ONLINE
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    firmware_version: Optional[str] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)


class DeviceListResponse(BaseModel):
    """List of devices response"""
    devices: List[DiscoveredDevice]
    total: int
    online_count: int
    offline_count: int


# Control Schemas
class DeviceControlRequest(BaseModel):
    """Device control request"""
    device_id: str
    capability: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timeout: int = Field(default=30, ge=1, le=300)
    priority: CommandPriority = CommandPriority.NORMAL


class DeviceControlResponse(BaseModel):
    """Device control response"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float
    device_id: str
    capability: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Workflow Schemas
class WorkflowStep(BaseModel):
    """Workflow step definition"""
    step_id: str
    device_id: str
    capability: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    condition: Optional[str] = None
    delay_ms: int = 0


class WorkflowDefinition(BaseModel):
    """Workflow definition"""
    workflow_id: str
    name: str
    description: str
    steps: List[WorkflowStep]
    trigger: Optional[Dict[str, Any]] = None
    enabled: bool = True


class WorkflowExecutionResult(BaseModel):
    """Workflow execution result"""
    workflow_id: str
    success: bool
    steps_executed: int
    steps_failed: int
    results: List[DeviceControlResponse]
    total_execution_time: float
    started_at: datetime
    completed_at: datetime


# Discovery Schemas
class DiscoveryScanRequest(BaseModel):
    """Device discovery scan request"""
    protocols: List[str] = Field(default=["mdns", "ssdp"])
    timeout: int = Field(default=5000, ge=1000, le=60000, description="Scan timeout in ms")
    include_offline: bool = False


class DiscoveryScanResponse(BaseModel):
    """Device discovery scan response"""
    devices: List[DiscoveredDevice]
    scan_duration_ms: int
    protocols_scanned: List[str]
