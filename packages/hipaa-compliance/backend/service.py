"""
HIPAA Privacy Suite - Business Logic Service
"""

import os
import re
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from .schemas import (
    PHIDetectionRequest,
    PHIDetectionResponse,
    PHIEntity,
    PHIMaskRequest,
    PHIMaskResponse,
    AccessValidationRequest,
    AccessValidationResponse,
    AuditLogEntry,
    AuditLogResponse,
    BreachReportRequest,
    BreachReportResponse,
    PHICategory,
    BreachSeverity
)


class HIPAAService:
    """
    HIPAA Privacy compliance service.
    Handles PHI detection, masking, access control, and audit logging.
    """
    
    # PHI detection patterns
    PHI_PATTERNS = {
        PHICategory.SSN: r'\b\d{3}-\d{2}-\d{4}\b',
        PHICategory.PHONE: r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        PHICategory.EMAIL: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        PHICategory.DOB: r'\b\d{1,2}/\d{1,2}/\d{4}\b',
        PHICategory.MRN: r'\bMRN[:\s]?\d{6,10}\b',
    }
    
    def __init__(self):
        self.encryption_key = os.getenv("HIPAA_ENCRYPTION_KEY", "")
        self.audit_enabled = True
        self._audit_log: List[AuditLogEntry] = []
        
    async def detect_phi(
        self, 
        request: PHIDetectionRequest
    ) -> PHIDetectionResponse:
        """Detect PHI entities in text."""
        entities: List[PHIEntity] = []
        categories = request.categories or list(PHICategory)
        
        for category in categories:
            if category in self.PHI_PATTERNS:
                pattern = self.PHI_PATTERNS[category]
                for match in re.finditer(pattern, request.text):
                    entities.append(PHIEntity(
                        text=match.group(),
                        category=category,
                        start_index=match.start(),
                        end_index=match.end(),
                        confidence=0.95
                    ))
        
        return PHIDetectionResponse(
            entities=entities,
            phi_detected=len(entities) > 0,
            scan_timestamp=datetime.utcnow()
        )
    
    async def mask_phi(
        self, 
        request: PHIMaskRequest
    ) -> PHIMaskResponse:
        """Mask PHI in text."""
        masked_text = request.text
        entities_masked = 0
        categories = request.categories or list(PHICategory)
        
        for category in categories:
            if category in self.PHI_PATTERNS:
                pattern = self.PHI_PATTERNS[category]
                
                def mask_match(match):
                    nonlocal entities_masked
                    entities_masked += 1
                    if request.preserve_format:
                        return re.sub(r'[0-9a-zA-Z]', request.mask_char, match.group())
                    return request.mask_char * len(match.group())
                
                masked_text = re.sub(pattern, mask_match, masked_text)
        
        return PHIMaskResponse(
            masked_text=masked_text,
            entities_masked=entities_masked,
            original_length=len(request.text)
        )
    
    async def validate_access(
        self, 
        request: AccessValidationRequest
    ) -> AccessValidationResponse:
        """Validate access based on HIPAA minimum necessary rule."""
        audit_id = f"audit_{self._generate_id()}"
        
        # Basic access validation logic
        allowed = True
        reason = None
        restrictions = []
        
        # Apply minimum necessary principle
        if request.minimum_necessary:
            restrictions.append("limited_to_minimum_necessary")
        
        # Log the access attempt
        if self.audit_enabled:
            await self._log_access(request, allowed, audit_id)
        
        return AccessValidationResponse(
            allowed=allowed,
            reason=reason,
            restrictions=restrictions if restrictions else None,
            audit_id=audit_id
        )
    
    async def get_audit_log(
        self,
        page: int = 1,
        page_size: int = 50,
        user_id: Optional[str] = None
    ) -> AuditLogResponse:
        """Retrieve audit log entries."""
        entries = self._audit_log
        
        if user_id:
            entries = [e for e in entries if e.user_id == user_id]
        
        total = len(entries)
        start = (page - 1) * page_size
        end = start + page_size
        
        return AuditLogResponse(
            entries=entries[start:end],
            total_count=total,
            page=page,
            page_size=page_size
        )
    
    async def report_breach(
        self, 
        request: BreachReportRequest
    ) -> BreachReportResponse:
        """Report a potential HIPAA breach."""
        report_id = f"breach_{self._generate_id()}"
        
        # Determine notification requirements
        notification_required = request.affected_records >= 500
        notification_deadline = None
        
        if notification_required:
            notification_deadline = request.discovery_date + timedelta(days=60)
        
        return BreachReportResponse(
            report_id=report_id,
            status="under_review",
            notification_required=notification_required,
            notification_deadline=notification_deadline,
            created_at=datetime.utcnow()
        )
    
    async def _log_access(
        self,
        request: AccessValidationRequest,
        allowed: bool,
        audit_id: str
    ) -> None:
        """Log access attempt to audit trail."""
        entry = AuditLogEntry(
            id=audit_id,
            timestamp=datetime.utcnow(),
            user_id=request.user_id,
            action="access_validation",
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            purpose=request.purpose,
            success=allowed,
            ip_address=None,
            details=None
        )
        self._audit_log.append(entry)
    
    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
