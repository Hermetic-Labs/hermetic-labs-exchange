"""
Pydantic schemas for SAP Connector API
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class SAPAuthType(str, Enum):
    """SAP authentication types"""
    BASIC = "basic"
    SSO = "sso"
    CERTIFICATE = "certificate"


class ODataVersion(str, Enum):
    """OData protocol versions"""
    V2 = "v2"
    V4 = "v4"


class IDocDirection(str, Enum):
    """IDoc direction"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class IDocState(str, Enum):
    """IDoc processing states"""
    CREATED = "created"
    READY = "ready"
    SENT = "sent"
    RECEIVED = "received"
    PROCESSED = "processed"
    ERROR = "error"


# Connection Schemas
class SAPCredentials(BaseModel):
    """SAP authentication credentials"""
    username: str = Field(..., description="SAP username")
    password: str = Field(..., description="SAP password")
    auth_type: SAPAuthType = Field(default=SAPAuthType.BASIC, description="Authentication type")
    certificate_path: Optional[str] = Field(None, description="Path to certificate for cert auth")


class SAPConnectionConfig(BaseModel):
    """SAP connection configuration"""
    host: str = Field(..., description="SAP server hostname")
    system_number: str = Field(..., min_length=2, max_length=2, description="SAP system number")
    client: str = Field(..., min_length=3, max_length=3, description="SAP client number")
    language: str = Field(default="EN", description="Login language")
    pool_size: int = Field(default=5, ge=1, le=50, description="Connection pool size")
    timeout: int = Field(default=30, ge=5, le=300, description="Connection timeout in seconds")


class SAPConnectionResponse(BaseModel):
    """SAP connection response"""
    connected: bool = Field(..., description="Connection status")
    session_id: Optional[str] = Field(None, description="Session identifier")
    system_info: Optional[Dict[str, str]] = Field(None, description="SAP system information")


# RFC Schemas
class RFCParameter(BaseModel):
    """RFC function parameter"""
    name: str = Field(..., description="Parameter name")
    type: str = Field(..., description="Parameter type")
    direction: str = Field(..., description="Parameter direction (import/export/changing/tables)")
    optional: bool = Field(default=False, description="Whether parameter is optional")
    default_value: Optional[Any] = Field(None, description="Default value")
    description: Optional[str] = Field(None, description="Parameter description")


class RFCMetadata(BaseModel):
    """RFC function metadata"""
    name: str = Field(..., description="Function name")
    description: Optional[str] = Field(None, description="Function description")
    import_params: List[RFCParameter] = Field(default_factory=list, description="Import parameters")
    export_params: List[RFCParameter] = Field(default_factory=list, description="Export parameters")
    changing_params: List[RFCParameter] = Field(default_factory=list, description="Changing parameters")
    table_params: List[RFCParameter] = Field(default_factory=list, description="Table parameters")


class RFCCallRequest(BaseModel):
    """RFC function call request"""
    function_name: str = Field(..., description="RFC function name")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Function parameters")
    commit: bool = Field(default=False, description="Auto-commit after call")


class RFCCallResponse(BaseModel):
    """RFC function call response"""
    success: bool = Field(..., description="Call success status")
    export_params: Dict[str, Any] = Field(default_factory=dict, description="Export parameters")
    tables: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Table results")
    messages: List[Dict[str, str]] = Field(default_factory=list, description="Return messages")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")


# BAPI Schemas
class BAPICallRequest(BaseModel):
    """BAPI call request"""
    bapi_name: str = Field(..., description="BAPI name (e.g., BAPI_MATERIAL_GETLIST)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="BAPI parameters")
    auto_commit: bool = Field(default=True, description="Auto-commit transaction")


class BAPIMessage(BaseModel):
    """BAPI return message"""
    type: str = Field(..., description="Message type (S/E/W/I/A)")
    id: str = Field(..., description="Message ID")
    number: str = Field(..., description="Message number")
    message: str = Field(..., description="Message text")
    log_number: Optional[str] = Field(None, description="Log number")
    log_msg_number: Optional[str] = Field(None, description="Log message number")


class BAPICallResponse(BaseModel):
    """BAPI call response"""
    success: bool = Field(..., description="Call success status")
    data: Dict[str, Any] = Field(default_factory=dict, description="Result data")
    tables: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Table results")
    return_messages: List[BAPIMessage] = Field(default_factory=list, description="Return messages")
    committed: bool = Field(default=False, description="Whether transaction was committed")


# OData Schemas
class ODataRequest(BaseModel):
    """OData request"""
    service_path: str = Field(..., description="OData service path")
    entity_set: str = Field(..., description="Entity set name")
    key: Optional[str] = Field(None, description="Entity key for single entity")
    select: Optional[List[str]] = Field(None, description="Fields to select")
    filter: Optional[str] = Field(None, description="OData filter expression")
    expand: Optional[List[str]] = Field(None, description="Navigation properties to expand")
    orderby: Optional[str] = Field(None, description="Order by clause")
    top: Optional[int] = Field(None, ge=1, description="Number of records to return")
    skip: Optional[int] = Field(None, ge=0, description="Number of records to skip")
    count: bool = Field(default=False, description="Include total count")


class ODataResponse(BaseModel):
    """OData response"""
    success: bool = Field(..., description="Request success status")
    data: Any = Field(None, description="Response data")
    count: Optional[int] = Field(None, description="Total count if requested")
    next_link: Optional[str] = Field(None, description="Link to next page")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Response metadata")


class ODataEntityRequest(BaseModel):
    """OData entity create/update request"""
    service_path: str = Field(..., description="OData service path")
    entity_set: str = Field(..., description="Entity set name")
    key: Optional[str] = Field(None, description="Entity key for update")
    data: Dict[str, Any] = Field(..., description="Entity data")


# IDoc Schemas
class IDocSegment(BaseModel):
    """IDoc segment"""
    name: str = Field(..., description="Segment name")
    data: Dict[str, Any] = Field(..., description="Segment data")
    children: List["IDocSegment"] = Field(default_factory=list, description="Child segments")


class IDocType(BaseModel):
    """IDoc type definition"""
    name: str = Field(..., description="IDoc type name")
    description: Optional[str] = Field(None, description="Type description")
    extension: Optional[str] = Field(None, description="IDoc extension type")
    message_type: str = Field(..., description="Associated message type")
    segments: List[Dict[str, Any]] = Field(default_factory=list, description="Segment definitions")


class IDocSendRequest(BaseModel):
    """IDoc send request"""
    idoc_type: str = Field(..., description="IDoc type")
    message_type: str = Field(..., description="Message type")
    receiver_partner: str = Field(..., description="Receiver partner number")
    receiver_port: str = Field(..., description="Receiver port")
    segments: List[IDocSegment] = Field(..., description="IDoc segments")


class IDocSendResponse(BaseModel):
    """IDoc send response"""
    success: bool = Field(..., description="Send success status")
    idoc_number: str = Field(..., description="IDoc number")
    status: IDocState = Field(..., description="IDoc status")
    messages: List[str] = Field(default_factory=list, description="Processing messages")


class IDocStatus(BaseModel):
    """IDoc status"""
    idoc_number: str = Field(..., description="IDoc number")
    idoc_type: str = Field(..., description="IDoc type")
    message_type: str = Field(..., description="Message type")
    direction: IDocDirection = Field(..., description="IDoc direction")
    status: IDocState = Field(..., description="Current status")
    status_text: str = Field(..., description="Status description")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    partner: str = Field(..., description="Partner number")


# Allow forward references
IDocSegment.model_rebuild()
