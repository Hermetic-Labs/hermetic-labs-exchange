"""
FedRAMP Compliance Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class ImpactLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class ControlFamily(str, Enum):
    AC = "AC"  # Access Control
    AT = "AT"  # Awareness and Training
    AU = "AU"  # Audit and Accountability
    CA = "CA"  # Assessment, Authorization, and Monitoring
    CM = "CM"  # Configuration Management
    CP = "CP"  # Contingency Planning
    IA = "IA"  # Identification and Authentication
    IR = "IR"  # Incident Response
    MA = "MA"  # Maintenance
    MP = "MP"  # Media Protection
    PE = "PE"  # Physical and Environmental Protection
    PL = "PL"  # Planning
    PM = "PM"  # Program Management
    PS = "PS"  # Personnel Security
    RA = "RA"  # Risk Assessment
    SA = "SA"  # System and Services Acquisition
    SC = "SC"  # System and Communications Protection
    SI = "SI"  # System and Information Integrity
    SR = "SR"  # Supply Chain Risk Management


class ImplementationStatus(str, Enum):
    IMPLEMENTED = "implemented"
    PARTIALLY_IMPLEMENTED = "partially_implemented"
    PLANNED = "planned"
    ALTERNATIVE = "alternative"
    NOT_APPLICABLE = "not_applicable"


class POAMStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# Control Assessment Schemas
class ControlAssessmentRequest(BaseModel):
    control_id: str = Field(..., description="NIST control ID (e.g., AC-2)")
    implementation: str = Field(..., description="Implementation description")
    responsible_role: Optional[str] = None
    evidence: Optional[List[str]] = None


class ControlAssessmentResponse(BaseModel):
    assessment_id: str
    control_id: str
    status: ImplementationStatus
    gaps: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    assessed_at: datetime


# Control List Schemas
class FedRAMPControl(BaseModel):
    id: str
    family: ControlFamily
    title: str
    description: str
    baseline_impact: List[ImpactLevel]
    parameters: Optional[List[str]] = None


class ControlListResponse(BaseModel):
    controls: List[FedRAMPControl]
    total_count: int
    baseline: ImpactLevel


# POA&M Schemas
class POAMRequest(BaseModel):
    weakness: str = Field(..., description="Weakness description")
    control_id: str
    risk_level: RiskLevel = RiskLevel.MODERATE
    milestone: str
    responsible_party: Optional[str] = None
    scheduled_completion_date: date
    resources_required: Optional[str] = None
    vendor_dependency: bool = False


class POAMResponse(BaseModel):
    id: str
    weakness: str
    control_id: str
    status: POAMStatus
    risk_level: RiskLevel
    milestone: str
    scheduled_completion_date: date
    actual_completion_date: Optional[date] = None
    created_at: datetime


class POAMListResponse(BaseModel):
    items: List[POAMResponse]
    total_count: int
    open_count: int
    overdue_count: int


# Continuous Monitoring Schemas
class ConMonRequest(BaseModel):
    month: str
    year: int
    include_vuln_scan: bool = True
    include_config_scan: bool = True
    include_access_review: bool = False


class VulnerabilitySummary(BaseModel):
    critical: int
    high: int
    moderate: int
    low: int
    total: int


class ConMonResponse(BaseModel):
    report_id: str
    period: str
    vulnerabilities: VulnerabilitySummary
    new_poam_items: int
    closed_poam_items: int
    control_changes: int
    significant_changes: bool
    generated_at: datetime


# SSP Schemas
class SSPSection(BaseModel):
    section_id: str
    title: str
    content: str
    last_updated: datetime
    approved: bool


class SSPResponse(BaseModel):
    system_name: str
    impact_level: ImpactLevel
    authorization_date: Optional[date] = None
    authorization_expiry: Optional[date] = None
    sections: List[SSPSection]
    version: str
