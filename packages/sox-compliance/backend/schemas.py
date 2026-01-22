"""
SOX Compliance Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class ControlType(str, Enum):
    PREVENTIVE = "preventive"
    DETECTIVE = "detective"
    CORRECTIVE = "corrective"


class ControlFrequency(str, Enum):
    CONTINUOUS = "continuous"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"


class TestResult(str, Enum):
    EFFECTIVE = "effective"
    INEFFECTIVE = "ineffective"
    NOT_TESTED = "not_tested"


class DeficiencySeverity(str, Enum):
    CONTROL_DEFICIENCY = "control_deficiency"
    SIGNIFICANT_DEFICIENCY = "significant_deficiency"
    MATERIAL_WEAKNESS = "material_weakness"


class ControlStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"


# Control Schemas
class ControlRequest(BaseModel):
    name: str = Field(..., description="Control name")
    description: Optional[str] = None
    control_type: ControlType
    frequency: ControlFrequency
    owner_id: str
    process_area: str
    assertion: Optional[List[str]] = None  # Existence, Completeness, etc.
    automation_level: str = Field(default="manual")


class ControlResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    control_type: ControlType
    frequency: ControlFrequency
    owner_id: str
    process_area: str
    status: ControlStatus
    created_at: datetime
    last_tested: Optional[datetime] = None


class ControlListResponse(BaseModel):
    controls: List[ControlResponse]
    total_count: int
    page: int
    page_size: int


# Control Test Schemas
class ControlTestRequest(BaseModel):
    control_id: str
    test_date: date
    tester_id: str
    result: TestResult
    sample_size: Optional[int] = None
    exceptions_found: int = 0
    evidence: Optional[List[str]] = None
    notes: Optional[str] = None


class ControlTestResponse(BaseModel):
    id: str
    control_id: str
    test_date: date
    tester_id: str
    result: TestResult
    exceptions_found: int
    created_at: datetime


# SOD Check Schemas
class SODCheckRequest(BaseModel):
    user_id: str
    proposed_role: str
    check_existing: bool = True


class SODConflict(BaseModel):
    conflicting_role: str
    risk_level: str
    description: str


class SODCheckResponse(BaseModel):
    has_conflicts: bool
    conflicts: List[SODConflict]
    user_id: str
    proposed_role: str
    checked_at: datetime


# Deficiency Schemas
class DeficiencyRequest(BaseModel):
    control_id: str
    description: str
    severity: DeficiencySeverity
    identified_date: date
    identified_by: str
    root_cause: Optional[str] = None
    remediation_plan: Optional[str] = None
    target_remediation_date: Optional[date] = None


class DeficiencyResponse(BaseModel):
    id: str
    control_id: str
    description: str
    severity: DeficiencySeverity
    status: str
    identified_date: date
    target_remediation_date: Optional[date] = None
    created_at: datetime


# Audit Trail Schemas
class AuditTrailEntry(BaseModel):
    id: str
    timestamp: datetime
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class AuditTrailResponse(BaseModel):
    entries: List[AuditTrailEntry]
    total_count: int
    page: int
    page_size: int
