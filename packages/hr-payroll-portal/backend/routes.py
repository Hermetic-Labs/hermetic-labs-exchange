"""
HR & Payroll Portal - FastAPI Routes

Endpoints:
- /hr/status - Health check
- /hr/employees - Employee CRUD
- /hr/departments - Department CRUD
- /hr/payroll - Payroll calculation and pay stubs
- /hr/jobs - Job posting management
"""

from typing import Optional, List, Dict, Any
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File

from .schemas import (
    # Employee
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    # Department
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    # Payroll
    PayrollInput,
    PayrollResult,
    PayStub,
    # Job postings
    JobPosting,
    JobPostingCreate,
    JobPostingStatus,
    # Responses
    StatusResponse,
    PaginatedResponse,
    BulkUploadResult,
)
from .service import HRService, PayrollService
from .storage import JsonFileStorage, get_storage
import os


# Create router with /hr prefix
router = APIRouter(
    prefix="/hr",
    tags=["hr-payroll"]
)


# ============================================================================
# Dependency Injection - Persistent Storage
# ============================================================================

# Singleton instances with persistent storage
_hr_service: Optional[HRService] = None
_payroll_service: Optional[PayrollService] = None
_storage: Optional[JsonFileStorage] = None


def get_persistent_storage() -> JsonFileStorage:
    """Get persistent storage instance."""
    global _storage
    if _storage is None:
        # Store data in user's app data directory or local data folder
        data_dir = os.environ.get("HR_DATA_DIR", "./data")
        filepath = os.path.join(data_dir, "hr_data.json")
        _storage = get_storage("json", filepath=filepath)
    return _storage


def get_hr_service() -> HRService:
    """Get HRService instance with persistent storage."""
    global _hr_service
    if _hr_service is None:
        storage = get_persistent_storage()
        _hr_service = HRService(storage=storage)
    return _hr_service


def get_payroll_service() -> PayrollService:
    """Get PayrollService instance with persistent storage."""
    global _payroll_service
    if _payroll_service is None:
        storage = get_persistent_storage()
        _payroll_service = PayrollService(storage=storage)
    return _payroll_service


# ============================================================================
# Status Endpoint
# ============================================================================

@router.get("/status", response_model=StatusResponse)
async def get_status(
    service: HRService = Depends(get_hr_service)
) -> StatusResponse:
    """Get HR service status and health check."""
    return await service.get_status()


# ============================================================================
# Employee Endpoints
# ============================================================================

@router.post("/employees", response_model=Employee, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    service: HRService = Depends(get_hr_service)
) -> Employee:
    """
    Create a new employee.

    - **name**: Full name (required)
    - **email**: Work email (required)
    - **department_id**: Department reference (required)
    - **position**: Job title (required)
    - **salary**: Annual salary (required)
    - **start_date**: Employment start date (required)
    """
    try:
        return await service.create_employee(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/employees", response_model=PaginatedResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    service: HRService = Depends(get_hr_service)
) -> PaginatedResponse:
    """
    List employees with pagination and optional filters.

    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 20, max: 100)
    - **department_id**: Filter by department
    - **status**: Filter by status (active, inactive, on_leave, terminated)
    """
    return await service.list_employees(page, per_page, department_id, status)


@router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(
    employee_id: str,
    service: HRService = Depends(get_hr_service)
) -> Employee:
    """Get employee by ID."""
    employee = await service.get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str,
    updates: EmployeeUpdate,
    service: HRService = Depends(get_hr_service)
) -> Employee:
    """Update an employee. Only provided fields will be updated."""
    employee = await service.update_employee(employee_id, updates)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    service: HRService = Depends(get_hr_service)
) -> Dict[str, Any]:
    """Delete an employee."""
    success = await service.delete_employee(employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"success": True, "message": f"Employee {employee_id} deleted"}


# ============================================================================
# Department Endpoints
# ============================================================================

@router.post("/departments", response_model=Department, status_code=201)
async def create_department(
    data: DepartmentCreate,
    service: HRService = Depends(get_hr_service)
) -> Department:
    """Create a new department."""
    try:
        return await service.create_department(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/departments", response_model=PaginatedResponse)
async def list_departments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    service: HRService = Depends(get_hr_service)
) -> PaginatedResponse:
    """List all departments."""
    return await service.list_departments(page, per_page)


