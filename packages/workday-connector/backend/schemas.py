"""
Pydantic schemas for Workday Connector API
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class WorkerStatus(str, Enum):
    """Worker employment status"""
    ACTIVE = "Active"
    TERMINATED = "Terminated"
    ON_LEAVE = "On Leave"
    INACTIVE = "Inactive"


class TimeOffStatus(str, Enum):
    """Time off request status"""
    PENDING = "Pending"
    APPROVED = "Approved"
    DENIED = "Denied"
    CANCELLED = "Cancelled"


class PayFrequency(str, Enum):
    """Payroll frequency"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    SEMIMONTHLY = "semimonthly"
    MONTHLY = "monthly"
    ANNUAL = "annual"


# Connection Schemas
class WorkdayCredentials(BaseModel):
    """Workday authentication credentials"""
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")
    refresh_token: str = Field(..., description="OAuth refresh token")


class WorkdayConnectionConfig(BaseModel):
    """Workday connection configuration"""
    tenant_url: str = Field(..., description="Workday tenant URL")
    api_version: str = Field(default="v1", description="API version")
    timeout: int = Field(default=30, ge=5, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")


class WorkdayConnectionResponse(BaseModel):
    """Workday connection response"""
    connected: bool
    tenant_url: str
    api_version: str
    token_expires_at: Optional[datetime] = None


# Worker Schemas
class ManagerInfo(BaseModel):
    """Manager reference"""
    id: str
    name: str


class WorkerResponse(BaseModel):
    """Worker details"""
    id: str
    worker_id: str
    employee_id: Optional[str] = None
    full_name: str
    first_name: str
    last_name: str
    preferred_name: Optional[str] = None
    email: Optional[str] = None
    work_email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[ManagerInfo] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    status: WorkerStatus = WorkerStatus.ACTIVE
    employee_type: Optional[str] = None
    cost_center: Optional[str] = None
    company: Optional[str] = None


class WorkerListResponse(BaseModel):
    """List of workers response"""
    workers: List[WorkerResponse]
    total: int
    offset: int = 0
    limit: int = 100
    has_more: bool = False


class WorkerSearchRequest(BaseModel):
    """Worker search request"""
    query: Optional[str] = None
    status: Optional[WorkerStatus] = None
    department: Optional[str] = None
    location: Optional[str] = None
    manager_id: Optional[str] = None
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=500)


# Time Off Schemas
class TimeOffRequest(BaseModel):
    """Time off request submission"""
    worker_id: str = Field(..., description="Worker ID")
    time_off_type: str = Field(..., description="Type of time off")
    start_date: date = Field(..., description="Start date")
    end_date: date = Field(..., description="End date")
    comments: Optional[str] = Field(None, description="Request comments")
    half_day_start: bool = Field(default=False, description="Start with half day")
    half_day_end: bool = Field(default=False, description="End with half day")


class TimeOffResponse(BaseModel):
    """Time off request response"""
    request_id: str
    worker_id: str
    time_off_type: str
    start_date: date
    end_date: date
    total_days: float
    total_hours: float
    status: TimeOffStatus
    comments: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class TimeOffBalance(BaseModel):
    """Time off balance"""
    time_off_type: str
    type_name: str
    balance: float
    unit: str = "hours"
    as_of_date: date
    pending_requests: float = 0
    available: float


# Payroll Schemas
class EarningsDeduction(BaseModel):
    """Earnings or deduction line item"""
    name: str
    code: str
    amount: float
    hours: Optional[float] = None
    rate: Optional[float] = None


class PayslipResponse(BaseModel):
    """Payslip details"""
    payslip_id: str
    worker_id: str
    pay_period_start: date
    pay_period_end: date
    payment_date: date
    gross_pay: float
    net_pay: float
    currency: str = "USD"
    earnings: List[EarningsDeduction] = []
    deductions: List[EarningsDeduction] = []
    taxes: List[EarningsDeduction] = []


class PayslipListResponse(BaseModel):
    """List of payslips"""
    payslips: List[PayslipResponse]
    total: int
    worker_id: str


class CompensationResponse(BaseModel):
    """Worker compensation details"""
    worker_id: str
    compensation_type: str
    amount: float
    currency: str = "USD"
    frequency: PayFrequency
    effective_date: date
    end_date: Optional[date] = None
    reason: Optional[str] = None
    annual_equivalent: float


# Benefits Schemas
class DependentInfo(BaseModel):
    """Dependent information"""
    id: str
    name: str
    relationship: str
    date_of_birth: Optional[date] = None
    covered: bool = True


class BenefitEnrollment(BaseModel):
    """Benefit enrollment details"""
    enrollment_id: str
    worker_id: str
    plan_id: str
    plan_name: str
    plan_type: str
    coverage_level: str
    employee_cost: float
    employer_cost: float
    total_cost: float
    currency: str = "USD"
    pay_frequency: PayFrequency = PayFrequency.MONTHLY
    effective_date: date
    end_date: Optional[date] = None
    dependents: List[DependentInfo] = []


class BenefitPlan(BaseModel):
    """Available benefit plan"""
    plan_id: str
    plan_name: str
    plan_type: str
    description: Optional[str] = None
    coverage_options: List[str] = []
    employee_cost_range: Optional[str] = None
    active: bool = True
