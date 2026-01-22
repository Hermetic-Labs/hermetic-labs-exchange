"""
FHIR Compliance Suite - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class FHIRResourceType(str, Enum):
    PATIENT = "Patient"
    PRACTITIONER = "Practitioner"
    OBSERVATION = "Observation"
    CONDITION = "Condition"
    MEDICATION_REQUEST = "MedicationRequest"
    ENCOUNTER = "Encounter"
    DIAGNOSTIC_REPORT = "DiagnosticReport"
    BUNDLE = "Bundle"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"


class ValidationSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFORMATION = "information"


# Common FHIR Types
class HumanName(BaseModel):
    use: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None


class ContactPoint(BaseModel):
    system: Optional[str] = None  # phone, email, etc.
    value: Optional[str] = None
    use: Optional[str] = None


class Address(BaseModel):
    use: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None


class Identifier(BaseModel):
    system: Optional[str] = None
    value: str


class Reference(BaseModel):
    reference: str
    display: Optional[str] = None


class CodeableConcept(BaseModel):
    coding: Optional[List[Dict[str, str]]] = None
    text: Optional[str] = None


# Validation Schemas
class ValidationRequest(BaseModel):
    resource_type: FHIRResourceType
    resource: Dict[str, Any]
    profile: Optional[str] = None


class ValidationIssue(BaseModel):
    severity: ValidationSeverity
    code: str
    diagnostics: str
    location: Optional[List[str]] = None


class ValidationResponse(BaseModel):
    valid: bool
    issues: List[ValidationIssue]
    resource_type: FHIRResourceType


# Patient Schemas
class PatientRequest(BaseModel):
    identifier: Optional[List[Identifier]] = None
    name: List[HumanName]
    telecom: Optional[List[ContactPoint]] = None
    gender: Optional[Gender] = None
    birth_date: Optional[date] = None
    address: Optional[List[Address]] = None


class PatientResponse(BaseModel):
    id: str
    resource_type: str = "Patient"
    identifier: Optional[List[Identifier]] = None
    name: List[HumanName]
    gender: Optional[Gender] = None
    birth_date: Optional[date] = None
    created: datetime


# Observation Schemas
class ObservationRequest(BaseModel):
    status: str = "final"
    code: CodeableConcept
    subject: Reference
    effective_date_time: Optional[datetime] = None
    value_quantity: Optional[Dict[str, Any]] = None
    value_string: Optional[str] = None


class ObservationResponse(BaseModel):
    id: str
    resource_type: str = "Observation"
    status: str
    code: CodeableConcept
    subject: Reference
    effective_date_time: Optional[datetime] = None
    issued: datetime


# Search Schemas
class SearchRequest(BaseModel):
    resource_type: FHIRResourceType
    params: Dict[str, str]
    count: int = Field(default=20, le=100)
    offset: int = 0


class BundleEntry(BaseModel):
    full_url: Optional[str] = None
    resource: Dict[str, Any]


class SearchResponse(BaseModel):
    resource_type: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[BundleEntry]
