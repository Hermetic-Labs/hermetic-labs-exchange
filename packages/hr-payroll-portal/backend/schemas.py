"""
HR & Payroll Portal - Pydantic Schemas

These schemas are designed for remixability:
- Base models can be extended by other packs
- Calculation models are pure (no side effects)
- All fields have clear documentation

Example remix usage:
    from hr_payroll_portal.schemas import Employee, PayrollInput

    class ContractorEmployee(Employee):
        contract_end_date: datetime
        hourly_only: bool = True
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, computed_field
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class EmployeeStatus(str, Enum):
    """Employee status options."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"


class JobPostingStatus(str, Enum):
    """Job posting status options."""
    OPEN = "open"
    CLOSED = "closed"
    DRAFT = "draft"
    FILLED = "filled"


class PayFrequency(str, Enum):
    """Pay frequency options."""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    SEMIMONTHLY = "semimonthly"
    MONTHLY = "monthly"


# ============================================================================
# Employee Models
# ============================================================================

class EmployeeBase(BaseModel):
    """Base employee fields - shared across create/update/response."""

    name: str = Field(..., min_length=1, max_length=200, description="Full name")
    email: EmailStr = Field(..., description="Work email address")
    department_id: str = Field(..., description="Department ID reference")
    position: str = Field(..., max_length=100, description="Job title/position")
    salary: Decimal = Field(..., ge=0, description="Annual salary in dollars")
    hourly_rate: Optional[Decimal] = Field(None, ge=0, description="Hourly rate (auto-calculated if not set)")
    start_date: date = Field(..., description="Employment start date")
    status: EmployeeStatus = Field(default=EmployeeStatus.ACTIVE)

    # Optional fields for extended HR data
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)


class EmployeeCreate(EmployeeBase):
    """Request model for creating an employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Request model for updating an employee (all fields optional)."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    department_id: Optional[str] = None
    position: Optional[str] = Field(None, max_length=100)
    salary: Optional[Decimal] = Field(None, ge=0)
    hourly_rate: Optional[Decimal] = Field(None, ge=0)
    start_date: Optional[date] = None
    status: Optional[EmployeeStatus] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)


class Employee(EmployeeBase):
    """Full employee model with ID and timestamps."""

    id: str = Field(..., description="Unique employee ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    # Computed from department_id for convenience
    department_name: Optional[str] = Field(None, description="Resolved department name")

    class Config:
        from_attributes = True


class EmployeeResponse(BaseModel):
    """API response wrapper for employee operations."""

    success: bool = True
    data: Optional[Employee] = None
    error: Optional[str] = None


# ============================================================================
# Department Models
# ============================================================================

class DepartmentBase(BaseModel):
    """Base department fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Department name")
    head_id: Optional[str] = Field(None, description="Department head employee ID")
    budget: Optional[Decimal] = Field(None, ge=0, description="Annual department budget")
    description: Optional[str] = Field(None, max_length=500)
    cost_center: Optional[str] = Field(None, max_length=50, description="Cost center code")


class DepartmentCreate(DepartmentBase):
    """Request model for creating a department."""
    pass


