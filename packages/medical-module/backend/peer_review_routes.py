"""
Example integration of standardized error handling in existing endpoints.

This file demonstrates how to integrate the new common error schemas
into existing API endpoints for improved consistency and error handling.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
import logging

# Imports from main app (absolute imports instead of relative escaping package)
from app.common import APIError, APIResponse, HIPAAErrorResponse
from app.common.hipaa_schemas import (
    MedicalDataRequest, 
    AccessLogEntry, 
    HIPAAComplianceMetadata,
    DataClassification,
    AccessReason,
    AuditAction
)

from .database import get_db, init_db, DoctorIdentity
from .schemas import (
    PitchCreateRequest, PitchUpdateRequest, PitchResponse, 
    DoctorVerifyRequest, DoctorIdentityResponse,
    ReviewCreateRequest, ReviewResponse
)
from .services import IdentityAdapter, ReviewEngine

# Initialize database
init_db()

# Create router
router = APIRouter(tags=["peer-review"])

# Logger for audit trails
audit_logger = logging.getLogger("hipaa.audit")

# Medical Data Access Middleware
async def log_medical_access(
    user_id: str,
    patient_id: Optional[str],
    action: str,
    resource: str,
    access_reason: AccessReason,
    success: bool = True,
    failure_reason: Optional[str] = None
):
    """Log medical data access for HIPAA compliance"""
    access_log = AccessLogEntry(
        log_id=f"LOG_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{user_id}",
        user_id=user_id,
        user_role="doctor",  # Should be derived from authentication
        patient_id=patient_id or "N/A",
        action=AuditAction(action.lower()),
        resource_accessed=resource,
        access_reason=access_reason,
        success=success,
        failure_reason=failure_reason
    )
    
    # In production, this would be stored in an audit database
    audit_logger.info(f"Medical access logged: {access_log.dict()}")
    
    return access_log


@router.post("/verify/doctor-improved", response_model=DoctorIdentityResponse)
async def verify_doctor_improved(
    request: DoctorVerifyRequest, 
    db: Session = Depends(get_db),
    current_user_id: str = "demo_user"  # In production, get from authentication
):
    """
    Verify a doctor's identity using NPI with enhanced error handling and audit logging.
    
    This endpoint demonstrates:
    - Standardized error responses
    - HIPAA compliance audit logging
    - Input validation with detailed error messages
    - Security logging for medical data access
    """
    # Add HIPAA compliance metadata
    hipaa_metadata = HIPAAComplianceMetadata(
        data_classification=DataClassification.RESTRICTED,
        contains_phi=True,
        encryption_required=True,
        access_logging_required=True,
        patient_consent_required=False,  # Doctor verification doesn't require patient consent
        retention_period_days=2555  # 7 years for medical records
    )
    
    try:
        # Log the access attempt
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,  # NPI lookup is not patient-specific
            action="verify_doctor",
            resource=f"/api/v1/social/verify/doctor",
            access_reason=AccessReason.HEALTHCARE_OPERATIONS
        )
        
        # Validate NPI format
        if not request.npi or len(request.npi) != 10 or not request.npi.isdigit():
            await log_medical_access(
                user_id=current_user_id,
                patient_id=None,
                action="verify_doctor",
                resource=f"/api/v1/social/verify/doctor",
                access_reason=AccessReason.HEALTHCARE_OPERATIONS,
                success=False,
                failure_reason="Invalid NPI format"
            )
            
            # Use standardized validation error
            APIError.validation_error(
                message="Invalid NPI format",
                error_code="INVALID_NPI_FORMAT",
                validation_errors=[{
                    "field": "npi",
                    "value": request.npi,
                    "constraint": "must_be_10_digits_numeric",
                    "message": "NPI must be exactly 10 digits and contain only numbers"
                }],
                details={
                    "field": "npi",
                    "provided_value": request.npi,
                    "validation_rules": {
                        "length": 10,
                        "pattern": "numeric_only",
                        "required": True
                    },
                    "hipaa_compliance": hipaa_metadata.dict()
                }
            )
        
        # Attempt doctor verification
        doctor = await IdentityAdapter.verify_doctor(db, request.npi)
        
        if not doctor:
            await log_medical_access(
                user_id=current_user_id,
                patient_id=None,
                action="verify_doctor", 
                resource=f"/api/v1/social/verify/doctor",
                access_reason=AccessReason.HEALTHCARE_OPERATIONS,
                success=False,
                failure_reason="Doctor not found in registry"
            )
            
            # Use standardized not found error
            APIError.not_found(
                message=f"Doctor with NPI {request.npi} not found in registry",
                error_code="DOCTOR_NOT_FOUND"
            )
        
        # Log successful access
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,
            action="verify_doctor",
            resource=f"/api/v1/social/verify/doctor",
            access_reason=AccessReason.HEALTHCARE_OPERATIONS,
            success=True
        )
        
        # Return success response with metadata
        return APIResponse.success(
            data=doctor,
            message="Doctor verification completed successfully",
            meta={
                "verification_timestamp": datetime.utcnow().isoformat(),
                "hipaa_compliance": hipaa_metadata.dict(),
                "audit_log_id": f"LOG_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{current_user_id}"
            }
        )
        
    except ValueError as e:
        # Handle validation errors from the service layer
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,
            action="verify_doctor",
            resource=f"/api/v1/social/verify/doctor", 
            access_reason=AccessReason.HEALTHCARE_OPERATIONS,
            success=False,
            failure_reason=str(e)
        )
        
        APIError.validation_error(
            message="Doctor verification failed",
            error_code="VERIFICATION_SERVICE_ERROR",
            validation_errors=[{
                "field": "npi",
                "value": request.npi,
                "constraint": "service_validation",
                "message": str(e)
            }],
            details={
                "service_error": str(e),
                "npi_provided": request.npi,
                "hipaa_compliance": hipaa_metadata.dict()
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,
            action="verify_doctor",
            resource=f"/api/v1/social/verify/doctor",
            access_reason=AccessReason.HEALTHCARE_OPERATIONS,
            success=False,
            failure_reason="Unexpected system error"
        )
        
        # Log the error for security monitoring
        audit_logger.error(f"Unexpected error in doctor verification: {str(e)}", exc_info=True)
        
        APIError.internal_error(
            message="An unexpected error occurred during doctor verification",
            error_code="DOCTOR_VERIFICATION_ERROR",
            details={
                "error_type": type(e).__name__,
                "npi_provided": request.npi,
                "user_id": current_user_id,
                "hipaa_compliance": hipaa_metadata.dict()
            }
        )


@router.get("/doctor/{doctor_id}-improved", response_model=DoctorIdentityResponse)
async def get_doctor_improved(
    doctor_id: str, 
    db: Session = Depends(get_db),
    current_user_id: str = "demo_user",
    request: Request = None
):
    """
    Get doctor identity with enhanced security and audit logging.
    
    Demonstrates:
    - Resource access authorization
    - HIPAA audit logging
    - Consistent error responses
    - Security headers and metadata
    """
    # Add HIPAA compliance metadata
    hipaa_metadata = HIPAAComplianceMetadata(
        data_classification=DataClassification.RESTRICTED,
        contains_phi=True,
        encryption_required=True,
        access_logging_required=True,
        retention_period_days=2555
    )
    
    try:
        # Log access attempt
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,
            action="read",
            resource=f"/api/v1/social/doctor/{doctor_id}",
            access_reason=AccessReason.HEALTHCARE_OPERATIONS
        )
        
        # Validate doctor_id format
        if not doctor_id or len(doctor_id.strip()) == 0:
            APIError.validation_error(
                message="Doctor ID cannot be empty",
                error_code="INVALID_DOCTOR_ID",
                validation_errors=[{
                    "field": "doctor_id",
                    "value": doctor_id,
                    "constraint": "required",
                    "message": "Doctor ID is required and cannot be empty"
                }]
            )
        
        # Query database
        doctor = db.query(DoctorIdentity).filter(DoctorIdentity.id == doctor_id).first()
        
        if not doctor:
            await log_medical_access(
                user_id=current_user_id,
                patient_id=None,
                action="read",
                resource=f"/api/v1/social/doctor/{doctor_id}",
                access_reason=AccessReason.HEALTHCARE_OPERATIONS,
                success=False,
                failure_reason="Doctor not found"
            )
            
            APIError.not_found(
                message=f"Doctor with ID {doctor_id} not found",
                error_code="DOCTOR_NOT_FOUND"
            )
        
        # Log successful access
        await log_medical_access(
            user_id=current_user_id,
            patient_id=None,
            action="read",
            resource=f"/api/v1/social/doctor/{doctor_id}",
            access_reason=AccessReason.HEALTHCARE_OPERATIONS,
            success=True
        )
        
        # Return success response
        return APIResponse.success(
            data=doctor,
            message="Doctor information retrieved successfully",
            meta={
                "retrieval_timestamp": datetime.utcnow().isoformat(),
                "request_id": getattr(request.state, 'request_id', None),
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "hipaa_compliance": hipaa_metadata.dict()
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (already properly formatted)
        raise
        
    except Exception as e:
        audit_logger.error(f"Unexpected error retrieving doctor {doctor_id}: {str(e)}", exc_info=True)
        
        APIError.internal_error(
            message="An unexpected error occurred while retrieving doctor information",
            error_code="DOCTOR_RETRIEVAL_ERROR",
            details={
                "doctor_id": doctor_id,
                "error_type": type(e).__name__,
                "user_id": current_user_id
            }
        )


# Utility function for other endpoints
def validate_medical_access(
    user_id: str,
    resource: str,
    access_reason: AccessReason,
    required_permissions: List[str]
) -> AccessLogEntry:
    """
    Utility function to validate medical data access and create audit log.
    
    This function can be used across all medical data endpoints to ensure
    consistent HIPAA compliance and access validation.
    """
    # In production, this would check user permissions against required_permissions
    # For now, we'll create the audit log entry
    
    access_log = AccessLogEntry(
        log_id=f"LOG_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{user_id}",
        user_id=user_id,
        user_role="doctor",  # Would be derived from user authentication
        patient_id="N/A",  # Would be extracted from request context
        action=AuditAction.READ,  # Would be determined by HTTP method
        resource_accessed=resource,
        access_reason=access_reason,
        success=True  # Would be set based on permission check result
    )
    
    return access_log
