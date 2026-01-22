"""
SOX Compliance Suite - Business Logic Service
"""

import os
import hashlib
from typing import Optional, List, Dict
from datetime import datetime, date
from .schemas import (
    ControlRequest,
    ControlResponse,
    ControlListResponse,
    ControlTestRequest,
    ControlTestResponse,
    SODCheckRequest,
    SODCheckResponse,
    SODConflict,
    DeficiencyRequest,
    DeficiencyResponse,
    AuditTrailEntry,
    AuditTrailResponse,
    ControlStatus,
    TestResult
)


class SOXService:
    """
    SOX compliance service.
    Handles controls, testing, SOD checks, and deficiency management.
    """
    
    # SOD conflict matrix (simplified)
    SOD_CONFLICTS = {
        'initiator': ['approver', 'reconciler'],
        'approver': ['initiator', 'processor'],
        'processor': ['approver', 'reconciler'],
        'reconciler': ['initiator', 'processor'],
    }
    
    def __init__(self):
        self.company_id = os.getenv("SOX_COMPANY_ID", "")
        self._controls: Dict[str, ControlResponse] = {}
        self._tests: List[ControlTestResponse] = []
        self._deficiencies: List[DeficiencyResponse] = []
        self._audit_trail: List[AuditTrailEntry] = []
        
    async def create_control(
        self, 
        request: ControlRequest
    ) -> ControlResponse:
        """Create a new SOX control."""
        control_id = f"ctrl_{self._generate_id()}"
        
        control = ControlResponse(
            id=control_id,
            name=request.name,
            description=request.description,
            control_type=request.control_type,
            frequency=request.frequency,
            owner_id=request.owner_id,
            process_area=request.process_area,
            status=ControlStatus.ACTIVE,
            created_at=datetime.utcnow(),
            last_tested=None
        )
        
        self._controls[control_id] = control
        await self._log_audit("create", "control", control_id, request.owner_id)
        
        return control
    
    async def list_controls(
        self,
        page: int = 1,
        page_size: int = 20,
        process_area: Optional[str] = None
    ) -> ControlListResponse:
        """List all controls."""
        controls = list(self._controls.values())
        
        if process_area:
            controls = [c for c in controls if c.process_area == process_area]
        
        total = len(controls)
        start = (page - 1) * page_size
        end = start + page_size
        
        return ControlListResponse(
            controls=controls[start:end],
            total_count=total,
            page=page,
            page_size=page_size
        )
    
    async def log_control_test(
        self, 
        request: ControlTestRequest
    ) -> ControlTestResponse:
        """Log a control test result."""
        test_id = f"test_{self._generate_id()}"
        
        test = ControlTestResponse(
            id=test_id,
            control_id=request.control_id,
            test_date=request.test_date,
            tester_id=request.tester_id,
            result=request.result,
            exceptions_found=request.exceptions_found,
            created_at=datetime.utcnow()
        )
        
        self._tests.append(test)
        
        # Update control last_tested
        if request.control_id in self._controls:
            self._controls[request.control_id].last_tested = datetime.utcnow()
        
        await self._log_audit("test", "control", request.control_id, request.tester_id)
        
        return test
    
    async def check_sod(
        self, 
        request: SODCheckRequest
    ) -> SODCheckResponse:
        """Check for segregation of duties conflicts."""
        conflicts: List[SODConflict] = []
        
        proposed_lower = request.proposed_role.lower()
        conflicting_roles = self.SOD_CONFLICTS.get(proposed_lower, [])
        
        # In production, this would check user's existing roles
        # For now, return potential conflicts
        for role in conflicting_roles:
            conflicts.append(SODConflict(
                conflicting_role=role,
                risk_level="high" if role in ['approver', 'initiator'] else "medium",
                description=f"Cannot combine {request.proposed_role} with {role}"
            ))
        
        return SODCheckResponse(
            has_conflicts=len(conflicts) > 0,
            conflicts=conflicts,
            user_id=request.user_id,
            proposed_role=request.proposed_role,
            checked_at=datetime.utcnow()
        )
    
    async def report_deficiency(
        self, 
        request: DeficiencyRequest
    ) -> DeficiencyResponse:
        """Report a control deficiency."""
        deficiency_id = f"def_{self._generate_id()}"
        
        deficiency = DeficiencyResponse(
            id=deficiency_id,
            control_id=request.control_id,
            description=request.description,
            severity=request.severity,
            status="open",
            identified_date=request.identified_date,
            target_remediation_date=request.target_remediation_date,
            created_at=datetime.utcnow()
        )
        
        self._deficiencies.append(deficiency)
        await self._log_audit("report", "deficiency", deficiency_id, request.identified_by)
        
        return deficiency
    
    async def get_audit_trail(
        self,
        page: int = 1,
        page_size: int = 50,
        entity_type: Optional[str] = None
    ) -> AuditTrailResponse:
        """Get audit trail entries."""
        entries = self._audit_trail
        
        if entity_type:
            entries = [e for e in entries if e.entity_type == entity_type]
        
        total = len(entries)
        start = (page - 1) * page_size
        end = start + page_size
        
        return AuditTrailResponse(
            entries=entries[start:end],
            total_count=total,
            page=page,
            page_size=page_size
        )
    
    async def _log_audit(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: str
    ) -> None:
        """Log an audit trail entry."""
        entry = AuditTrailEntry(
            id=f"audit_{self._generate_id()}",
            timestamp=datetime.utcnow(),
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id
        )
        self._audit_trail.append(entry)
    
    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
