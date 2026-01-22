"""
FedRAMP Compliance Suite - Business Logic Service
"""

import os
import hashlib
from typing import Optional, List, Dict
from datetime import datetime, date
from .schemas import (
    ControlAssessmentRequest,
    ControlAssessmentResponse,
    ControlListResponse,
    FedRAMPControl,
    POAMRequest,
    POAMResponse,
    POAMListResponse,
    ConMonRequest,
    ConMonResponse,
    VulnerabilitySummary,
    ImpactLevel,
    ControlFamily,
    ImplementationStatus,
    POAMStatus
)


class FedRAMPService:
    """
    FedRAMP compliance service.
    Handles control assessment, POA&M management, and continuous monitoring.
    """
    
    # Sample FedRAMP controls
    CONTROLS = [
        FedRAMPControl(
            id="AC-2",
            family=ControlFamily.AC,
            title="Account Management",
            description="Manage system accounts including establishing, activating, modifying, reviewing, disabling, and removing accounts.",
            baseline_impact=[ImpactLevel.LOW, ImpactLevel.MODERATE, ImpactLevel.HIGH]
        ),
        FedRAMPControl(
            id="AC-3",
            family=ControlFamily.AC,
            title="Access Enforcement",
            description="Enforce approved authorizations for logical access to information and system resources.",
            baseline_impact=[ImpactLevel.LOW, ImpactLevel.MODERATE, ImpactLevel.HIGH]
        ),
        FedRAMPControl(
            id="IA-2",
            family=ControlFamily.IA,
            title="Identification and Authentication",
            description="Uniquely identify and authenticate organizational users.",
            baseline_impact=[ImpactLevel.LOW, ImpactLevel.MODERATE, ImpactLevel.HIGH]
        ),
        FedRAMPControl(
            id="IA-2(1)",
            family=ControlFamily.IA,
            title="Multi-Factor Authentication",
            description="Implement multi-factor authentication for network access to privileged accounts.",
            baseline_impact=[ImpactLevel.MODERATE, ImpactLevel.HIGH]
        ),
        FedRAMPControl(
            id="SC-8",
            family=ControlFamily.SC,
            title="Transmission Confidentiality and Integrity",
            description="Protect the confidentiality and integrity of transmitted information.",
            baseline_impact=[ImpactLevel.MODERATE, ImpactLevel.HIGH]
        ),
    ]
    
    def __init__(self):
        self.system_id = os.getenv("FEDRAMP_SYSTEM_ID", "")
        self.impact_level = os.getenv("FEDRAMP_IMPACT_LEVEL", "moderate")
        self._poam_items: List[POAMResponse] = []
        
    async def assess_control(
        self, 
        request: ControlAssessmentRequest
    ) -> ControlAssessmentResponse:
        """Assess a control implementation."""
        assessment_id = f"assess_{self._generate_id()}"
        
        # Basic assessment logic
        status = ImplementationStatus.IMPLEMENTED
        gaps = []
        recommendations = []
        
        # Check implementation length as basic quality check
        if len(request.implementation) < 100:
            status = ImplementationStatus.PARTIALLY_IMPLEMENTED
            gaps.append("Implementation description lacks detail")
            recommendations.append("Provide more detailed implementation steps")
        
        if not request.evidence:
            recommendations.append("Attach supporting evidence")
        
        return ControlAssessmentResponse(
            assessment_id=assessment_id,
            control_id=request.control_id,
            status=status,
            gaps=gaps if gaps else None,
            recommendations=recommendations if recommendations else None,
            assessed_at=datetime.utcnow()
        )
    
    async def list_controls(
        self,
        baseline: ImpactLevel = ImpactLevel.MODERATE,
        family: Optional[ControlFamily] = None
    ) -> ControlListResponse:
        """List controls for a given baseline."""
        controls = [
            c for c in self.CONTROLS 
            if baseline in c.baseline_impact
        ]
        
        if family:
            controls = [c for c in controls if c.family == family]
        
        return ControlListResponse(
            controls=controls,
            total_count=len(controls),
            baseline=baseline
        )
    
    async def create_poam(
        self, 
        request: POAMRequest
    ) -> POAMResponse:
        """Create a POA&M item."""
        poam_id = f"poam_{self._generate_id()}"
        
        poam = POAMResponse(
            id=poam_id,
            weakness=request.weakness,
            control_id=request.control_id,
            status=POAMStatus.OPEN,
            risk_level=request.risk_level,
            milestone=request.milestone,
            scheduled_completion_date=request.scheduled_completion_date,
            created_at=datetime.utcnow()
        )
        
        self._poam_items.append(poam)
        return poam
    
    async def list_poam(
        self,
        status: Optional[POAMStatus] = None
    ) -> POAMListResponse:
        """List POA&M items."""
        items = self._poam_items
        
        if status:
            items = [i for i in items if i.status == status]
        
        open_count = sum(1 for i in self._poam_items if i.status == POAMStatus.OPEN)
        overdue_count = sum(
            1 for i in self._poam_items 
            if i.status != POAMStatus.COMPLETED 
            and i.scheduled_completion_date < date.today()
        )
        
        return POAMListResponse(
            items=items,
            total_count=len(items),
            open_count=open_count,
            overdue_count=overdue_count
        )
    
    async def run_conmon(
        self, 
        request: ConMonRequest
    ) -> ConMonResponse:
        """Run continuous monitoring report."""
        report_id = f"conmon_{self._generate_id()}"
        
        # Mock vulnerability summary
        vulns = VulnerabilitySummary(
            critical=0,
            high=2,
            moderate=5,
            low=12,
            total=19
        )
        
        return ConMonResponse(
            report_id=report_id,
            period=f"{request.month} {request.year}",
            vulnerabilities=vulns,
            new_poam_items=1,
            closed_poam_items=2,
            control_changes=0,
            significant_changes=False,
            generated_at=datetime.utcnow()
        )
    
    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