@router.get("/departments/{dept_id}", response_model=Department)
async def get_department(
    dept_id: str,
    service: HRService = Depends(get_hr_service)
) -> Department:
    """Get department by ID."""
    dept = await service.get_department(dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.put("/departments/{dept_id}", response_model=Department)
async def update_department(
    dept_id: str,
    updates: DepartmentUpdate,
    service: HRService = Depends(get_hr_service)
) -> Department:
    """Update a department."""
    dept = await service.update_department(dept_id, updates)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: str,
    service: HRService = Depends(get_hr_service)
) -> Dict[str, Any]:
    """Delete a department. Fails if department has employees."""
    try:
        success = await service.delete_department(dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Department not found")
        return {"success": True, "message": f"Department {dept_id} deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Payroll Endpoints
# ============================================================================

@router.post("/payroll/calculate", response_model=PayrollResult)
async def calculate_payroll(
    input: PayrollInput,
) -> PayrollResult:
    """
    Calculate payroll for a single employee.

    This is a pure calculation - no data is stored.
    Use this for "what-if" scenarios or preview before running payroll.
    """
    return PayrollService.calculate(input)


@router.post("/payroll/run", response_model=List[PayrollResult])
async def run_payroll(
    employee_ids: List[str],
    pay_period_start: date,
    pay_period_end: date,
    hours_map: Optional[Dict[str, Dict[str, float]]] = None,
    service: PayrollService = Depends(get_payroll_service)
) -> List[PayrollResult]:
    """
    Run payroll for multiple employees.

    - **employee_ids**: List of employee IDs to process
    - **pay_period_start**: Start of pay period
    - **pay_period_end**: End of pay period
    - **hours_map**: Optional dict of {employee_id: {hours_worked, overtime_hours}}
    """
    return await service.run_payroll(employee_ids, pay_period_start, pay_period_end, hours_map)


@router.post("/payroll/stubs", response_model=PayStub, status_code=201)
async def create_pay_stub(
    payroll_result: PayrollResult,
    processed_by: Optional[str] = None,
    service: PayrollService = Depends(get_payroll_service)
) -> PayStub:
    """Create and store a pay stub from a payroll calculation."""
    return await service.create_pay_stub(payroll_result, processed_by)


@router.get("/payroll/stubs", response_model=List[PayStub])
async def list_pay_stubs(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    service: PayrollService = Depends(get_payroll_service)
) -> List[PayStub]:
    """List pay stubs with optional filters."""
    return await service.list_pay_stubs(employee_id, status)


# ============================================================================
# Job Posting Endpoints
# ============================================================================

@router.post("/jobs", response_model=JobPosting, status_code=201)
async def create_job_posting(
    data: JobPostingCreate,
    service: HRService = Depends(get_hr_service)
) -> JobPosting:
    """Create a new job posting (starts as draft)."""
    return await service.create_job_posting(data)


@router.get("/jobs", response_model=List[JobPosting])
async def list_job_postings(
    status: Optional[str] = None,
    department_id: Optional[str] = None,
    service: HRService = Depends(get_hr_service)
) -> List[JobPosting]:
    """List job postings with optional filters."""
    return await service.list_job_postings(status, department_id)


@router.put("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    status: JobPostingStatus,
    service: HRService = Depends(get_hr_service)
) -> JobPosting:
    """Update job posting status (draft, open, closed, filled)."""
    result = await service.update_job_status(job_id, status)
    if not result:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return result


# ============================================================================
# Bulk Upload Endpoint
# ============================================================================

@router.post("/employees/bulk", response_model=BulkUploadResult)
async def bulk_upload_employees(
    file: UploadFile = File(...),
    service: HRService = Depends(get_hr_service)
) -> BulkUploadResult:
    """
    Bulk upload employees from CSV file.

    Expected columns: name, email, department_id, position, salary, start_date

    Returns summary of imported/failed rows.
    """
    import csv
    from io import StringIO

    # Read file content
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")

    # Parse CSV
    reader = csv.DictReader(StringIO(text))
    required_cols = {"name", "email", "department_id", "position", "salary", "start_date"}

    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns. Expected: {required_cols}"
        )

    imported = 0
    failed = 0
    errors = []

    for i, row in enumerate(reader, start=2):  # Start at 2 (1 = header)
        try:
            emp_data = EmployeeCreate(
                name=row["name"].strip(),
                email=row["email"].strip(),
                department_id=row["department_id"].strip(),
                position=row["position"].strip(),
                salary=Decimal(row["salary"].strip()),
                start_date=date.fromisoformat(row["start_date"].strip()),
            )
            await service.create_employee(emp_data)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append({"row": i, "error": str(e), "data": row})

    return BulkUploadResult(
        success=failed == 0,
        total_rows=imported + failed,
        imported=imported,
        failed=failed,
        errors=errors[:10],  # Limit to first 10 errors
    )
