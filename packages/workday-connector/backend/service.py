"""
Workday Connector Service

Provides business logic for Workday HCM integration including
workers, time off, payroll, and benefits management.
"""

import httpx
from typing import Any, Dict, List, Optional
from datetime import date, datetime
import base64

from .schemas import (
    WorkdayCredentials,
    WorkdayConnectionConfig,
    WorkdayConnectionResponse,
    WorkerResponse,
    WorkerListResponse,
    WorkerSearchRequest,
    WorkerStatus,
    ManagerInfo,
    TimeOffRequest,
    TimeOffResponse,
    TimeOffBalance,
    TimeOffStatus,
    PayslipResponse,
    PayslipListResponse,
    EarningsDeduction,
    CompensationResponse,
    PayFrequency,
    BenefitEnrollment,
    BenefitPlan,
    DependentInfo,
)


class WorkdayService:
    """Service for Workday API operations"""

    def __init__(self, config: Optional[WorkdayConnectionConfig] = None):
        """Initialize Workday service
        
        Args:
            config: Workday connection configuration
        """
        self.config = config
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _get_base_url(self) -> str:
        """Get Workday API base URL"""
        if not self.config:
            raise ValueError("Workday connection not configured")
        return f"{self.config.tenant_url}/api/{self.config.api_version}"

    async def _refresh_token(self, credentials: WorkdayCredentials) -> str:
        """Refresh OAuth access token"""
        if not self.config:
            raise ValueError("Workday connection not configured")
            
        token_url = f"{self.config.tenant_url}/oauth2/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": credentials.refresh_token,
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret,
                },
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            self._token_expires_at = datetime.utcnow().replace(
                second=datetime.utcnow().second + expires_in
            )
            return self._access_token

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        if not self._access_token:
            raise ValueError("Not authenticated - call connect() first")
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def connect(
        self,
        config: WorkdayConnectionConfig,
        credentials: WorkdayCredentials,
    ) -> WorkdayConnectionResponse:
        """Establish Workday connection
        
        Args:
            config: Connection configuration
            credentials: OAuth credentials
            
        Returns:
            Connection response with status
        """
        self.config = config
        await self._refresh_token(credentials)
        
        return WorkdayConnectionResponse(
            connected=True,
            tenant_url=config.tenant_url,
            api_version=config.api_version,
            token_expires_at=self._token_expires_at,
        )

    async def disconnect(self) -> bool:
        """Disconnect from Workday"""
        self._access_token = None
        self._token_expires_at = None
        return True

    # Worker Operations
    async def get_workers(
        self,
        request: WorkerSearchRequest,
    ) -> WorkerListResponse:
        """Get list of workers
        
        Args:
            request: Search/filter parameters
            
        Returns:
            List of workers
        """
        url = f"{self._get_base_url()}/workers"
        params: Dict[str, Any] = {
            "offset": request.offset,
            "limit": request.limit,
        }
        if request.query:
            params["search"] = request.query
        if request.status:
            params["status"] = request.status.value
        if request.department:
            params["department"] = request.department
        if request.location:
            params["location"] = request.location
        if request.manager_id:
            params["managerId"] = request.manager_id

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        workers = [self._parse_worker(w) for w in data.get("data", [])]
        total = data.get("total", len(workers))
        
        return WorkerListResponse(
            workers=workers,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=request.offset + len(workers) < total,
        )

    async def get_worker(self, worker_id: str) -> WorkerResponse:
        """Get worker by ID
        
        Args:
            worker_id: Worker ID
            
        Returns:
            Worker details
        """
        url = f"{self._get_base_url()}/workers/{worker_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return self._parse_worker(data)

    def _parse_worker(self, data: Dict[str, Any]) -> WorkerResponse:
        """Parse worker from API response"""
        manager_data = data.get("manager")
        manager = None
        if manager_data:
            manager = ManagerInfo(
                id=manager_data.get("id", ""),
                name=manager_data.get("name", ""),
            )
        
        return WorkerResponse(
            id=data.get("id", ""),
            worker_id=data.get("workerId", data.get("id", "")),
            employee_id=data.get("employeeId"),
            full_name=data.get("fullName", ""),
            first_name=data.get("firstName", ""),
            last_name=data.get("lastName", ""),
            preferred_name=data.get("preferredName"),
            email=data.get("email"),
            work_email=data.get("workEmail"),
            phone=data.get("phone"),
            job_title=data.get("jobTitle"),
            department=data.get("department"),
            location=data.get("location"),
            manager=manager,
            hire_date=self._parse_date(data.get("hireDate")),
            termination_date=self._parse_date(data.get("terminationDate")),
            status=WorkerStatus(data.get("status", "Active")),
            employee_type=data.get("employeeType"),
            cost_center=data.get("costCenter"),
            company=data.get("company"),
        )

    # Time Off Operations
    async def get_time_off_requests(
        self,
        worker_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        status: Optional[TimeOffStatus] = None,
    ) -> List[TimeOffResponse]:
        """Get time off requests for a worker
        
        Args:
            worker_id: Worker ID
            from_date: Filter from date
            to_date: Filter to date
            status: Filter by status
            
        Returns:
            List of time off requests
        """
        url = f"{self._get_base_url()}/workers/{worker_id}/timeOff"
        params: Dict[str, Any] = {}
        if from_date:
            params["fromDate"] = from_date.isoformat()
        if to_date:
            params["toDate"] = to_date.isoformat()
        if status:
            params["status"] = status.value

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return [self._parse_time_off(r) for r in data.get("data", [])]

    async def submit_time_off_request(
        self,
        request: TimeOffRequest,
    ) -> TimeOffResponse:
        """Submit a time off request
        
        Args:
            request: Time off request details
            
        Returns:
            Created time off request
        """
        url = f"{self._get_base_url()}/workers/{request.worker_id}/timeOff"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=self._get_headers(),
                json={
                    "timeOffType": request.time_off_type,
                    "startDate": request.start_date.isoformat(),
                    "endDate": request.end_date.isoformat(),
                    "comments": request.comments,
                    "halfDayStart": request.half_day_start,
                    "halfDayEnd": request.half_day_end,
                },
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return self._parse_time_off(data)

    async def get_time_off_balances(
        self,
        worker_id: str,
        as_of_date: Optional[date] = None,
    ) -> List[TimeOffBalance]:
        """Get time off balances for a worker
        
        Args:
            worker_id: Worker ID
            as_of_date: Balance as of date
            
        Returns:
            List of time off balances
        """
        url = f"{self._get_base_url()}/workers/{worker_id}/timeOffBalances"
        params: Dict[str, Any] = {}
        if as_of_date:
            params["asOfDate"] = as_of_date.isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return [
            TimeOffBalance(
                time_off_type=b.get("typeCode", ""),
                type_name=b.get("typeName", ""),
                balance=b.get("balance", 0),
                unit=b.get("unit", "hours"),
                as_of_date=self._parse_date(b.get("asOfDate")) or date.today(),
                pending_requests=b.get("pendingRequests", 0),
                available=b.get("available", b.get("balance", 0)),
            )
            for b in data.get("data", [])
        ]

    def _parse_time_off(self, data: Dict[str, Any]) -> TimeOffResponse:
        """Parse time off request from API response"""
        return TimeOffResponse(
            request_id=data.get("requestId", ""),
            worker_id=data.get("workerId", ""),
            time_off_type=data.get("timeOffType", ""),
            start_date=self._parse_date(data.get("startDate")) or date.today(),
            end_date=self._parse_date(data.get("endDate")) or date.today(),
            total_days=data.get("totalDays", 0),
            total_hours=data.get("totalHours", 0),
            status=TimeOffStatus(data.get("status", "Pending")),
            comments=data.get("comments"),
            submitted_at=self._parse_datetime(data.get("submittedAt")),
            approved_by=data.get("approvedBy"),
            approved_at=self._parse_datetime(data.get("approvedAt")),
        )

    # Payroll Operations
    async def get_payslips(
        self,
        worker_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> PayslipListResponse:
        """Get payslips for a worker
        
        Args:
            worker_id: Worker ID
            from_date: Filter from date
            to_date: Filter to date
            
        Returns:
            List of payslips
        """
        url = f"{self._get_base_url()}/workers/{worker_id}/payslips"
        params: Dict[str, Any] = {}
        if from_date:
            params["fromDate"] = from_date.isoformat()
        if to_date:
            params["toDate"] = to_date.isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        payslips = [self._parse_payslip(p) for p in data.get("data", [])]
        
        return PayslipListResponse(
            payslips=payslips,
            total=len(payslips),
            worker_id=worker_id,
        )

    async def get_compensation(
        self,
        worker_id: str,
    ) -> CompensationResponse:
        """Get current compensation for a worker
        
        Args:
            worker_id: Worker ID
            
        Returns:
            Compensation details
        """
        url = f"{self._get_base_url()}/workers/{worker_id}/compensation"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        frequency = PayFrequency(data.get("frequency", "annual"))
        amount = data.get("amount", 0)
        
        # Calculate annual equivalent
        multipliers = {
            PayFrequency.WEEKLY: 52,
            PayFrequency.BIWEEKLY: 26,
            PayFrequency.SEMIMONTHLY: 24,
            PayFrequency.MONTHLY: 12,
            PayFrequency.ANNUAL: 1,
        }
        annual = amount * multipliers.get(frequency, 1)
        
        return CompensationResponse(
            worker_id=worker_id,
            compensation_type=data.get("compensationType", "Salary"),
            amount=amount,
            currency=data.get("currency", "USD"),
            frequency=frequency,
            effective_date=self._parse_date(data.get("effectiveDate")) or date.today(),
            end_date=self._parse_date(data.get("endDate")),
            reason=data.get("reason"),
            annual_equivalent=annual,
        )

    def _parse_payslip(self, data: Dict[str, Any]) -> PayslipResponse:
        """Parse payslip from API response"""
        return PayslipResponse(
            payslip_id=data.get("payslipId", ""),
            worker_id=data.get("workerId", ""),
            pay_period_start=self._parse_date(data.get("payPeriodStart")) or date.today(),
            pay_period_end=self._parse_date(data.get("payPeriodEnd")) or date.today(),
            payment_date=self._parse_date(data.get("paymentDate")) or date.today(),
            gross_pay=data.get("grossPay", 0),
            net_pay=data.get("netPay", 0),
            currency=data.get("currency", "USD"),
            earnings=[
                EarningsDeduction(
                    name=e.get("name", ""),
                    code=e.get("code", ""),
                    amount=e.get("amount", 0),
                    hours=e.get("hours"),
                    rate=e.get("rate"),
                )
                for e in data.get("earnings", [])
            ],
            deductions=[
                EarningsDeduction(
                    name=d.get("name", ""),
                    code=d.get("code", ""),
                    amount=d.get("amount", 0),
                )
                for d in data.get("deductions", [])
            ],
            taxes=[
                EarningsDeduction(
                    name=t.get("name", ""),
                    code=t.get("code", ""),
                    amount=t.get("amount", 0),
                )
                for t in data.get("taxes", [])
            ],
        )

    # Benefits Operations
    async def get_benefit_enrollments(
        self,
        worker_id: str,
    ) -> List[BenefitEnrollment]:
        """Get benefit enrollments for a worker
        
        Args:
            worker_id: Worker ID
            
        Returns:
            List of benefit enrollments
        """
        url = f"{self._get_base_url()}/workers/{worker_id}/benefits"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return [self._parse_benefit_enrollment(b) for b in data.get("data", [])]

    async def get_benefit_plans(self) -> List[BenefitPlan]:
        """Get available benefit plans
        
        Returns:
            List of benefit plans
        """
        url = f"{self._get_base_url()}/benefits/plans"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()

        return [
            BenefitPlan(
                plan_id=p.get("planId", ""),
                plan_name=p.get("planName", ""),
                plan_type=p.get("planType", ""),
                description=p.get("description"),
                coverage_options=p.get("coverageOptions", []),
                employee_cost_range=p.get("employeeCostRange"),
                active=p.get("active", True),
            )
            for p in data.get("data", [])
        ]

    def _parse_benefit_enrollment(self, data: Dict[str, Any]) -> BenefitEnrollment:
        """Parse benefit enrollment from API response"""
        return BenefitEnrollment(
            enrollment_id=data.get("enrollmentId", ""),
            worker_id=data.get("workerId", ""),
            plan_id=data.get("planId", ""),
            plan_name=data.get("planName", ""),
            plan_type=data.get("planType", ""),
            coverage_level=data.get("coverageLevel", ""),
            employee_cost=data.get("employeeCost", 0),
            employer_cost=data.get("employerCost", 0),
            total_cost=data.get("totalCost", 0),
            currency=data.get("currency", "USD"),
            pay_frequency=PayFrequency(data.get("payFrequency", "monthly")),
            effective_date=self._parse_date(data.get("effectiveDate")) or date.today(),
            end_date=self._parse_date(data.get("endDate")),
            dependents=[
                DependentInfo(
                    id=d.get("id", ""),
                    name=d.get("name", ""),
                    relationship=d.get("relationship", ""),
                    date_of_birth=self._parse_date(d.get("dateOfBirth")),
                    covered=d.get("covered", True),
                )
                for d in data.get("dependents", [])
            ],
        )

    # Utility methods
    def _parse_date(self, value: Optional[str]) -> Optional[date]:
        """Parse date string to date object"""
        if not value:
            return None
        try:
            return date.fromisoformat(value[:10])
        except (ValueError, TypeError):
            return None

    def _parse_datetime(self, value: Optional[str]) -> Optional[datetime]:
        """Parse datetime string to datetime object"""
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
