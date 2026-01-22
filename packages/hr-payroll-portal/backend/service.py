"""
HR & Payroll Portal - Business Logic Services

Two main services:
1. HRService - Employee and department CRUD operations
2. PayrollService - Payroll calculation (pure functions, no side effects)

Design for Remixability:
- Services are stateless (use injected storage)
- PayrollService.calculate() is a pure function
- All methods return structured responses
"""

from typing import Dict, Any, Optional, List, Protocol
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import time
import uuid

from .schemas import (
    # Employee
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeStatus,
    # Department
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    # Payroll
    PayrollInput,
    PayrollResult,
    PayStub,
    TaxConfig,
    DeductionConfig,
    # Job postings
    JobPosting,
    JobPostingCreate,
    JobPostingStatus,
    # Responses
    StatusResponse,
    PaginatedResponse,
    BulkUploadResult,
)


# Track service start time
_start_time = time.time()


# ============================================================================
# Storage Protocol (for dependency injection)
# ============================================================================

class StorageProtocol(Protocol):
    """
    Protocol for storage backends - allows swapping in-memory, database, etc.

    Remix usage:
        class CosmosStorage(StorageProtocol):
            async def get(self, collection: str, id: str) -> Optional[Dict]: ...
    """

    async def get(self, collection: str, id: str) -> Optional[Dict[str, Any]]: ...
    async def list(self, collection: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]: ...
    async def create(self, collection: str, data: Dict[str, Any]) -> Dict[str, Any]: ...
    async def update(self, collection: str, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...
    async def delete(self, collection: str, id: str) -> bool: ...


class InMemoryStorage:
    """Simple in-memory storage for development/testing."""

    def __init__(self):
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {
            "employees": {},
            "departments": {},
            "paystubs": {},
            "job_postings": {},
        }
        self._seed_data()

    def _seed_data(self):
        """Seed with sample data for development."""
        # Sample departments
        self._data["departments"] = {
            "dept_1": {
                "id": "dept_1",
                "name": "Engineering",
                "head_id": "emp_1",
                "budget": 500000,
                "description": "Software development team",
                "cost_center": "CC-100",
                "employee_count": 3,
                "created_at": datetime.utcnow().isoformat(),
            },
            "dept_2": {
                "id": "dept_2",
                "name": "Sales",
                "head_id": "emp_4",
                "budget": 300000,
                "description": "Sales and business development",
                "cost_center": "CC-200",
                "employee_count": 2,
                "created_at": datetime.utcnow().isoformat(),
            },
            "dept_3": {
                "id": "dept_3",
                "name": "Human Resources",
                "head_id": None,
                "budget": 150000,
                "description": "HR and talent management",
                "cost_center": "CC-300",
                "employee_count": 1,
                "created_at": datetime.utcnow().isoformat(),
            },
        }

        # Sample employees
        self._data["employees"] = {
            "emp_1": {
                "id": "emp_1",
                "name": "Alice Johnson",
                "email": "alice@company.com",
                "department_id": "dept_1",
                "position": "Senior Engineer",
                "salary": 120000,
                "hourly_rate": 57.69,
                "start_date": "2020-03-15",
                "status": "active",
                "phone": "555-0101",
                "created_at": datetime.utcnow().isoformat(),
            },
            "emp_2": {
                "id": "emp_2",
                "name": "Bob Smith",
                "email": "bob@company.com",
                "department_id": "dept_1",
                "position": "Software Engineer",
                "salary": 95000,
                "hourly_rate": 45.67,
                "start_date": "2021-06-01",
                "status": "active",
                "phone": "555-0102",
                "created_at": datetime.utcnow().isoformat(),
            },
            "emp_3": {
                "id": "emp_3",
                "name": "Carol Williams",
                "email": "carol@company.com",
                "department_id": "dept_1",
                "position": "Junior Developer",
                "salary": 70000,
                "hourly_rate": 33.65,
                "start_date": "2023-01-10",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            "emp_4": {
                "id": "emp_4",
                "name": "David Brown",
                "email": "david@company.com",
                "department_id": "dept_2",
                "position": "Sales Manager",
                "salary": 110000,
                "hourly_rate": 52.88,
                "start_date": "2019-08-20",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            "emp_5": {
                "id": "emp_5",
                "name": "Eva Martinez",
                "email": "eva@company.com",
                "department_id": "dept_2",
                "position": "Sales Representative",
                "salary": 65000,
                "hourly_rate": 31.25,
                "start_date": "2022-04-01",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            "emp_6": {
                "id": "emp_6",
                "name": "Frank Lee",
                "email": "frank@company.com",
                "department_id": "dept_3",
                "position": "HR Coordinator",
                "salary": 55000,
                "hourly_rate": 26.44,
                "start_date": "2023-09-15",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
        }

        # Sample job postings
        self._data["job_postings"] = {
            "job_1": {
                "id": "job_1",
                "title": "Full Stack Developer",
                "department_id": "dept_1",
                "location": "Remote",
                "job_type": "full-time",
                "salary_range": "$80,000 - $110,000",
                "status": "open",
                "posted_date": datetime.utcnow().isoformat(),
                "applicant_count": 12,
                "created_at": datetime.utcnow().isoformat(),
            },
            "job_2": {
                "id": "job_2",
                "title": "Sales Development Rep",
                "department_id": "dept_2",
                "location": "New York, NY",
                "job_type": "full-time",
                "salary_range": "$50,000 - $70,000",
                "status": "open",
                "posted_date": datetime.utcnow().isoformat(),
                "applicant_count": 8,
                "created_at": datetime.utcnow().isoformat(),
            },
        }

    async def get(self, collection: str, id: str) -> Optional[Dict[str, Any]]:
        return self._data.get(collection, {}).get(id)

    async def list(self, collection: str, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        items = list(self._data.get(collection, {}).values())
        if filters:
            for key, value in filters.items():
                items = [i for i in items if i.get(key) == value]
        return items

    async def create(self, collection: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if collection not in self._data:
            self._data[collection] = {}
        self._data[collection][data["id"]] = data
        return data

    async def update(self, collection: str, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if id not in self._data.get(collection, {}):
            return None
        self._data[collection][id].update(data)
        self._data[collection][id]["updated_at"] = datetime.utcnow().isoformat()
        return self._data[collection][id]

    async def delete(self, collection: str, id: str) -> bool:
        if id in self._data.get(collection, {}):
            del self._data[collection][id]
            return True
        return False


# ============================================================================
# HR Service
# ============================================================================

class HRService:
    """
    Core HR service for employee and department management.

    Usage:
        service = HRService(storage)
        employee = await service.create_employee(EmployeeCreate(...))
    """

    def __init__(self, storage: Optional[StorageProtocol] = None, seed_if_empty: bool = True):
        self.storage = storage or InMemoryStorage()
        self._seed_if_empty = seed_if_empty
        self._seeded = False

    async def _ensure_seed_data(self):
        """Seed initial data if storage is empty (first run)."""
        if self._seeded or not self._seed_if_empty:
            return

        # Check if we already have data
        employees = await self.storage.list("employees")
        if employees:
            self._seeded = True
            return

        # Seed sample departments
        departments = [
            {
                "id": "dept_1",
                "name": "Engineering",
                "head_id": "emp_1",
                "budget": 500000,
                "description": "Software development team",
                "cost_center": "CC-100",
                "employee_count": 3,
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "dept_2",
                "name": "Sales",
                "head_id": "emp_4",
                "budget": 300000,
                "description": "Sales and business development",
                "cost_center": "CC-200",
                "employee_count": 2,
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "dept_3",
                "name": "Human Resources",
                "head_id": None,
                "budget": 150000,
                "description": "HR and talent management",
                "cost_center": "CC-300",
                "employee_count": 1,
                "created_at": datetime.utcnow().isoformat(),
            },
        ]

        for dept in departments:
            await self.storage.create("departments", dept)

        # Seed sample employees
        employees_data = [
            {
                "id": "emp_1",
                "name": "Alice Johnson",
                "email": "alice@company.com",
                "department_id": "dept_1",
                "department_name": "Engineering",
                "position": "Senior Engineer",
                "salary": 120000,
                "hourly_rate": 57.69,
                "start_date": "2020-03-15",
                "status": "active",
                "phone": "555-0101",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "emp_2",
                "name": "Bob Smith",
                "email": "bob@company.com",
                "department_id": "dept_1",
                "department_name": "Engineering",
                "position": "Software Engineer",
                "salary": 95000,
                "hourly_rate": 45.67,
                "start_date": "2021-06-01",
                "status": "active",
                "phone": "555-0102",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "emp_3",
                "name": "Carol Williams",
                "email": "carol@company.com",
                "department_id": "dept_1",
                "department_name": "Engineering",
                "position": "Junior Developer",
                "salary": 70000,
                "hourly_rate": 33.65,
                "start_date": "2023-01-10",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "emp_4",
                "name": "David Brown",
                "email": "david@company.com",
                "department_id": "dept_2",
                "department_name": "Sales",
                "position": "Sales Manager",
                "salary": 110000,
                "hourly_rate": 52.88,
                "start_date": "2019-08-20",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "emp_5",
                "name": "Eva Martinez",
                "email": "eva@company.com",
                "department_id": "dept_2",
                "department_name": "Sales",
                "position": "Sales Representative",
                "salary": 65000,
                "hourly_rate": 31.25,
                "start_date": "2022-04-01",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "emp_6",
                "name": "Frank Lee",
                "email": "frank@company.com",
                "department_id": "dept_3",
                "department_name": "Human Resources",
                "position": "HR Coordinator",
                "salary": 55000,
                "hourly_rate": 26.44,
                "start_date": "2023-09-15",
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
            },
        ]

        for emp in employees_data:
            await self.storage.create("employees", emp)

        # Seed sample job postings
        job_postings = [
            {
                "id": "job_1",
                "title": "Full Stack Developer",
                "department_id": "dept_1",
                "department_name": "Engineering",
                "location": "Remote",
                "job_type": "full-time",
                "salary_range": "$80,000 - $110,000",
                "status": "open",
                "posted_date": datetime.utcnow().isoformat(),
                "applicant_count": 12,
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "job_2",
                "title": "Sales Development Rep",
                "department_id": "dept_2",
                "department_name": "Sales",
                "location": "New York, NY",
                "job_type": "full-time",
                "salary_range": "$50,000 - $70,000",
                "status": "open",
                "posted_date": datetime.utcnow().isoformat(),
                "applicant_count": 8,
                "created_at": datetime.utcnow().isoformat(),
            },
        ]

        for job in job_postings:
            await self.storage.create("job_postings", job)

        self._seeded = True

    # ========================================================================
    # Status
    # ========================================================================

    async def get_status(self) -> StatusResponse:
        """Get service health status."""
        await self._ensure_seed_data()
        uptime = time.time() - _start_time
        employees = await self.storage.list("employees")
        departments = await self.storage.list("departments")

        return StatusResponse(
            status="ok",
            version="1.0.0",
            uptime_seconds=uptime,
            details={
                "employee_count": len(employees),
                "department_count": len(departments),
            }
        )

    # ========================================================================
    # Employee CRUD
    # ========================================================================

    async def create_employee(self, data: EmployeeCreate) -> Employee:
        """Create a new employee."""
        employee_id = f"emp_{uuid.uuid4().hex[:8]}"

        # Auto-calculate hourly rate if not provided (annual / 2080 hours)
        hourly_rate = data.hourly_rate
        if hourly_rate is None:
            hourly_rate = Decimal(str(data.salary)) / Decimal("2080")

        # Resolve department name
        dept = await self.storage.get("departments", data.department_id)
        dept_name = dept["name"] if dept else None

        employee_data = {
            "id": employee_id,
            **data.model_dump(),
            "hourly_rate": float(hourly_rate),
            "salary": float(data.salary),
            "department_name": dept_name,
            "start_date": data.start_date.isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

        await self.storage.create("employees", employee_data)

        # Update department employee count
        if dept:
            await self._update_department_count(data.department_id)

        return Employee(**employee_data)

    async def get_employee(self, employee_id: str) -> Optional[Employee]:
        """Get employee by ID."""
        data = await self.storage.get("employees", employee_id)
        if not data:
            return None
        return Employee(**data)

    async def update_employee(self, employee_id: str, updates: EmployeeUpdate) -> Optional[Employee]:
        """Update an employee."""
        existing = await self.storage.get("employees", employee_id)
        if not existing:
            return None

        # Get only the fields that were actually set
        update_data = updates.model_dump(exclude_unset=True)

        # Handle date conversion
        if "start_date" in update_data and update_data["start_date"]:
            update_data["start_date"] = update_data["start_date"].isoformat()

        # Handle decimal conversion
        for field in ["salary", "hourly_rate"]:
            if field in update_data and update_data[field] is not None:
                update_data[field] = float(update_data[field])

        # If department changed, resolve new name
        if "department_id" in update_data:
            dept = await self.storage.get("departments", update_data["department_id"])
            update_data["department_name"] = dept["name"] if dept else None
            # Update counts for both old and new departments
            old_dept_id = existing.get("department_id")
            if old_dept_id != update_data["department_id"]:
                await self._update_department_count(old_dept_id)
                await self._update_department_count(update_data["department_id"])

        result = await self.storage.update("employees", employee_id, update_data)
        return Employee(**result) if result else None

    async def delete_employee(self, employee_id: str) -> bool:
        """Delete an employee."""
        existing = await self.storage.get("employees", employee_id)
        if existing:
            dept_id = existing.get("department_id")
            result = await self.storage.delete("employees", employee_id)
            if result and dept_id:
                await self._update_department_count(dept_id)
            return result
        return False

    async def list_employees(
        self,
        page: int = 1,
        per_page: int = 20,
        department_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> PaginatedResponse:
        """List employees with optional filters and pagination."""
        await self._ensure_seed_data()
        filters = {}
        if department_id:
            filters["department_id"] = department_id
        if status:
            filters["status"] = status

        all_employees = await self.storage.list("employees", filters if filters else None)

        # Sort by name
        all_employees.sort(key=lambda x: x.get("name", ""))

        total = len(all_employees)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = all_employees[start:end]

        return PaginatedResponse(
            success=True,
            items=paginated,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page or 1,
        )

    async def _update_department_count(self, department_id: str):
        """Update the employee count for a department."""
        employees = await self.storage.list("employees", {"department_id": department_id})
        active_count = len([e for e in employees if e.get("status") == "active"])
        await self.storage.update("departments", department_id, {"employee_count": active_count})

    # ========================================================================
    # Department CRUD
    # ========================================================================

    async def create_department(self, data: DepartmentCreate) -> Department:
        """Create a new department."""
        dept_id = f"dept_{uuid.uuid4().hex[:8]}"

        # Resolve head name if provided
        head_name = None
        if data.head_id:
            head = await self.storage.get("employees", data.head_id)
            head_name = head["name"] if head else None

        dept_data = {
            "id": dept_id,
            **data.model_dump(),
            "budget": float(data.budget) if data.budget else None,
            "head_name": head_name,
            "employee_count": 0,
            "created_at": datetime.utcnow().isoformat(),
        }

        await self.storage.create("departments", dept_data)
        return Department(**dept_data)

    async def get_department(self, dept_id: str) -> Optional[Department]:
        """Get department by ID."""
        data = await self.storage.get("departments", dept_id)
        if not data:
            return None
        return Department(**data)

    async def update_department(self, dept_id: str, updates: DepartmentUpdate) -> Optional[Department]:
        """Update a department."""
        existing = await self.storage.get("departments", dept_id)
        if not existing:
            return None

        update_data = updates.model_dump(exclude_unset=True)

        # Handle decimal conversion
        if "budget" in update_data and update_data["budget"] is not None:
            update_data["budget"] = float(update_data["budget"])

        # Resolve head name if changed
        if "head_id" in update_data:
            if update_data["head_id"]:
                head = await self.storage.get("employees", update_data["head_id"])
                update_data["head_name"] = head["name"] if head else None
            else:
                update_data["head_name"] = None

        result = await self.storage.update("departments", dept_id, update_data)
        return Department(**result) if result else None

    async def delete_department(self, dept_id: str) -> bool:
        """Delete a department (only if empty)."""
        employees = await self.storage.list("employees", {"department_id": dept_id})
        if employees:
            raise ValueError(f"Cannot delete department with {len(employees)} employees")
        return await self.storage.delete("departments", dept_id)

    async def list_departments(self, page: int = 1, per_page: int = 50) -> PaginatedResponse:
        """List all departments."""
        await self._ensure_seed_data()
        all_depts = await self.storage.list("departments")
        all_depts.sort(key=lambda x: x.get("name", ""))

        total = len(all_depts)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = all_depts[start:end]

        return PaginatedResponse(
            success=True,
            items=paginated,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page or 1,
        )

    # ========================================================================
    # Job Posting CRUD
    # ========================================================================

    async def create_job_posting(self, data: JobPostingCreate) -> JobPosting:
        """Create a new job posting."""
        job_id = f"job_{uuid.uuid4().hex[:8]}"

        dept = await self.storage.get("departments", data.department_id)
        dept_name = dept["name"] if dept else None

        job_data = {
            "id": job_id,
            **data.model_dump(),
            "department_name": dept_name,
            "status": "draft",
            "applicant_count": 0,
            "created_at": datetime.utcnow().isoformat(),
        }

        await self.storage.create("job_postings", job_data)
        return JobPosting(**job_data)

    async def list_job_postings(
        self,
        status: Optional[str] = None,
        department_id: Optional[str] = None,
    ) -> List[JobPosting]:
        """List job postings with optional filters."""
        await self._ensure_seed_data()
        filters = {}
        if status:
            filters["status"] = status
        if department_id:
            filters["department_id"] = department_id

        postings = await self.storage.list("job_postings", filters if filters else None)
        return [JobPosting(**p) for p in postings]

    async def update_job_status(self, job_id: str, status: JobPostingStatus) -> Optional[JobPosting]:
        """Update job posting status."""
        update_data = {"status": status.value}
        if status == JobPostingStatus.OPEN:
            update_data["posted_date"] = datetime.utcnow().isoformat()
        elif status == JobPostingStatus.CLOSED:
            update_data["closed_date"] = datetime.utcnow().isoformat()

        result = await self.storage.update("job_postings", job_id, update_data)
        return JobPosting(**result) if result else None


# ============================================================================
# Payroll Service
# ============================================================================

class PayrollService:
    """
    Payroll calculation service - pure functions for tax/deduction math.

    All calculations use Decimal for precision.

    Remix usage:
        result = PayrollService.calculate(PayrollInput(...))
        # Result is a PayrollResult with all amounts
    """

    def __init__(self, storage: Optional[StorageProtocol] = None):
        self.storage = storage or InMemoryStorage()

    @staticmethod
    def calculate(input: PayrollInput) -> PayrollResult:
        """
        Pure payroll calculation - no side effects.

        This is the core calculation that can be reused anywhere.
        """
        # Ensure we're working with Decimal
        hourly = Decimal(str(input.hourly_rate))
        hours = Decimal(str(input.hours_worked))
        ot_hours = Decimal(str(input.overtime_hours))
        ot_mult = Decimal(str(input.overtime_multiplier))

        # Earnings
        regular_pay = (hourly * hours).quantize(Decimal("0.01"), ROUND_HALF_UP)
        overtime_pay = (hourly * ot_mult * ot_hours).quantize(Decimal("0.01"), ROUND_HALF_UP)
        gross_pay = regular_pay + overtime_pay

        # Taxes
        tax = input.tax_config
        federal_tax = (gross_pay * tax.federal_rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        state_tax = (gross_pay * tax.state_rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        social_security = (gross_pay * tax.social_security_rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        medicare = (gross_pay * tax.medicare_rate / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        total_taxes = federal_tax + state_tax + social_security + medicare

        # Deductions
        ded = input.deduction_config
        health = Decimal(str(ded.health_insurance))
        dental = Decimal(str(ded.dental_insurance))
        vision = Decimal(str(ded.vision_insurance))
        retirement = (gross_pay * ded.retirement_401k_percent / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        hsa = Decimal(str(ded.hsa_contribution))
        other = Decimal(str(ded.other_deductions))
        total_deductions = health + dental + vision + retirement + hsa + other + total_taxes

        # Net pay
        net_pay = (gross_pay - total_deductions).quantize(Decimal("0.01"), ROUND_HALF_UP)

        # Pay period string
        pay_period = f"{input.pay_period_start.isoformat()} to {input.pay_period_end.isoformat()}"

        return PayrollResult(
            employee_id=input.employee_id,
            regular_pay=regular_pay,
            overtime_pay=overtime_pay,
            gross_pay=gross_pay,
            federal_tax=federal_tax,
            state_tax=state_tax,
            social_security=social_security,
            medicare=medicare,
            total_taxes=total_taxes,
            health_insurance=health + dental + vision,
            retirement_401k=retirement,
            other_deductions=hsa + other,
            total_deductions=total_deductions,
            net_pay=net_pay,
            pay_period=pay_period,
        )

    async def run_payroll(
        self,
        employee_ids: List[str],
        pay_period_start: date,
        pay_period_end: date,
        hours_map: Optional[Dict[str, Dict[str, float]]] = None,
    ) -> List[PayrollResult]:
        """
        Run payroll for multiple employees.

        Args:
            employee_ids: List of employee IDs to process
            pay_period_start: Start of pay period
            pay_period_end: End of pay period
            hours_map: Optional dict of {employee_id: {hours_worked, overtime_hours}}
                       If not provided, uses standard 80 hours biweekly

        Returns:
            List of PayrollResult for each employee
        """
        results = []

        for emp_id in employee_ids:
            emp = await self.storage.get("employees", emp_id)
            if not emp or emp.get("status") != "active":
                continue

            # Get hours for this employee
            hours_data = (hours_map or {}).get(emp_id, {})
            hours_worked = Decimal(str(hours_data.get("hours_worked", 80)))
            overtime_hours = Decimal(str(hours_data.get("overtime_hours", 0)))

            input = PayrollInput(
                employee_id=emp_id,
                hourly_rate=Decimal(str(emp.get("hourly_rate", 0))),
                hours_worked=hours_worked,
                overtime_hours=overtime_hours,
                pay_period_start=pay_period_start,
                pay_period_end=pay_period_end,
            )

            result = self.calculate(input)
            result.employee_name = emp.get("name")
            results.append(result)

        return results

    async def create_pay_stub(
        self,
        payroll_result: PayrollResult,
        processed_by: Optional[str] = None,
    ) -> PayStub:
        """Create and store a pay stub from a payroll result."""
        stub_id = f"stub_{uuid.uuid4().hex[:8]}"

        stub = PayStub(
            id=stub_id,
            employee_id=payroll_result.employee_id,
            payroll_result=payroll_result,
            processed_by=processed_by,
            status="pending",
        )

        await self.storage.create("paystubs", stub.model_dump())
        return stub

    async def list_pay_stubs(
        self,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[PayStub]:
        """List pay stubs with optional filters."""
        filters = {}
        if employee_id:
            filters["employee_id"] = employee_id
        if status:
            filters["status"] = status

        stubs = await self.storage.list("paystubs", filters if filters else None)
        return [PayStub(**s) for s in stubs]
