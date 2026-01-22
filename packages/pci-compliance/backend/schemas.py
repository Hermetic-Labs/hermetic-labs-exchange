"""
PCI DSS Compliance Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SAQType(str, Enum):
    A = "A"
    A_EP = "A-EP"
    B = "B"
    B_IP = "B-IP"
    C = "C"
    C_VT = "C-VT"
    D = "D"
    P2PE = "P2PE"


class ComplianceStatus(str, Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIAL = "partial"
    NOT_APPLICABLE = "not_applicable"


class RequirementCategory(str, Enum):
    NETWORK_SECURITY = "network_security"
    DATA_PROTECTION = "data_protection"
    VULNERABILITY_MGMT = "vulnerability_management"
    ACCESS_CONTROL = "access_control"
    MONITORING = "monitoring"
    SECURITY_POLICY = "security_policy"


class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# PAN Validation Schemas
class PANValidationRequest(BaseModel):
    pan: str = Field(..., description="Primary Account Number to validate")
    check_luhn: bool = True
    identify_issuer: bool = True


class PANValidationResponse(BaseModel):
    valid: bool
    issuer: Optional[str] = None
    card_type: Optional[str] = None
    masked_pan: str


# PAN Masking Schemas
class PANMaskRequest(BaseModel):
    pan: str = Field(..., description="PAN to mask")
    visible_first: int = Field(default=6, ge=0, le=6)
    visible_last: int = Field(default=4, ge=0, le=4)
    mask_char: str = Field(default="*", max_length=1)


class PANMaskResponse(BaseModel):
    masked_pan: str
    original_length: int


# Assessment Schemas
class AssessmentRequest(BaseModel):
    saq_type: SAQType
    requirements: Optional[List[str]] = None
    include_evidence: bool = False


class RequirementResult(BaseModel):
    requirement_id: str
    description: str
    status: ComplianceStatus
    findings: Optional[List[str]] = None
    remediation: Optional[str] = None


class AssessmentResponse(BaseModel):
    assessment_id: str
    saq_type: SAQType
    overall_status: ComplianceStatus
    requirements: List[RequirementResult]
    compliant_count: int
    non_compliant_count: int
    completed_at: datetime


# Requirements Schemas
class PCIRequirement(BaseModel):
    id: str
    category: RequirementCategory
    title: str
    description: str
    sub_requirements: Optional[List[str]] = None


class RequirementsResponse(BaseModel):
    requirements: List[PCIRequirement]
    total_count: int
    version: str = "4.0"


# Vulnerability Scan Schemas
class ScanRequest(BaseModel):
    target: str = Field(..., description="Target to scan (IP, domain, or range)")
    scan_type: str = Field(default="external")
    asv_scan: bool = False


class Vulnerability(BaseModel):
    id: str
    severity: str
    cvss_score: Optional[float] = None
    title: str
    description: str
    remediation: Optional[str] = None


class ScanResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    target: str
    vulnerabilities: Optional[List[Vulnerability]] = None
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    started_at: datetime
    completed_at: Optional[datetime] = None
