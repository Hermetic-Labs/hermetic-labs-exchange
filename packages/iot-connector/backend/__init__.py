"""
IoT Connector Backend Module

Provides FastAPI routes and services for universal IoT device
discovery, protocol handlers, and workflow automation.
"""

from .routes import router
from .service import IoTService
from .schemas import (
    IoTCredentials,
    IoTConnectionConfig,
    DeviceSpec,
    DeviceEndpoint,
    DeviceCapability,
    SafetyRule,
    DeviceControlRequest,
    DeviceControlResponse,
    DeviceListResponse,
    DiscoveredDevice,
    WorkflowDefinition,
    WorkflowExecutionResult,
)

__all__ = [
    # Router
    "router",
    # Service
    "IoTService",
    # Schemas
    "IoTCredentials",
    "IoTConnectionConfig",
    "DeviceSpec",
    "DeviceEndpoint",
    "DeviceCapability",
    "SafetyRule",
    "DeviceControlRequest",
    "DeviceControlResponse",
    "DeviceListResponse",
    "DiscoveredDevice",
    "WorkflowDefinition",
    "WorkflowExecutionResult",
]
