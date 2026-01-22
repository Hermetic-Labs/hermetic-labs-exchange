"""
USASpending Connector Service

Provides business logic for USASpending.gov federal
spending data integration and analysis.
"""

import httpx
from typing import Any, Dict, List, Optional
from datetime import date, datetime

from .schemas import (
    USASpendingConnectionConfig,
    USASpendingConnectionResponse,
    AwardSearchRequest,
    AwardResponse,
    AwardListResponse,
    AwardType,
    AwardCategory,
    LocationInfo,
    AgencySpendingRequest,
    AgencySpendingResponse,
    SubAgencySpending,
    RecipientSearchRequest,
    RecipientResponse,
    RecipientListResponse,
    GeographicSpendingRequest,
    GeographicSpendingResponse,
    FiscalYearSpendingResponse,
)


class USASpendingService:
    """Service for USASpending API operations"""

    def __init__(self, config: Optional[USASpendingConnectionConfig] = None):
        """Initialize USASpending service
        
        Args:
            config: USASpending connection configuration
        """
        self.config = config
        self._connected: bool = False

    def _get_base_url(self) -> str:
        """Get USASpending API base URL"""
        if not self.config:
            raise ValueError("USASpending connection not configured")
        return self.config.base_url

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def connect(
        self,
        config: USASpendingConnectionConfig,
    ) -> USASpendingConnectionResponse:
        """Establish USASpending connection
        
        Args:
            config: Connection configuration
            
        Returns:
            Connection response with status
        """
        self.config = config
        
        # Validate connection with a test request
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/api/v2/references/filter_tree/tas/",
                headers=self._get_headers(),
                timeout=config.timeout,
            )
            response.raise_for_status()
            
        self._connected = True
        return USASpendingConnectionResponse(
            connected=True,
            base_url=config.base_url,
            api_version="v2",
        )

    async def disconnect(self) -> bool:
        """Disconnect from USASpending"""
        self._connected = False
        return True

    async def search_awards(
        self,
        request: AwardSearchRequest,
    ) -> AwardListResponse:
        """Search for federal awards
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching awards
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "page": (request.offset // request.limit) + 1,
            "limit": request.limit,
            "filters": {},
        }
        
        filters = payload["filters"]
        
        if request.keywords:
            filters["keywords"] = request.keywords
        if request.award_type:
            filters["award_type_codes"] = [request.award_type.value]
        if request.awarding_agency_code:
            filters["agencies"] = [{"type": "awarding", "tier": "toptier", "toptier_agency_code": request.awarding_agency_code}]
        if request.recipient_name:
            filters["recipient_search_text"] = [request.recipient_name]
        if request.state_code:
            filters["place_of_performance_locations"] = [{"country": "USA", "state": request.state_code}]
        if request.naics_code:
            filters["naics_codes"] = {"require": [request.naics_code]}
        if request.psc_code:
            filters["psc_codes"] = {"require": [request.psc_code]}
        if request.fiscal_year:
            filters["time_period"] = [{"start_date": f"{request.fiscal_year - 1}-10-01", "end_date": f"{request.fiscal_year}-09-30"}]
        if request.min_amount or request.max_amount:
            filters["award_amounts"] = [{"lower_bound": request.min_amount, "upper_bound": request.max_amount}]
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/api/v2/search/spending_by_award/",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        awards = []
        for item in data.get("results", []):
            awards.append(AwardResponse(
                award_id=item.get("internal_id", ""),
                generated_unique_award_id=item.get("generated_internal_id", ""),
                piid=item.get("piid"),
                fain=item.get("fain"),
                award_type=AwardType.CONTRACT,  # Map based on actual type
                category=AwardCategory.CONTRACTS,
                description=item.get("Award Description"),
                total_obligation=item.get("Award Amount", 0),
                awarding_agency_name=item.get("Awarding Agency"),
                recipient_name=item.get("Recipient Name"),
                start_date=item.get("Start Date"),
                fiscal_year=request.fiscal_year,
            ))
            
        total = data.get("page_metadata", {}).get("total", len(awards))
        return AwardListResponse(
            awards=awards,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(awards)) < total,
        )

    async def get_award(self, award_id: str) -> Optional[AwardResponse]:
        """Get award by ID
        
        Args:
            award_id: Award identifier
            
        Returns:
            Award details or None if not found
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/api/v2/awards/{award_id}/",
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
            
        return AwardResponse(
            award_id=data.get("id", ""),
            generated_unique_award_id=data.get("generated_unique_award_id", ""),
            piid=data.get("piid"),
            fain=data.get("fain"),
            award_type=AwardType.CONTRACT,
            category=AwardCategory.CONTRACTS,
            description=data.get("description"),
            total_obligation=data.get("total_obligation", 0),
            awarding_agency_name=data.get("awarding_agency", {}).get("toptier_agency", {}).get("name"),
            recipient_name=data.get("recipient", {}).get("recipient_name"),
            start_date=data.get("period_of_performance_start_date"),
            end_date=data.get("period_of_performance_current_end_date"),
        )

    async def get_agency_spending(
        self,
        request: AgencySpendingRequest,
    ) -> AgencySpendingResponse:
        """Get agency spending data
        
        Args:
            request: Request parameters
            
        Returns:
            Agency spending summary
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        fiscal_year = request.fiscal_year or datetime.now().year
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/api/v2/agency/{request.agency_code}/",
                headers=self._get_headers(),
                params={"fiscal_year": fiscal_year},
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        sub_agencies = []
        if request.include_sub_agencies:
            # Fetch sub-agency data
            sub_response = await client.get(
                f"{self._get_base_url()}/api/v2/agency/{request.agency_code}/sub_agency/",
                headers=self._get_headers(),
                params={"fiscal_year": fiscal_year},
                timeout=self.config.timeout if self.config else 30,
            )
            if sub_response.status_code == 200:
                sub_data = sub_response.json()
                for sub in sub_data.get("results", []):
                    sub_agencies.append(SubAgencySpending(
                        sub_agency_name=sub.get("name", ""),
                        sub_agency_code=sub.get("code"),
                        total_obligations=sub.get("total_obligations", 0),
                        award_count=sub.get("transaction_count", 0),
                    ))
            
        return AgencySpendingResponse(
            agency_name=data.get("agency_name", ""),
            agency_code=request.agency_code,
            fiscal_year=fiscal_year,
            total_obligations=data.get("budget_authority_amount", 0),
            total_outlays=data.get("outlay_amount"),
            total_budgetary_resources=data.get("total_budgetary_resources"),
            award_count=data.get("transaction_count", 0),
            sub_agencies=sub_agencies,
        )

    async def search_recipients(
        self,
        request: RecipientSearchRequest,
    ) -> RecipientListResponse:
        """Search for award recipients
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching recipients
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "page": (request.offset // request.limit) + 1,
            "limit": request.limit,
        }
        
        if request.query:
            payload["keyword"] = request.query
        if request.uei:
            payload["uei"] = request.uei
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/api/v2/recipient/",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        recipients = []
        for item in data.get("results", []):
            recipients.append(RecipientResponse(
                recipient_id=item.get("id", ""),
                recipient_hash=item.get("recipient_hash", ""),
                uei=item.get("uei"),
                duns=item.get("duns"),
                name=item.get("name", ""),
                parent_name=item.get("parent_name"),
                parent_uei=item.get("parent_uei"),
                recipient_level=item.get("recipient_level", "R"),
                total_transaction_amount=item.get("amount", 0),
                total_awards=item.get("count", 0),
            ))
            
        total = data.get("page_metadata", {}).get("total", len(recipients))
        return RecipientListResponse(
            recipients=recipients,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(recipients)) < total,
        )

    async def get_geographic_spending(
        self,
        request: GeographicSpendingRequest,
    ) -> GeographicSpendingResponse:
        """Get geographic spending analysis
        
        Args:
            request: Request parameters
            
        Returns:
            Geographic spending data
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "scope": request.scope,
            "geo_layer": request.scope,
            "filters": {},
        }
        
        if request.fiscal_year:
            payload["filters"]["time_period"] = [{"start_date": f"{request.fiscal_year - 1}-10-01", "end_date": f"{request.fiscal_year}-09-30"}]
        if request.agency_code:
            payload["filters"]["agencies"] = [{"type": "awarding", "tier": "toptier", "toptier_agency_code": request.agency_code}]
        if request.state_code and request.scope == "county":
            payload["filters"]["place_of_performance_locations"] = [{"country": "USA", "state": request.state_code}]
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/api/v2/search/spending_by_geography/",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        return GeographicSpendingResponse(
            fiscal_year=request.fiscal_year,
            scope=request.scope,
            results=data.get("results", []),
            total_obligations=sum(r.get("aggregated_amount", 0) for r in data.get("results", [])),
        )

    async def get_spending_by_fiscal_year(
        self,
        fiscal_year: int,
    ) -> FiscalYearSpendingResponse:
        """Get spending summary for fiscal year
        
        Args:
            fiscal_year: Fiscal year
            
        Returns:
            Fiscal year spending summary
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/api/v2/references/total_budgetary_resources/",
                headers=self._get_headers(),
                params={"fiscal_year": fiscal_year},
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        return FiscalYearSpendingResponse(
            fiscal_year=fiscal_year,
            total_budgetary_resources=data.get("results", [{}])[0].get("total_budgetary_resources", 0) if data.get("results") else 0,
        )
