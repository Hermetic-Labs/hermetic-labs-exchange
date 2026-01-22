"""
ITAR Compliance Suite - Business Logic Service
"""

import os
import hashlib
from typing import Optional, List, Dict
from datetime import datetime, date, timedelta
from .schemas import (
    ClassificationRequest,
    ClassificationResponse,
    ScreeningRequest,
    ScreeningResponse,
    LicenseRequest,
    LicenseResponse,
    LicenseListResponse,
    TechnicalDataRequest,
    TechnicalDataResponse,
    AuditEntry,
    AuditReportResponse,
    USMLCategory,
    LicenseStatus,
    ScreeningResult,
    LicenseType
)


class ITARService:
    """
    ITAR compliance service.
    Handles USML classification, screening, and export license management.
    """
    
    # Keywords that suggest ITAR control
    ITAR_KEYWORDS = [
        'missile', 'radar', 'night vision', 'targeting', 'munition',
        'warhead', 'encryption', 'satellite', 'guidance', 'stealth',
        'armor', 'propulsion', 'launch', 'weapons', 'combat'
    ]
    
    # Restricted countries
    RESTRICTED_COUNTRIES = [
        'CN', 'RU', 'IR', 'KP', 'SY', 'CU', 'VE'
    ]
    
    def __init__(self):
        self.company_id = os.getenv("ITAR_COMPANY_ID", "")
        self.ddtc_registration = os.getenv("ITAR_DDTC_REG", "")
        self._licenses: List[LicenseResponse] = []
        self._audit_log: List[AuditEntry] = []
        
    async def classify_item(
        self, 
        request: ClassificationRequest
    ) -> ClassificationResponse:
        """Classify an item under USML."""
        classification_id = f"class_{self._generate_id()}"
        
        description_lower = request.item_description.lower()
        
        # Check for ITAR keywords
        is_itar = any(kw in description_lower for kw in self.ITAR_KEYWORDS)
        
        # Determine category based on keywords
        usml_category = None
        if is_itar:
            if 'night vision' in description_lower or 'targeting' in description_lower:
                usml_category = USMLCategory.XII
            elif 'missile' in description_lower or 'launch' in description_lower:
                usml_category = USMLCategory.IV
            elif 'aircraft' in description_lower:
                usml_category = USMLCategory.VIII
            elif 'satellite' in description_lower or 'spacecraft' in description_lower:
                usml_category = USMLCategory.XV
            else:
                usml_category = USMLCategory.XXI
        
        jurisdiction = "ITAR" if is_itar else "EAR"
        
        await self._log_audit("classify", "item", classification_id, "system")
        
        return ClassificationResponse(
            classification_id=classification_id,
            usml_category=usml_category,
            is_itar_controlled=is_itar,
            jurisdiction=jurisdiction,
            rationale=f"Classification based on item description analysis",
            confidence=0.85 if is_itar else 0.70,
            classified_at=datetime.utcnow()
        )
    
    async def screen_person(
        self, 
        request: ScreeningRequest
    ) -> ScreeningResponse:
        """Screen a foreign person against restricted lists."""
        screening_id = f"screen_{self._generate_id()}"
        
        # Check if nationality is restricted
        result = ScreeningResult.CLEAR
        if request.nationality.upper() in self.RESTRICTED_COUNTRIES:
            result = ScreeningResult.REVIEW_REQUIRED
        
        await self._log_audit("screen", "person", screening_id, "system")
        
        return ScreeningResponse(
            screening_id=screening_id,
            result=result,
            name=request.name,
            nationality=request.nationality,
            denied_party_matches=None,
            sanctions_matches=None,
            screened_at=datetime.utcnow()
        )
    
    async def request_license(
        self, 
        request: LicenseRequest
    ) -> LicenseResponse:
        """Request an export license."""
        license_id = f"lic_{self._generate_id()}"
        
        # Check if destination is restricted
        status = LicenseStatus.DRAFT
        if request.destination_country.upper() in self.RESTRICTED_COUNTRIES:
            status = LicenseStatus.UNDER_REVIEW
        
        license_resp = LicenseResponse(
            id=license_id,
            license_type=request.license_type,
            status=status,
            usml_category=request.usml_category,
            end_user=request.end_user,
            destination_country=request.destination_country,
            submitted_date=None,
            approval_date=None,
            expiry_date=None,
            created_at=datetime.utcnow()
        )
        
        self._licenses.append(license_resp)
        await self._log_audit("create", "license", license_id, "system")
        
        return license_resp
    
    async def list_licenses(
        self,
        status: Optional[LicenseStatus] = None
    ) -> LicenseListResponse:
        """List export licenses."""
        licenses = self._licenses
        
        if status:
            licenses = [l for l in licenses if l.status == status]
        
        active = sum(1 for l in self._licenses if l.status == LicenseStatus.APPROVED)
        pending = sum(1 for l in self._licenses if l.status in [
            LicenseStatus.DRAFT, LicenseStatus.SUBMITTED, LicenseStatus.UNDER_REVIEW
        ])
        
        return LicenseListResponse(
            licenses=licenses,
            total_count=len(licenses),
            active_count=active,
            pending_count=pending
        )
    
    async def control_technical_data(
        self, 
        request: TechnicalDataRequest
    ) -> TechnicalDataResponse:
        """Control access to technical data."""
        access_id = f"tda_{self._generate_id()}"
        
        # Basic approval logic
        approved = request.data_classification.value != "itar_controlled"
        restrictions = []
        
        if not approved:
            restrictions.append("Requires export authorization")
            restrictions.append("US persons only access")
        
        await self._log_audit("access_request", "technical_data", access_id, request.access_requested_by)
        
        return TechnicalDataResponse(
            access_id=access_id,
            approved=approved,
            data_classification=request.data_classification,
            restrictions=restrictions if restrictions else None,
            expiry_date=date.today() + timedelta(days=90) if approved else None,
            reviewed_at=datetime.utcnow()
        )
    
    async def get_audit_report(
        self,
        start_date: date,
        end_date: date
    ) -> AuditReportResponse:
        """Generate audit report."""
        report_id = f"audit_{self._generate_id()}"
        
        # Filter entries by date
        entries = [
            e for e in self._audit_log
            if start_date <= e.timestamp.date() <= end_date
        ]
        
        return AuditReportResponse(
            report_id=report_id,
            period_start=start_date,
            period_end=end_date,
            entries=entries,
            total_classifications=sum(1 for e in entries if e.entity_type == "item"),
            total_screenings=sum(1 for e in entries if e.entity_type == "person"),
            total_license_activities=sum(1 for e in entries if e.entity_type == "license"),
            generated_at=datetime.utcnow()
        )
    
    async def _log_audit(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: str
    ) -> None:
        """Log an audit entry."""
        entry = AuditEntry(
            id=f"audit_{self._generate_id()}",
            timestamp=datetime.utcnow(),
            action=action,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id
        )
        self._audit_log.append(entry)
    
    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
