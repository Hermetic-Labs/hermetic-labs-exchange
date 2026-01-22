"""
SAM.gov Connector Service

Provides business logic for SAM.gov federal contractor
registration, entity search, and exclusions integration.
"""

import httpx
from typing import Any, Dict, List, Optional
from datetime import date, datetime

from .schemas import (
    SAMGovCredentials,
    SAMGovConnectionConfig,
    SAMGovConnectionResponse,
    EntitySearchRequest,
    EntityResponse,
    EntityListResponse,
    EntityStatus,
    EntityType,
    AddressInfo,
    ExclusionSearchRequest,
    ExclusionResponse,
    ExclusionListResponse,
    ExclusionType,
    OpportunitySearchRequest,
    OpportunityResponse,
    OpportunityListResponse,
    SetAsideType,
)


class SAMGovService:
    """Service for SAM.gov API operations"""

    def __init__(self, config: Optional[SAMGovConnectionConfig] = None):
        """Initialize SAM.gov service
        
        Args:
            config: SAM.gov connection configuration
        """
        self.config = config
        self._api_key: Optional[str] = None
        self._connected: bool = False

    def _get_base_url(self) -> str:
        """Get SAM.gov API base URL"""
        if not self.config:
            raise ValueError("SAM.gov connection not configured")
        return self.config.base_url

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        if not self._api_key:
            raise ValueError("Not authenticated - call connect() first")
        return {
            "X-Api-Key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def connect(
        self,
        config: SAMGovConnectionConfig,
        credentials: SAMGovCredentials,
    ) -> SAMGovConnectionResponse:
        """Establish SAM.gov connection
        
        Args:
            config: Connection configuration
            credentials: API credentials
            
        Returns:
            Connection response with status
        """
        self.config = config
        self._api_key = credentials.api_key
        
        # Validate connection with a test request
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/entity-information/v3/api",
                headers=self._get_headers(),
                timeout=config.timeout,
            )
            response.raise_for_status()
            
        self._connected = True
        return SAMGovConnectionResponse(
            connected=True,
            base_url=config.base_url,
            api_version="v3",
        )

    async def disconnect(self) -> bool:
        """Disconnect from SAM.gov"""
        self._api_key = None
        self._connected = False
        return True

    async def search_entities(
        self,
        request: EntitySearchRequest,
    ) -> EntityListResponse:
        """Search for registered entities
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching entities
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        params: Dict[str, Any] = {
            "page": request.offset // request.limit,
            "size": request.limit,
        }
        
        if request.query:
            params["q"] = request.query
        if request.uei:
            params["ueiSAM"] = request.uei
        if request.cage_code:
            params["cageCode"] = request.cage_code
        if request.legal_business_name:
            params["legalBusinessName"] = request.legal_business_name
        if request.status:
            params["registrationStatus"] = request.status.value
        if request.state:
            params["physicalAddressStateCode"] = request.state
        if request.naics_code:
            params["naicsCode"] = request.naics_code
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/entity-information/v3/entities",
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        entities = []
        for item in data.get("entityData", []):
            core = item.get("entityRegistration", {})
            entities.append(EntityResponse(
                uei=core.get("ueiSAM", ""),
                cage_code=core.get("cageCode"),
                legal_business_name=core.get("legalBusinessName", ""),
                dba_name=core.get("dbaName"),
                status=EntityStatus(core.get("registrationStatus", "Active")),
                registration_date=core.get("registrationDate"),
                expiration_date=core.get("registrationExpirationDate"),
                naics_codes=core.get("naicsCodeList", []),
                psc_codes=core.get("pscCodeList", []),
                exclusion_status=core.get("exclusionStatusFlag", False),
            ))
            
        total = data.get("totalRecords", len(entities))
        return EntityListResponse(
            entities=entities,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(entities)) < total,
        )

    async def get_entity(self, uei: str) -> Optional[EntityResponse]:
        """Get entity by UEI
        
        Args:
            uei: Unique Entity Identifier
            
        Returns:
            Entity details or None if not found
        """
        result = await self.search_entities(EntitySearchRequest(uei=uei, limit=1))
        return result.entities[0] if result.entities else None

    async def get_entity_by_cage(self, cage_code: str) -> Optional[EntityResponse]:
        """Get entity by CAGE code
        
        Args:
            cage_code: CAGE code
            
        Returns:
            Entity details or None if not found
        """
        result = await self.search_entities(EntitySearchRequest(cage_code=cage_code, limit=1))
        return result.entities[0] if result.entities else None

    async def search_exclusions(
        self,
        request: ExclusionSearchRequest,
    ) -> ExclusionListResponse:
        """Search exclusion records
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching exclusions
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        params: Dict[str, Any] = {
            "page": request.offset // request.limit,
            "size": request.limit,
        }
        
        if request.name:
            params["q"] = request.name
        if request.uei:
            params["ueiSAM"] = request.uei
        if request.cage_code:
            params["cageCode"] = request.cage_code
        if request.exclusion_type:
            params["exclusionType"] = request.exclusion_type.value
        if request.excluding_agency:
            params["excludingAgency"] = request.excluding_agency
        if request.active_only:
            params["isActive"] = "true"
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/entity-information/v3/exclusions",
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        exclusions = []
        for item in data.get("exclusionData", []):
            exclusions.append(ExclusionResponse(
                id=item.get("exclusionIdentifier", ""),
                name=item.get("name", ""),
                uei=item.get("ueiSAM"),
                cage_code=item.get("cageCode"),
                exclusion_type=ExclusionType(item.get("exclusionType", "Ineligible")),
                exclusion_program=item.get("exclusionProgram", ""),
                excluding_agency=item.get("excludingAgency", ""),
                ct_code=item.get("ctCode"),
                exclusion_date=item.get("exclusionDate"),
                termination_date=item.get("terminationDate"),
                active=item.get("activeStatus", True),
                description=item.get("description"),
            ))
            
        total = data.get("totalRecords", len(exclusions))
        return ExclusionListResponse(
            exclusions=exclusions,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(exclusions)) < total,
        )

    async def search_opportunities(
        self,
        request: OpportunitySearchRequest,
    ) -> OpportunityListResponse:
        """Search contract opportunities
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching opportunities
        """
        if not self._connected:
            raise ValueError("Not connected - call connect() first")
            
        params: Dict[str, Any] = {
            "page": request.offset // request.limit,
            "size": request.limit,
        }
        
        if request.query:
            params["q"] = request.query
        if request.agency:
            params["agency"] = request.agency
        if request.naics_code:
            params["naicsCode"] = request.naics_code
        if request.set_aside:
            params["typeOfSetAside"] = request.set_aside.value
        if request.posted_from:
            params["postedFrom"] = request.posted_from.isoformat()
        if request.posted_to:
            params["postedTo"] = request.posted_to.isoformat()
        if request.active_only:
            params["isActive"] = "true"
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/opportunities/v2/search",
                headers=self._get_headers(),
                params=params,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        opportunities = []
        for item in data.get("opportunitiesData", []):
            opportunities.append(OpportunityResponse(
                notice_id=item.get("noticeId", ""),
                title=item.get("title", ""),
                solicitation_number=item.get("solicitationNumber"),
                department=item.get("departmentName"),
                agency=item.get("agencyName"),
                office=item.get("officeName"),
                posted_date=item.get("postedDate"),
                response_deadline=item.get("responseDeadLine"),
                archive_date=item.get("archiveDate"),
                naics_code=item.get("naicsCode"),
                classification_code=item.get("classificationCode"),
                description=item.get("description"),
                url=item.get("uiLink"),
                active=item.get("active", True),
            ))
            
        total = data.get("totalRecords", len(opportunities))
        return OpportunityListResponse(
            opportunities=opportunities,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(opportunities)) < total,
        )
