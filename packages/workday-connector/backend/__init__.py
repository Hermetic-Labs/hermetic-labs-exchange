"""
Workday Connector Backend Module

Provides FastAPI routes and services for Workday HCM integration
including workers, time off, payroll, and benefits management.
"""

from .routes import router
from .service import WorkdayService
from .schemas import (
    WorkdayCredentials,
    WorkdayConnectionConfig,
    WorkerResponse,
    WorkerListResponse,
    WorkerSearchRequest,
    TimeOffRequest,
    TimeOffResponse,
    TimeOffBalance,
    PayslipResponse,
    PayslipListResponse,
    CompensationResponse,
    BenefitEnrollment,
    BenefitPlan,
)

__all__ = [
    # Router
    "router",
    # Service
    "WorkdayService",
    # Schemas
    "WorkdayCredentials",
    "WorkdayConnectionConfig",
    "WorkerResponse",
    "WorkerListResponse",
    "WorkerSearchRequest",
    "TimeOffRequest",
    "TimeOffResponse",
    "TimeOffBalance",
    "PayslipResponse",
    "PayslipListResponse",
    "CompensationResponse",
    "BenefitEnrollment",
    "BenefitPlan",
]
