"""
HIPAA Privacy Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PHICategory(str, Enum):
    NAME = "name"
    SSN = "ssn"
    DOB = "date_of_birth"
    ADDRESS = "address"
    PHONE = "phone"
    EMAIL = "email"
    MRN = "medical_record_number"
    INSURANCE_ID = "insurance_id"
    BIOMETRIC = "biometric"
    PHOTO = "photo"


class AccessPurpose(str, Enum):
    TREATMENT = "treatment"
    PAYMENT = "payment"
    OPERATIONS = "operations"
    RESEARCH = "research"
    EMERGENCY = "emergency"


class BreachSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# PHI Detection Schemas
class PHIDetectionRequest(BaseModel):
    text: str = Field(..., description="Text to scan for PHI")
    categories: Optional[List[PHICategory]] = None
    include_confidence: bool = True


class PHIEntity(BaseModel):
    text: str
    category: PHICategory
    start_index: int
    end_index: int
    confidence: float


class PHIDetectionResponse(BaseModel):
    entities: List[PHIEntity]
    phi_detected: bool
    scan_timestamp: datetime


# PHI Masking Schemas
class PHIMaskRequest(BaseModel):
    text: str = Field(..., description="Text containing PHI to mask")
    mask_char: str = Field(default="*", max_length=1)
    categories: Optional[List[PHICategory]] = None
    preserve_format: bool = True


class PHIMaskResponse(BaseModel):
    masked_text: str
    entities_masked: int
    original_length: int


# Access Validation Schemas
class AccessValidationRequest(BaseModel):
    user_id: str
    resource_type: str
    resource_id: Optional[str] = None
    purpose: AccessPurpose
    minimum_necessary: bool = True


class AccessValidationResponse(BaseModel):
    allowed: bool
    reason: Optional[str] = None
    restrictions: Optional[List[str]] = None
    audit_id: str


# Audit Log Schemas
class AuditLogEntry(BaseModel):
    id: str
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    purpose: Optional[AccessPurpose] = None
    success: bool
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    entries: List[AuditLogEntry]
    total_count: int
    page: int
    page_size: int


# Breach Notification Schemas
class BreachReportRequest(BaseModel):
    description: str
    affected_records: int
    phi_types: List[PHICategory]
    discovery_date: datetime
    severity: BreachSeverity
    containment_actions: Optional[List[str]] = None


class BreachReportResponse(BaseModel):
    report_id: str
    status: str
    notification_required: bool
    notification_deadline: Optional[datetime] = None
    created_at: datetime
