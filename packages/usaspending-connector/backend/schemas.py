"""
Pydantic schemas for USASpending Connector API
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class AwardType(str, Enum):
    """Award type classification"""
    CONTRACT = "contract"
    GRANT = "grant"
    LOAN = "loan"
    DIRECT_PAYMENT = "direct_payment"
    OTHER = "other"


class AwardCategory(str, Enum):
    """Award category"""
    CONTRACTS = "contracts"
    GRANTS = "grants"
    LOANS = "loans"
    DIRECT_PAYMENTS = "direct_payments"
    OTHER_FINANCIAL_ASSISTANCE = "other_financial_assistance"


class SpendingType(str, Enum):
    """Spending type"""
    OBLIGATION = "obligation"
    OUTLAY = "outlay"


# Connection Schemas
class USASpendingConnectionConfig(BaseModel):
    """USASpending connection configuration"""
    base_url: str = Field(default="https://api.usaspending.gov", description="USASpending API base URL")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")


class USASpendingConnectionResponse(BaseModel):
    """USASpending connection response"""
    connected: bool
    base_url: str
    api_version: str


# Location Schemas
class LocationInfo(BaseModel):
    """Location information"""
    state_code: Optional[str] = None
    state_name: Optional[str] = None
    county_code: Optional[str] = None
    county_name: Optional[str] = None
    congressional_district: Optional[str] = None
    city_name: Optional[str] = None
    zip_code: Optional[str] = None
    country_code: str = "USA"
    country_name: str = "United States"


# Award Schemas
class AwardResponse(BaseModel):
    """Award details response"""
    award_id: str = Field(..., description="Unique award identifier")
    generated_unique_award_id: str
    piid: Optional[str] = Field(None, description="Procurement Instrument Identifier")
    fain: Optional[str] = Field(None, description="Federal Award Identification Number")
    uri: Optional[str] = None
    award_type: AwardType
    award_type_description: Optional[str] = None
    category: AwardCategory
    description: Optional[str] = None
    total_obligation: float = 0.0
    total_outlay: Optional[float] = None
    base_and_all_options_value: Optional[float] = None
    awarding_agency_name: Optional[str] = None
    awarding_agency_code: Optional[str] = None
    awarding_sub_agency_name: Optional[str] = None
    funding_agency_name: Optional[str] = None
    funding_agency_code: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_uei: Optional[str] = None
    recipient_location: Optional[LocationInfo] = None
    place_of_performance: Optional[LocationInfo] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    last_modified_date: Optional[date] = None
    fiscal_year: Optional[int] = None
    naics_code: Optional[str] = None
    naics_description: Optional[str] = None
    psc_code: Optional[str] = None
    psc_description: Optional[str] = None
    cfda_number: Optional[str] = None
    cfda_title: Optional[str] = None


class AwardListResponse(BaseModel):
    """List of awards response"""
    awards: List[AwardResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class AwardSearchRequest(BaseModel):
    """Award search parameters"""
    keywords: Optional[List[str]] = None
    award_type: Optional[AwardType] = None
    category: Optional[AwardCategory] = None
    awarding_agency_code: Optional[str] = None
    funding_agency_code: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_uei: Optional[str] = None
    state_code: Optional[str] = None
    county_code: Optional[str] = None
    congressional_district: Optional[str] = None
    naics_code: Optional[str] = None
    psc_code: Optional[str] = None
    cfda_number: Optional[str] = None
    fiscal_year: Optional[int] = None
    start_date_from: Optional[date] = None
    start_date_to: Optional[date] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)


# Agency Spending Schemas
class SubAgencySpending(BaseModel):
    """Sub-agency spending breakdown"""
    sub_agency_name: str
    sub_agency_code: Optional[str] = None
    total_obligations: float = 0.0
    total_outlays: Optional[float] = None
    award_count: int = 0


class AgencySpendingResponse(BaseModel):
    """Agency spending response"""
    agency_name: str
    agency_code: str
    fiscal_year: int
    total_obligations: float = 0.0
    total_outlays: Optional[float] = None
    total_budgetary_resources: Optional[float] = None
    award_count: int = 0
    sub_agencies: List[SubAgencySpending] = Field(default_factory=list)
    by_award_type: Dict[str, float] = Field(default_factory=dict)


class AgencySpendingRequest(BaseModel):
    """Agency spending request parameters"""
    agency_code: str = Field(..., description="Agency code (e.g., '097' for DOD)")
    fiscal_year: Optional[int] = None
    include_sub_agencies: bool = True


# Recipient Schemas
class RecipientResponse(BaseModel):
    """Recipient details response"""
    recipient_id: str
    recipient_hash: str
    uei: Optional[str] = None
    duns: Optional[str] = None
    name: str
    parent_name: Optional[str] = None
    parent_uei: Optional[str] = None
    recipient_level: str = "R"  # R=Recipient, P=Parent, C=Child
    location: Optional[LocationInfo] = None
    business_types: List[str] = Field(default_factory=list)
    total_transaction_amount: float = 0.0
    total_awards: int = 0


class RecipientListResponse(BaseModel):
    """List of recipients response"""
    recipients: List[RecipientResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class RecipientSearchRequest(BaseModel):
    """Recipient search parameters"""
    query: Optional[str] = None
    uei: Optional[str] = None
    name: Optional[str] = None
    state_code: Optional[str] = None
    recipient_level: Optional[str] = None
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)


# Geographic Spending Schemas
class StateSpending(BaseModel):
    """State-level spending"""
    state_code: str
    state_name: str
    total_obligations: float = 0.0
    total_outlays: Optional[float] = None
    award_count: int = 0
    per_capita: Optional[float] = None


class CountySpending(BaseModel):
    """County-level spending"""
    county_code: str
    county_name: str
    state_code: str
    total_obligations: float = 0.0
    award_count: int = 0


class GeographicSpendingResponse(BaseModel):
    """Geographic spending response"""
    fiscal_year: Optional[int] = None
    scope: str = "state"  # state, county, congressional_district
    results: List[Dict[str, Any]] = Field(default_factory=list)
    total_obligations: float = 0.0


class GeographicSpendingRequest(BaseModel):
    """Geographic spending request parameters"""
    scope: str = "state"
    fiscal_year: Optional[int] = None
    agency_code: Optional[str] = None
    award_type: Optional[AwardType] = None
    state_code: Optional[str] = None  # Required for county scope


# Fiscal Year Schemas
class FiscalYearSpendingResponse(BaseModel):
    """Fiscal year spending summary"""
    fiscal_year: int
    total_obligations: float = 0.0
    total_outlays: Optional[float] = None
    total_budgetary_resources: Optional[float] = None
    award_count: int = 0
    by_award_type: Dict[str, float] = Field(default_factory=dict)
    by_agency: Dict[str, float] = Field(default_factory=dict)
    monthly_data: List[Dict[str, Any]] = Field(default_factory=list)
