"""
Pydantic schemas for SAM.gov Connector API
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class EntityStatus(str, Enum):
    """Entity registration status"""
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    EXPIRED = "Expired"


class EntityType(str, Enum):
    """Entity type classification"""
    BUSINESS = "Business"
    GOVERNMENT = "Government"
    INDIVIDUAL = "Individual"


class ExclusionType(str, Enum):
    """Exclusion type classification"""
    INELIGIBLE = "Ineligible"
    PROHIBITED = "Prohibited"
    VOLUNTARY = "Voluntary"


class SetAsideType(str, Enum):
    """Set-aside type for opportunities"""
    SMALL_BUSINESS = "SBA"
    WOSB = "WOSB"
    HUBZONE = "HUBZone"
    SDVOSB = "SDVOSB"
    EIGHT_A = "8(a)"
    NONE = "None"


# Connection Schemas
class SAMGovCredentials(BaseModel):
    """SAM.gov authentication credentials"""
    api_key: str = Field(..., description="SAM.gov API key")


class SAMGovConnectionConfig(BaseModel):
    """SAM.gov connection configuration"""
    base_url: str = Field(default="https://api.sam.gov", description="SAM.gov API base URL")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")


class SAMGovConnectionResponse(BaseModel):
    """SAM.gov connection response"""
    connected: bool
    base_url: str
    api_version: str


# Entity Schemas
class AddressInfo(BaseModel):
    """Address information"""
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "USA"


class EntityResponse(BaseModel):
    """Entity details response"""
    uei: str = Field(..., description="Unique Entity Identifier")
    cage_code: Optional[str] = Field(None, description="CAGE Code")
    legal_business_name: str
    dba_name: Optional[str] = None
    entity_type: EntityType = EntityType.BUSINESS
    status: EntityStatus = EntityStatus.ACTIVE
    registration_date: Optional[date] = None
    expiration_date: Optional[date] = None
    physical_address: Optional[AddressInfo] = None
    mailing_address: Optional[AddressInfo] = None
    naics_codes: List[str] = Field(default_factory=list)
    psc_codes: List[str] = Field(default_factory=list)
    sam_extract_code: Optional[str] = None
    exclusion_status: bool = False


class EntityListResponse(BaseModel):
    """List of entities response"""
    entities: List[EntityResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class EntitySearchRequest(BaseModel):
    """Entity search parameters"""
    query: Optional[str] = None
    uei: Optional[str] = None
    cage_code: Optional[str] = None
    legal_business_name: Optional[str] = None
    status: Optional[EntityStatus] = None
    entity_type: Optional[EntityType] = None
    state: Optional[str] = None
    naics_code: Optional[str] = None
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)


# Exclusion Schemas
class ExclusionResponse(BaseModel):
    """Exclusion record response"""
    id: str
    name: str
    uei: Optional[str] = None
    cage_code: Optional[str] = None
    exclusion_type: ExclusionType
    exclusion_program: str
    excluding_agency: str
    ct_code: Optional[str] = None
    exclusion_date: date
    termination_date: Optional[date] = None
    active: bool = True
    sam_number: Optional[str] = None
    description: Optional[str] = None


class ExclusionListResponse(BaseModel):
    """List of exclusions response"""
    exclusions: List[ExclusionResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class ExclusionSearchRequest(BaseModel):
    """Exclusion search parameters"""
    name: Optional[str] = None
    uei: Optional[str] = None
    cage_code: Optional[str] = None
    exclusion_type: Optional[ExclusionType] = None
    excluding_agency: Optional[str] = None
    active_only: bool = True
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)


# Opportunity Schemas
class OpportunityResponse(BaseModel):
    """Contract opportunity response"""
    notice_id: str
    title: str
    solicitation_number: Optional[str] = None
    department: Optional[str] = None
    agency: Optional[str] = None
    office: Optional[str] = None
    posted_date: Optional[date] = None
    response_deadline: Optional[datetime] = None
    archive_date: Optional[date] = None
    set_aside: Optional[SetAsideType] = None
    naics_code: Optional[str] = None
    classification_code: Optional[str] = None
    place_of_performance: Optional[AddressInfo] = None
    description: Optional[str] = None
    url: Optional[str] = None
    active: bool = True


class OpportunityListResponse(BaseModel):
    """List of opportunities response"""
    opportunities: List[OpportunityResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class OpportunitySearchRequest(BaseModel):
    """Opportunity search parameters"""
    query: Optional[str] = None
    agency: Optional[str] = None
    naics_code: Optional[str] = None
    set_aside: Optional[SetAsideType] = None
    posted_from: Optional[date] = None
    posted_to: Optional[date] = None
    active_only: bool = True
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)
