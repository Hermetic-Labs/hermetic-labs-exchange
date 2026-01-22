"""
PCI DSS Compliance Suite - Business Logic Service
"""

import os
import re
import hashlib
from typing import Optional, List, Dict
from datetime import datetime
from .schemas import (
    PANValidationRequest,
    PANValidationResponse,
    PANMaskRequest,
    PANMaskResponse,
    AssessmentRequest,
    AssessmentResponse,
    RequirementResult,
    RequirementsResponse,
    PCIRequirement,
    ScanRequest,
    ScanResponse,
    ComplianceStatus,
    RequirementCategory,
    ScanStatus
)


class PCIService:
    """
    PCI DSS compliance service.
    Handles card data validation, masking, and compliance assessments.
    """
    
    # Card issuer patterns
    CARD_PATTERNS = {
        'visa': r'^4[0-9]{12}(?:[0-9]{3})?$',
        'mastercard': r'^5[1-5][0-9]{14}$',
        'amex': r'^3[47][0-9]{13}$',
        'discover': r'^6(?:011|5[0-9]{2})[0-9]{12}$',
    }
    
    # PCI DSS Requirements
    REQUIREMENTS = [
        PCIRequirement(
            id="1",
            category=RequirementCategory.NETWORK_SECURITY,
            title="Install and Maintain Network Security Controls",
            description="Install and maintain network security controls",
            sub_requirements=["1.1", "1.2", "1.3", "1.4", "1.5"]
        ),
        PCIRequirement(
            id="2",
            category=RequirementCategory.NETWORK_SECURITY,
            title="Apply Secure Configurations",
            description="Apply secure configurations to all system components",
            sub_requirements=["2.1", "2.2", "2.3"]
        ),
        PCIRequirement(
            id="3",
            category=RequirementCategory.DATA_PROTECTION,
            title="Protect Stored Account Data",
            description="Protect stored cardholder data",
            sub_requirements=["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]
        ),
        PCIRequirement(
            id="4",
            category=RequirementCategory.DATA_PROTECTION,
            title="Protect Cardholder Data with Cryptography",
            description="Protect cardholder data with strong cryptography during transmission",
            sub_requirements=["4.1", "4.2"]
        ),
    ]
    
    def __init__(self):
        self.encryption_key = os.getenv("PCI_ENCRYPTION_KEY", "")
        
    async def validate_pan(
        self, 
        request: PANValidationRequest
    ) -> PANValidationResponse:
        """Validate a Primary Account Number."""
        pan = re.sub(r'\D', '', request.pan)
        
        # Luhn check
        valid = True
        if request.check_luhn:
            valid = self._luhn_check(pan)
        
        # Identify issuer
        issuer = None
        card_type = None
        if request.identify_issuer:
            for card, pattern in self.CARD_PATTERNS.items():
                if re.match(pattern, pan):
                    issuer = card.upper()
                    card_type = card
                    break
        
        # Mask PAN
        masked = self._mask_pan(pan)
        
        return PANValidationResponse(
            valid=valid,
            issuer=issuer,
            card_type=card_type,
            masked_pan=masked
        )
    
    async def mask_pan(
        self, 
        request: PANMaskRequest
    ) -> PANMaskResponse:
        """Mask a PAN according to PCI requirements."""
        pan = re.sub(r'\D', '', request.pan)
        original_length = len(pan)
        
        if len(pan) < request.visible_first + request.visible_last:
            masked = request.mask_char * len(pan)
        else:
            first = pan[:request.visible_first]
            last = pan[-request.visible_last:] if request.visible_last > 0 else ''
            middle_len = len(pan) - request.visible_first - request.visible_last
            masked = first + (request.mask_char * middle_len) + last
        
        return PANMaskResponse(
            masked_pan=masked,
            original_length=original_length
        )
    
    async def run_assessment(
        self, 
        request: AssessmentRequest
    ) -> AssessmentResponse:
        """Run a PCI DSS compliance assessment."""
        assessment_id = f"assess_{self._generate_id()}"
        
        requirements_to_check = request.requirements or [r.id for r in self.REQUIREMENTS]
        results: List[RequirementResult] = []
        
        for req_id in requirements_to_check:
            req = next((r for r in self.REQUIREMENTS if r.id == req_id), None)
            if req:
                # Mock assessment - in production, this would do actual checks
                results.append(RequirementResult(
                    requirement_id=req_id,
                    description=req.description,
                    status=ComplianceStatus.COMPLIANT,
                    findings=None,
                    remediation=None
                ))
        
        compliant = sum(1 for r in results if r.status == ComplianceStatus.COMPLIANT)
        non_compliant = sum(1 for r in results if r.status == ComplianceStatus.NON_COMPLIANT)
        
        overall = ComplianceStatus.COMPLIANT
        if non_compliant > 0:
            overall = ComplianceStatus.NON_COMPLIANT if non_compliant > compliant else ComplianceStatus.PARTIAL
        
        return AssessmentResponse(
            assessment_id=assessment_id,
            saq_type=request.saq_type,
            overall_status=overall,
            requirements=results,
            compliant_count=compliant,
            non_compliant_count=non_compliant,
            completed_at=datetime.utcnow()
        )
    
    async def get_requirements(self) -> RequirementsResponse:
        """Get all PCI DSS requirements."""
        return RequirementsResponse(
            requirements=self.REQUIREMENTS,
            total_count=len(self.REQUIREMENTS),
            version="4.0"
        )
    
    async def run_scan(
        self, 
        request: ScanRequest
    ) -> ScanResponse:
        """Initiate a vulnerability scan."""
        scan_id = f"scan_{self._generate_id()}"
        
        return ScanResponse(
            scan_id=scan_id,
            status=ScanStatus.PENDING,
            target=request.target,
            vulnerabilities=None,
            started_at=datetime.utcnow()
        )
    
    def _luhn_check(self, pan: str) -> bool:
        """Validate PAN using Luhn algorithm."""
        def digits_of(n):
            return [int(d) for d in str(n)]
        
        digits = digits_of(pan)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        
        return checksum % 10 == 0
    
    def _mask_pan(self, pan: str, visible_first: int = 6, visible_last: int = 4) -> str:
        """Mask PAN with default PCI-compliant settings."""
        if len(pan) <= visible_first + visible_last:
            return '*' * len(pan)
        
        first = pan[:visible_first]
        last = pan[-visible_last:]
        middle = '*' * (len(pan) - visible_first - visible_last)
        
        return first + middle + last
    
    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
