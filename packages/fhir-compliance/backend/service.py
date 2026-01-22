"""
FHIR Compliance Suite - Business Logic Service
"""

import os
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
from .schemas import (
    ValidationRequest,
    ValidationResponse,
    ValidationIssue,
    ValidationSeverity,
    PatientRequest,
    PatientResponse,
    ObservationRequest,
    ObservationResponse,
    SearchRequest,
    SearchResponse,
    BundleEntry,
    FHIRResourceType
)


class FHIRService:
    """
    FHIR R4 compliance service.
    Handles resource validation, CRUD operations, and search.
    """
    
    REQUIRED_FIELDS = {
        FHIRResourceType.PATIENT: ['name'],
        FHIRResourceType.OBSERVATION: ['status', 'code', 'subject'],
        FHIRResourceType.CONDITION: ['subject', 'code'],
        FHIRResourceType.MEDICATION_REQUEST: ['status', 'intent', 'medication', 'subject'],
    }
    
    def __init__(self):
        self.base_url = os.getenv("FHIR_BASE_URL", "http://localhost:8080/fhir")
        self._resources: Dict[str, Dict[str, Any]] = {}
        
    async def validate_resource(
        self, 
        request: ValidationRequest
    ) -> ValidationResponse:
        """Validate a FHIR resource against the spec."""
        issues: List[ValidationIssue] = []
        
        # Check required fields
        required = self.REQUIRED_FIELDS.get(request.resource_type, [])
        for field in required:
            if field not in request.resource:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="required",
                    diagnostics=f"Missing required field: {field}",
                    location=[field]
                ))
        
        # Check resourceType matches
        if request.resource.get('resourceType') != request.resource_type.value:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="invalid",
                diagnostics=f"resourceType must be {request.resource_type.value}",
                location=["resourceType"]
            ))
        
        return ValidationResponse(
            valid=len([i for i in issues if i.severity == ValidationSeverity.ERROR]) == 0,
            issues=issues,
            resource_type=request.resource_type
        )
    
    async def create_patient(
        self, 
        request: PatientRequest
    ) -> PatientResponse:
        """Create a new Patient resource."""
        patient_id = self._generate_id()
        
        return PatientResponse(
            id=patient_id,
            resource_type="Patient",
            identifier=request.identifier,
            name=request.name,
            gender=request.gender,
            birth_date=request.birth_date,
            created=datetime.utcnow()
        )
    
    async def get_resource(
        self,
        resource_type: FHIRResourceType,
        resource_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a resource by type and ID."""
        key = f"{resource_type.value}/{resource_id}"
        return self._resources.get(key)
    
    async def create_observation(
        self, 
        request: ObservationRequest
    ) -> ObservationResponse:
        """Create a new Observation resource."""
        obs_id = self._generate_id()
        
        return ObservationResponse(
            id=obs_id,
            resource_type="Observation",
            status=request.status,
            code=request.code,
            subject=request.subject,
            effective_date_time=request.effective_date_time,
            issued=datetime.utcnow()
        )
    
    async def search(
        self, 
        request: SearchRequest
    ) -> SearchResponse:
        """Search for FHIR resources."""
        # In production, this would query a FHIR server
        # For now, return mock response
        entries: List[BundleEntry] = []
        
        return SearchResponse(
            resource_type="Bundle",
            type="searchset",
            total=len(entries),
            entry=entries
        )
    
    async def create_bundle(
        self,
        bundle_type: str,
        entries: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create a FHIR Bundle."""
        bundle_id = self._generate_id()
        
        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": bundle_type,
            "timestamp": datetime.utcnow().isoformat(),
            "entry": [
                {"resource": entry} for entry in entries
            ]
        }
    
    def _generate_id(self) -> str:
        """Generate a unique FHIR resource ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
