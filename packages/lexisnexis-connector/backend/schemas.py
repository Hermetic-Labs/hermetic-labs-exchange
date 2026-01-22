"""
Pydantic schemas for LexisNexis Connector API
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
    PLEADING = "pleadings"
    NEWS = "news"


class Jurisdiction(str, Enum):
    """Legal jurisdiction"""
    US_FED = "US-FED"
    US_STATE = "US-STATE"
    US_ALL = "US-ALL"
    UK = "UK"
    CA = "CA"
    AU = "AU"


class TreatmentType(str, Enum):
    """Shepard's treatment type"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    CAUTIONARY = "cautionary"
    NEUTRAL = "neutral"
    QUESTIONED = "questioned"


class SortOrder(str, Enum):
    """Search result sort order"""
    RELEVANCE = "relevance"
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    CITATION = "citation"


# Connection Schemas
class LexisNexisCredentials(BaseModel):
    """LexisNexis authentication credentials"""
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")


class LexisNexisConnectionConfig(BaseModel):
    """LexisNexis connection configuration"""
    base_url: str = Field(default="https://api.lexisnexis.com", description="LexisNexis API base URL")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")


class LexisNexisConnectionResponse(BaseModel):
    """LexisNexis connection response"""
    connected: bool
    base_url: str
    api_version: str
    token_expires_at: Optional[datetime] = None


# Document Schemas
class Headnote(BaseModel):
    """Case headnote"""
    number: int
    text: str
    topics: List[str] = Field(default_factory=list)
    key_numbers: List[str] = Field(default_factory=list)


class Citation(BaseModel):
    """Legal citation"""
    full_citation: str
    reporter: Optional[str] = None
    volume: Optional[str] = None
    page: Optional[str] = None
    parallel_citations: List[str] = Field(default_factory=list)


class DocumentResponse(BaseModel):
    """Document details response"""
    document_id: str
    title: str
    document_type: DocumentType
    citation: Optional[Citation] = None
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_decided: Optional[date] = None
    date_filed: Optional[date] = None
    judges: List[str] = Field(default_factory=list)
    parties: List[str] = Field(default_factory=list)
    attorneys: List[str] = Field(default_factory=list)
    headnotes: List[Headnote] = Field(default_factory=list)
    summary: Optional[str] = None
    full_text: Optional[str] = None
    word_count: Optional[int] = None
    topics: List[str] = Field(default_factory=list)
    key_numbers: List[str] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    """List of documents response"""
    documents: List[DocumentResponse]
    total: int
    offset: int = 0
    limit: int = 25
    has_more: bool = False
    query_id: Optional[str] = None


class DocumentSearchRequest(BaseModel):
    """Document search parameters"""
    query: str = Field(..., min_length=1, description="Search query")
    document_type: Optional[DocumentType] = None
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    topics: Optional[List[str]] = None
    include_full_text: bool = False
    sort: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=25, ge=1, le=100)


# Case Schemas
class CaseResponse(BaseModel):
    """Case document response"""
    case_id: str
    case_name: str
    short_name: Optional[str] = None
    citation: Citation
    parallel_citations: List[str] = Field(default_factory=list)
    court: str
    court_level: Optional[str] = None
    jurisdiction: Jurisdiction
    date_decided: date
    date_filed: Optional[date] = None
    docket_number: Optional[str] = None
    judges: List[str] = Field(default_factory=list)
    parties: List[str] = Field(default_factory=list)
    attorneys: List[str] = Field(default_factory=list)
    disposition: Optional[str] = None
    procedural_posture: Optional[str] = None
    headnotes: List[Headnote] = Field(default_factory=list)
    syllabus: Optional[str] = None
    opinion_text: Optional[str] = None
    dissent_text: Optional[str] = None
    concurrence_text: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    treatment: Optional[TreatmentType] = None


class CaseListResponse(BaseModel):
    """List of cases response"""
    cases: List[CaseResponse]
    total: int
    offset: int = 0
    limit: int = 25
    has_more: bool = False


class CaseSearchRequest(BaseModel):
    """Case search parameters"""
    query: str = Field(..., min_length=1, description="Search query")
    jurisdiction: Optional[Jurisdiction] = None
    court: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    topics: Optional[List[str]] = None
    key_numbers: Optional[List[str]] = None
    include_opinion: bool = False
    sort: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=25, ge=1, le=100)


# Statute Schemas
class StatuteResponse(BaseModel):
    """Statute document response"""
    statute_id: str
    title: str
    code_name: str
    code_title: Optional[str] = None
    section_number: str
    section_title: Optional[str] = None
    jurisdiction: Jurisdiction
    effective_date: Optional[date] = None
    version_date: Optional[date] = None
    text: Optional[str] = None
    history: Optional[str] = None
    annotations: List[str] = Field(default_factory=list)
    cross_references: List[str] = Field(default_factory=list)
    citing_cases: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)


class StatuteListResponse(BaseModel):
    """List of statutes response"""
    statutes: List[StatuteResponse]
    total: int
    offset: int = 0
    limit: int = 25
    has_more: bool = False


class StatuteSearchRequest(BaseModel):
    """Statute search parameters"""
    query: str = Field(..., min_length=1, description="Search query")
    jurisdiction: Optional[Jurisdiction] = None
    code_name: Optional[str] = None
    include_annotations: bool = False
    include_history: bool = False
    sort: SortOrder = SortOrder.RELEVANCE
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=25, ge=1, le=100)


# Shepard's Schemas
class CitingReference(BaseModel):
    """Citing reference details"""
    document_id: str
    citation: str
    case_name: Optional[str] = None
    court: Optional[str] = None
    date_decided: Optional[date] = None
    treatment: TreatmentType
    headnote_numbers: List[int] = Field(default_factory=list)
    discussion_text: Optional[str] = None
    depth: int = 1  # How extensively discussed


class ShepardizeResponse(BaseModel):
    """Shepard's citation analysis response"""
    citation: str
    document_id: Optional[str] = None
    case_name: Optional[str] = None
    overall_treatment: TreatmentType
    citing_references: List[CitingReference] = Field(default_factory=list)
    positive_count: int = 0
    negative_count: int = 0
    cautionary_count: int = 0
    neutral_count: int = 0
    total_citing: int = 0
    history: List[CitingReference] = Field(default_factory=list)
    warning_signals: List[str] = Field(default_factory=list)


class ShepardizeRequest(BaseModel):
    """Shepardize request parameters"""
    citation: str = Field(..., description="Citation to analyze")
    include_history: bool = True
    include_citing_references: bool = True
    treatment_filter: Optional[TreatmentType] = None
    limit: int = Field(default=50, ge=1, le=200)
