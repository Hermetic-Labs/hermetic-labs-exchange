"""
Pydantic schemas for Westlaw Connector API
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Legal document type"""
    CASE = "cases"
    STATUTE = "statutes"
    REGULATION = "regulations"
    SECONDARY = "secondary"
    BRIEF = "briefs"
    TRIAL_COURT = "trial_court"
    FORMS = "forms"


class Jurisdiction(str, Enum):
    """Legal jurisdiction"""
    US_FED = "US-FED"
    US_STATE = "US-STATE"
    US_ALL = "US-ALL"
    UK = "UK"
    CA = "CA"
    AU = "AU"


class KeyCiteStatus(str, Enum):
    """KeyCite validation status"""
    GOOD = "good"
    CAUTION = "caution"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"


class TreatmentType(str, Enum):
    """Case treatment type"""
    FOLLOWED = "followed"
    DISTINGUISHED = "distinguished"
    CITED = "cited"
    OVERRULED = "overruled"
    REVERSED = "reversed"
    QUESTIONED = "questioned"


class SortOrder(str, Enum):
    """Search result sort order"""
    RELEVANCE = "relevance"
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    CITATION = "citation"
    COURT_RANK = "court_rank"


# Connection Schemas
class WestlawCredentials(BaseModel):
    """Westlaw authentication credentials"""
    api_key: str = Field(..., description="Westlaw API key")
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: Optional[str] = Field(None, description="OAuth client secret")


class WestlawConnectionConfig(BaseModel):
    """Westlaw connection configuration"""
    base_url: str = Field(default="https://api.westlaw.com", description="Westlaw API base URL")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")
    cache_dir: Optional[str] = Field(None, description="Local cache directory")


class WestlawConnectionResponse(BaseModel):
    """Westlaw connection response"""
    connected: bool
    base_url: str
    api_version: str
    token_expires_at: Optional[datetime] = None


# Citation Schemas
class LegalCitation(BaseModel):
    """Legal citation"""
    cite: str
    title: str
    court: str
    date: str
    jurisdiction: str
    parallel_citations: List[str] = Field(default_factory=list)
    reporter_volume: Optional[str] = None
    reporter_page: Optional[str] = None
    reporter: Optional[str] = None


class Headnote(BaseModel):
    """Case headnote"""
    number: int
    text: str
    key_numbers: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)


class KeyNumber(BaseModel):
    """West Key Number"""
    number: str
    topic: str
    description: str
    hierarchy: List[str] = Field(default_factory=list)


# Document Schemas
class DocumentResponse(BaseModel):
    """Legal document response"""
    document_id: str
    title: str
    document_type: DocumentType
    citation: Optional[LegalCitation] = None
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_decided: Optional[str] = None
    date_filed: Optional[str] = None
    judges: List[str] = Field(default_factory=list)
    parties: List[str] = Field(default_factory=list)
    attorneys: List[str] = Field(default_factory=list)
    headnotes: List[Headnote] = Field(default_factory=list)
    key_numbers: List[KeyNumber] = Field(default_factory=list)
    synopsis: Optional[str] = None
    full_text: Optional[str] = None
    word_count: Optional[int] = None
    topics: List[str] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse] = Field(default_factory=list)
    total: int = 0
    offset: int = 0
    limit: int = 20
    has_more: bool = False
    query_id: Optional[str] = None


class DocumentSearchRequest(BaseModel):
    """Document search request"""
    query: str = Field(..., min_length=1, description="Search query")
    document_type: Optional[DocumentType] = None
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    key_numbers: Optional[List[str]] = None
    sort_order: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


# Case Schemas
class CaseResponse(BaseModel):
    """Case law response"""
    case_id: str
    case_name: str
    citation: LegalCitation
    court: str
    date_decided: str
    docket_number: Optional[str] = None
    judges: List[str] = Field(default_factory=list)
    parties: List[str] = Field(default_factory=list)
    attorneys: List[str] = Field(default_factory=list)
    headnotes: List[Headnote] = Field(default_factory=list)
    key_numbers: List[KeyNumber] = Field(default_factory=list)
    synopsis: Optional[str] = None
    holding: Optional[str] = None
    disposition: Optional[str] = None
    procedural_history: List[str] = Field(default_factory=list)
    full_text: Optional[str] = None


class CaseListResponse(BaseModel):
    """Case list response"""
    cases: List[CaseResponse] = Field(default_factory=list)
    total: int = 0
    offset: int = 0
    limit: int = 20
    has_more: bool = False


class CaseSearchRequest(BaseModel):
    """Case search request"""
    query: str = Field(..., min_length=1, description="Search query")
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    key_numbers: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    judge: Optional[str] = None
    sort_order: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


# Statute Schemas
class StatuteResponse(BaseModel):
    """Statute response"""
    statute_id: str
    title: str
    citation: str
    jurisdiction: Jurisdiction
    code_name: str
    section_number: str
    effective_date: Optional[str] = None
    text: Optional[str] = None
    history: List[str] = Field(default_factory=list)
    annotations: List[str] = Field(default_factory=list)
    cross_references: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class StatuteListResponse(BaseModel):
    """Statute list response"""
    statutes: List[StatuteResponse] = Field(default_factory=list)
    total: int = 0
    offset: int = 0
    limit: int = 20
    has_more: bool = False


class StatuteSearchRequest(BaseModel):
    """Statute search request"""
    query: str = Field(..., min_length=1, description="Search query")
    jurisdiction: Optional[Jurisdiction] = None
    code_name: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    include_annotations: bool = True
    sort_order: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


# KeyCite Schemas
class CitingReference(BaseModel):
    """Citing reference"""
    citation: str
    case_name: str
    court: str
    date: str
    depth: int = Field(default=1, description="Depth of treatment")
    headnote_numbers: List[int] = Field(default_factory=list)
    quoted_text: Optional[str] = None
    treatment: Optional[TreatmentType] = None


class NegativeHistory(BaseModel):
    """Negative case history"""
    citation: str
    case_name: str
    action: str
    court: str
    date: str
    description: str


class PositiveHistory(BaseModel):
    """Positive case history"""
    citation: str
    case_name: str
    action: str
    court: str
    date: str


class KeyCiteRequest(BaseModel):
    """KeyCite request"""
    citation: str = Field(..., description="Citation to KeyCite")
    include_citing_refs: bool = True
    include_history: bool = True
    depth_limit: Optional[int] = Field(None, ge=1, le=4)


class KeyCiteResponse(BaseModel):
    """KeyCite response"""
    citation: str
    status: KeyCiteStatus
    status_icon: str
    status_description: str
    citing_references: List[CitingReference] = Field(default_factory=list)
    negative_history: List[NegativeHistory] = Field(default_factory=list)
    positive_history: List[PositiveHistory] = Field(default_factory=list)
    total_citing_references: int = 0
    last_updated: Optional[datetime] = None
