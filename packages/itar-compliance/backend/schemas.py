"""
ITAR Compliance Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class USMLCategory(str, Enum):
    I = "I"      # Firearms
    II = "II"    # Guns and Armament
    III = "III"  # Ammunition/Ordnance
    IV = "IV"    # Launch Vehicles
    V = "V"      # Explosives
    VI = "VI"    # Surface Vessels
    VII = "VII"  # Ground Vehicles
    VIII = "VIII"  # Aircraft
    IX = "IX"    # Military Training Equipment
    X = "X"      # Personal Protective Equipment
    XI = "XI"    # Military Electronics
    XII = "XII"  # Fire Control
    XIII = "XIII"  # Materials
    XIV = "XIV"  # Toxicological Agents
    XV = "XV"    # Spacecraft
    XVI = "XVI"  # Nuclear Weapons
    XVII = "XVII"  # Classified Articles
    XVIII = "XVIII"  # Directed Energy Weapons
    XIX = "XIX"  # Gas Turbine Engines
    XX = "XX"    # Submersible Vessels
    XXI = "XXI"  # Miscellaneous


class LicenseType(str, Enum):
    DSP_5 = "DSP-5"      # Permanent export
    DSP_61 = "DSP-61"    # Temporary import
    DSP_73 = "DSP-73"    # Temporary export
    DSP_85 = "DSP-85"    # Amendment
    TAA = "TAA"          # Technical Assistance Agreement
    MLA = "MLA"          # Manufacturing License Agreement


class LicenseStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"


class ScreeningResult(str, Enum):
    CLEAR = "clear"
    MATCH = "match"
    POTENTIAL_MATCH = "potential_match"
    REVIEW_REQUIRED = "review_required"


class DataClassification(str, Enum):
    UNCLASSIFIED = "unclassified"
    CUI = "cui"  # Controlled Unclassified Information
    ITAR_CONTROLLED = "itar_controlled"


# Classification Schemas
class ClassificationRequest(BaseModel):
    item_description: str = Field(..., description="Description of the item")
    technical_specs: Optional[Dict[str, Any]] = None
    intended_use: Optional[str] = None
    manufacturer: Optional[str] = None


class ClassificationResponse(BaseModel):
    classification_id: str
    usml_category: Optional[USMLCategory] = None
    is_itar_controlled: bool
    jurisdiction: str  # ITAR, EAR, or dual
    rationale: str
    confidence: float
    classified_at: datetime


# Foreign Person Screening Schemas
class ScreeningRequest(BaseModel):
    name: str
    nationality: str
    organization: Optional[str] = None
    email: Optional[str] = None
    check_denied_parties: bool = True
    check_sanctions: bool = True


class DeniedPartyMatch(BaseModel):
    list_name: str
    matched_name: str
    match_score: float
    source: str


class ScreeningResponse(BaseModel):
    screening_id: str
    result: ScreeningResult
    name: str
    nationality: str
    denied_party_matches: Optional[List[DeniedPartyMatch]] = None
    sanctions_matches: Optional[List[str]] = None
    screened_at: datetime


# Export License Schemas
class LicenseItem(BaseModel):
    description: str
    quantity: int
    value_usd: Optional[float] = None
    usml_category: Optional[USMLCategory] = None


class LicenseRequest(BaseModel):
    license_type: LicenseType = LicenseType.DSP_5
    usml_category: USMLCategory
    end_user: str
    destination_country: str
    items: List[LicenseItem]
    end_use_statement: Optional[str] = None
    supporting_documents: Optional[List[str]] = None


class LicenseResponse(BaseModel):
    id: str
    license_type: LicenseType
    status: LicenseStatus
    usml_category: USMLCategory
    end_user: str
    destination_country: str
    submitted_date: Optional[date] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    created_at: datetime


class LicenseListResponse(BaseModel):
    licenses: List[LicenseResponse]
    total_count: int
    active_count: int
    pending_count: int


# Technical Data Control Schemas
class TechnicalDataRequest(BaseModel):
    data_description: str
    data_classification: DataClassification
    access_requested_by: str
    purpose: str


class TechnicalDataResponse(BaseModel):
    access_id: str
    approved: bool
    data_classification: DataClassification
    restrictions: Optional[List[str]] = None
    expiry_date: Optional[date] = None
    reviewed_at: datetime


# Audit Schemas
class AuditEntry(BaseModel):
    id: str
    timestamp: datetime
    action: str
    user_id: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = None


class AuditReportResponse(BaseModel):
    report_id: str
    period_start: date
    period_end: date
    entries: List[AuditEntry]
    total_classifications: int
    total_screenings: int
    total_license_activities: int
    generated_at: datetime