class DepartmentUpdate(BaseModel):
    """Request model for updating a department."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    head_id: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    cost_center: Optional[str] = Field(None, max_length=50)


class Department(DepartmentBase):
    """Full department model with computed fields."""

    id: str = Field(..., description="Unique department ID")
    employee_count: int = Field(default=0, description="Number of employees")
    head_name: Optional[str] = Field(None, description="Resolved head employee name")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Tax & Deduction Configuration (Remixable)
# ============================================================================

class TaxConfig(BaseModel):
    """
    Tax configuration - can be overridden per employee or company.

    Remix example:
        class CaliforniaTaxConfig(TaxConfig):
            ca_sdi: Decimal = Decimal("1.1")  # State disability
    """

    federal_rate: Decimal = Field(default=Decimal("12.0"), ge=0, le=100, description="Federal tax %")
    state_rate: Decimal = Field(default=Decimal("5.0"), ge=0, le=100, description="State tax %")
    social_security_rate: Decimal = Field(default=Decimal("6.2"), ge=0, le=100)
    medicare_rate: Decimal = Field(default=Decimal("1.45"), ge=0, le=100)

    # Wage bases / caps
    social_security_wage_base: Decimal = Field(default=Decimal("168600"), description="2024 SS wage base")


class DeductionConfig(BaseModel):
    """
    Employee deduction configuration.

    Remix example:
        class UnionDeductions(DeductionConfig):
            union_dues: Decimal = Decimal("50.0")
    """

    health_insurance: Decimal = Field(default=Decimal("0"), ge=0, description="Per-period health premium")
    dental_insurance: Decimal = Field(default=Decimal("0"), ge=0)
    vision_insurance: Decimal = Field(default=Decimal("0"), ge=0)
    retirement_401k_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, description="401k contribution %")
    hsa_contribution: Decimal = Field(default=Decimal("0"), ge=0, description="HSA per-period contribution")
    other_deductions: Decimal = Field(default=Decimal("0"), ge=0)


# ============================================================================
# Payroll Calculation Models
# ============================================================================

class PayrollInput(BaseModel):
    """
    Input for payroll calculation - pure function, no side effects.

    This model is designed to be reusable:
        result = PayrollService.calculate(PayrollInput(...))
    """

    employee_id: str = Field(..., description="Employee ID for reference")
    hourly_rate: Decimal = Field(..., ge=0)
    hours_worked: Decimal = Field(..., ge=0, le=744, description="Regular hours (max ~31 days * 24)")
    overtime_hours: Decimal = Field(default=Decimal("0"), ge=0)
    overtime_multiplier: Decimal = Field(default=Decimal("1.5"), description="OT rate multiplier")

    # Tax config (use defaults or override)
    tax_config: TaxConfig = Field(default_factory=TaxConfig)
    deduction_config: DeductionConfig = Field(default_factory=DeductionConfig)

    # Pay period info
    pay_period_start: date = Field(..., description="Pay period start date")
    pay_period_end: date = Field(..., description="Pay period end date")
    pay_frequency: PayFrequency = Field(default=PayFrequency.BIWEEKLY)


class PayrollResult(BaseModel):
    """
    Result of payroll calculation - all amounts in dollars.

    This is a pure calculation result - no persistence.
    """

    employee_id: str
    employee_name: Optional[str] = None

    # Earnings
    regular_pay: Decimal = Field(..., description="Regular hours * rate")
    overtime_pay: Decimal = Field(default=Decimal("0"))
    gross_pay: Decimal = Field(..., description="Total earnings before deductions")

    # Taxes
    federal_tax: Decimal = Field(default=Decimal("0"))
    state_tax: Decimal = Field(default=Decimal("0"))
    social_security: Decimal = Field(default=Decimal("0"))
    medicare: Decimal = Field(default=Decimal("0"))
    total_taxes: Decimal = Field(default=Decimal("0"))

    # Deductions
    health_insurance: Decimal = Field(default=Decimal("0"))
    retirement_401k: Decimal = Field(default=Decimal("0"))
    other_deductions: Decimal = Field(default=Decimal("0"))
    total_deductions: Decimal = Field(default=Decimal("0"))

    # Net
    net_pay: Decimal = Field(..., description="Take-home pay")

    # Period info
    pay_period: str = Field(..., description="Period description (e.g., '2024-01-01 to 2024-01-14')")


class PayStub(BaseModel):
    """
    Persisted pay stub record.

    Created after payroll is processed and approved.
    """

    id: str = Field(..., description="Unique pay stub ID")
    employee_id: str

    # Snapshot of calculation at time of processing
    payroll_result: PayrollResult

    # Metadata
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    processed_by: Optional[str] = Field(None, description="Admin user who processed")
    status: Literal["pending", "approved", "paid", "voided"] = "pending"
    payment_method: Literal["direct_deposit", "check", "cash"] = "direct_deposit"
    check_number: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Job Posting Models
# ============================================================================

class JobPostingBase(BaseModel):
    """Base job posting fields."""

    title: str = Field(..., min_length=1, max_length=200)
    department_id: str = Field(..., description="Department ID")
    location: str = Field(..., max_length=200)
    job_type: Literal["full-time", "part-time", "contract", "internship"] = "full-time"
    salary_range: Optional[str] = Field(None, max_length=100, description="e.g., '$50,000 - $70,000'")
    description: Optional[str] = Field(None, max_length=5000)
    requirements: Optional[str] = Field(None, max_length=3000)
    benefits: Optional[str] = Field(None, max_length=2000)


class JobPostingCreate(JobPostingBase):
    """Request model for creating a job posting."""
    pass


class JobPosting(JobPostingBase):
    """Full job posting model."""

    id: str
    status: JobPostingStatus = JobPostingStatus.DRAFT
    department_name: Optional[str] = None
    posted_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    applicant_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Response Wrappers
# ============================================================================

class StatusResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    uptime_seconds: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class PaginatedResponse(BaseModel):
    """Generic paginated list response."""

    success: bool = True
    items: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    per_page: int = 20
    total_pages: int = 1


class BulkUploadResult(BaseModel):
    """Result of bulk employee upload."""

    success: bool
    total_rows: int = 0
    imported: int = 0
    failed: int = 0
    errors: List[Dict[str, Any]] = Field(default_factory=list)
