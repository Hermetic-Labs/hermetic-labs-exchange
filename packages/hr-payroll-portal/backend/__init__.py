"""
HR & Payroll Portal Backend

Provides employee management, department organization, payroll calculation,
and job posting functionality.

Remixable Components:
- HRService: Core CRUD for employees and departments
- PayrollService: Payroll calculation and pay stub generation
- Schemas: Pydantic models that can be imported by other packs
"""

from .routes import router
from .service import HRService, PayrollService
from .schemas import (
    # Employee models
    Employee,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    # Department models
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    # Payroll models
    PayrollInput,
    PayrollResult,
    PayStub,
    # Job posting models
    JobPosting,
    JobPostingCreate,
    # Tax configuration
    TaxConfig,
    DeductionConfig,
    # Response wrappers
    StatusResponse,
    PaginatedResponse,
)

__all__ = [
    "router",
    "HRService",
    "PayrollService",
    # Schemas for remix composition
    "Employee",
    "EmployeeCreate",
    "EmployeeUpdate",
    "EmployeeResponse",
    "Department",
    "DepartmentCreate",
    "DepartmentUpdate",
    "PayrollInput",
    "PayrollResult",
    "PayStub",
    "JobPosting",
    "JobPostingCreate",
    "TaxConfig",
    "DeductionConfig",
    "StatusResponse",
    "PaginatedResponse",
]
