"""
Pydantic schemas for Social Layer API validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum


# Enums for validation
class PitchStatusEnum(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    READY_FOR_RENDER = "ready_for_render"
    REJECTED = "rejected"


class VoteTypeEnum(str, Enum):
    UP = "up"
    DOWN = "down"


class ReactionTypeEnum(str, Enum):
    LIKE = "like"
    DISLIKE = "dislike"


# Request Schemas
class PitchCreateRequest(BaseModel):
    company_id: str = Field(..., description="UUID of the company")
    claims: Dict[str, Any] = Field(..., description="Medical claims data")
    ingredients: Dict[str, Any] = Field(..., description="Ingredient information")
    evidence_links: Optional[List[str]] = Field(None, description="URLs to supporting evidence")


class PitchUpdateRequest(BaseModel):
    claims: Optional[Dict[str, Any]] = None
    ingredients: Optional[Dict[str, Any]] = None
    evidence_links: Optional[List[str]] = None


class DoctorVerifyRequest(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, description="10-digit NPI number")


class ReviewCreateRequest(BaseModel):
    doctor_id: str = Field(..., description="UUID of verified doctor")
    vote: VoteTypeEnum = Field(..., description="Up or down vote")
    specialty: str = Field(..., description="Doctor's relevant specialty")
    comments: Optional[str] = Field(None, description="Review comments")
    evidence_links: Optional[List[str]] = Field(None, description="Supporting evidence URLs")


class ReactionCreateRequest(BaseModel):
    user_id: str = Field(..., description="UUID of user")
    reaction: ReactionTypeEnum = Field(..., description="Like or dislike")


class FlagCreateRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for flagging")
    user_id: Optional[str] = None


class CompanyCreateRequest(BaseModel):
    name: str = Field(..., description="Company name")
    contact: Optional[Dict[str, Any]] = None


# Response Schemas
class PitchResponse(BaseModel):
    id: str
    company_id: str
    claims: Dict[str, Any]
    ingredients: Dict[str, Any]
    evidence_links: Optional[List[str]]
    required_specialties: Optional[List[str]]
    progress: int
    status: PitchStatusEnum
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PitchProgressResponse(BaseModel):
    progress: int
    required_specialties: List[str]
    missing: List[str]
    review_count: int
    approval_count: int
    disapproval_count: int


class ReviewResponse(BaseModel):
    id: str
    pitch_id: str
    doctor_id: str
    vote: VoteTypeEnum
    specialty: Optional[str]
    comments: Optional[str]
    evidence_links: Optional[List[str]]
    timestamp: datetime
    weight: int
    
    class Config:
        from_attributes = True


class DoctorIdentityResponse(BaseModel):
    id: str
    npi: str
    license_status: Optional[str]
    specialties: Optional[List[str]]
    name: Optional[str]
    state: Optional[str]
    is_verified: bool
    last_verified: Optional[datetime]
    
    class Config:
        from_attributes = True


class CompanyResponse(BaseModel):
    id: str
    name: str
    verification_status: Optional[str]
    contact: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: str
    pitch_id: Optional[str]
    actor_id: Optional[str]
    actor_role: Optional[str]
    action: str
    payload: Optional[Dict[str, Any]]
    timestamp: datetime
    correlation_id: Optional[str]
    
    class Config:
        from_attributes = True


class WebhookPayload(BaseModel):
    pitch_id: str
    drug_name: str
    claims: Dict[str, Any]
    ingredients: Dict[str, Any]
    review_summary: Dict[str, Any]
    metadata: Dict[str, Any]


class HealthCheckResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
