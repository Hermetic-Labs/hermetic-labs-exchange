"""
FastAPI routes for Workday Connector

Provides REST API endpoints for Workday HCM integration including
workers, time off, payroll, and benefits management.
"""

from typing import Any, Dict, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    WorkdayCredentials,
    WorkdayConnectionConfig,
    WorkdayConnectionResponse,
    WorkerResponse,
    WorkerListResponse,
    WorkerSearchRequest,
    WorkerStatus,
    TimeOffRequest,
    TimeOffResponse,
    TimeOffBalance,
    TimeOffStatus,
    PayslipResponse,
    PayslipListResponse,
    CompensationResponse,
    BenefitEnrollment,
    BenefitPlan,
)
from .service import WorkdayService

router = APIRouter(prefix="/workday", tags=["workday"])

# Service instance (in production, use dependency injection)
_service: Optional[WorkdayService] = None


def get_service() -> WorkdayService:
    """Dependency to get Workday service instance"""
    global _service
    if _service is None:
        _service = WorkdayService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=WorkdayConnectionResponse)
async def connect(
    config: WorkdayConnectionConfig,
    credentials: WorkdayCredentials = Body(...),
    service: WorkdayService = Depends(get_service),
) -> WorkdayConnectionResponse:
    """Establish Workday connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: WorkdayService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from Workday"""
    result = await service.disconnect()
    return {"disconnected": result}


# Worker Endpoints
@router.get("/workers", response_model=WorkerListResponse)
async def get_workers(
    query: Optional[str] = Query(None, description="Search query"),
    status: Optional[WorkerStatus] = Query(None, description="Filter by status"),
    department: Optional[str] = Query(None, description="Filter by department"),
    location: Optional[str] = Query(None, description="Filter by location"),
    manager_id: Optional[str] = Query(None, description="Filter by manager ID"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: WorkdayService = Depends(get_service),
) -> WorkerListResponse:
    """Get list of workers with optional filtering"""
    try:
        request = WorkerSearchRequest(
            query=query,
            status=status,
            department=department,
            location=location,
            manager_id=manager_id,
            offset=offset,
            limit=limit,
        )
        return await service.get_workers(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workers: {str(e)}")


@router.get("/workers/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: str = Path(..., description="Worker ID"),
    service: WorkdayService = Depends(get_service),
) -> WorkerResponse:
    """Get worker by ID"""
    try:
        return await service.get_worker(worker_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get worker: {str(e)}")


# Time Off Endpoints
@router.get("/workers/{worker_id}/time-off", response_model=List[TimeOffResponse])
async def get_time_off_requests(
    worker_id: str = Path(..., description="Worker ID"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    status: Optional[TimeOffStatus] = Query(None, description="Filter by status"),
    service: WorkdayService = Depends(get_service),
) -> List[TimeOffResponse]:
    """Get time off requests for a worker"""
    try:
        return await service.get_time_off_requests(
            worker_id, from_date, to_date, status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get time off: {str(e)}")


@router.post("/workers/{worker_id}/time-off", response_model=TimeOffResponse)
async def submit_time_off_request(
    worker_id: str = Path(..., description="Worker ID"),
    request: TimeOffRequest = Body(...),
    service: WorkdayService = Depends(get_service),
) -> TimeOffResponse:
    """Submit a time off request"""
    if request.worker_id != worker_id:
        request.worker_id = worker_id
    try:
        return await service.submit_time_off_request(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit request: {str(e)}")


@router.get("/workers/{worker_id}/time-off/balances", response_model=List[TimeOffBalance])
async def get_time_off_balances(
    worker_id: str = Path(..., description="Worker ID"),
    as_of_date: Optional[date] = Query(None, description="Balance as of date"),
    service: WorkdayService = Depends(get_service),
) -> List[TimeOffBalance]:
    """Get time off balances for a worker"""
    try:
        return await service.get_time_off_balances(worker_id, as_of_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get balances: {str(e)}")


# Payroll Endpoints
@router.get("/workers/{worker_id}/payslips", response_model=PayslipListResponse)
async def get_payslips(
    worker_id: str = Path(..., description="Worker ID"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    service: WorkdayService = Depends(get_service),
) -> PayslipListResponse:
    """Get payslips for a worker"""
    try:
        return await service.get_payslips(worker_id, from_date, to_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get payslips: {str(e)}")


@router.get("/workers/{worker_id}/compensation", response_model=CompensationResponse)
async def get_compensation(
    worker_id: str = Path(..., description="Worker ID"),
    service: WorkdayService = Depends(get_service),
) -> CompensationResponse:
    """Get compensation for a worker"""
    try:
        return await service.get_compensation(worker_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compensation: {str(e)}")


# Benefits Endpoints
@router.get("/workers/{worker_id}/benefits", response_model=List[BenefitEnrollment])
async def get_benefit_enrollments(
    worker_id: str = Path(..., description="Worker ID"),
    service: WorkdayService = Depends(get_service),
) -> List[BenefitEnrollment]:
    """Get benefit enrollments for a worker"""
    try:
        return await service.get_benefit_enrollments(worker_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get benefits: {str(e)}")


@router.get("/benefits/plans", response_model=List[BenefitPlan])
async def get_benefit_plans(
    service: WorkdayService = Depends(get_service),
) -> List[BenefitPlan]:
    """Get available benefit plans"""
    try:
        return await service.get_benefit_plans()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get plans: {str(e)}")
