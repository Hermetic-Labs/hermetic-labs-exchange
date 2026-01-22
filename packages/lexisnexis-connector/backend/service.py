"""
LexisNexis Connector Service

Provides business logic for LexisNexis legal research
integration including case law, statutes, and Shepard's citations.
"""

import httpx
from typing import Any, Dict, List, Optional
from datetime import date, datetime

from .schemas import (
    LexisNexisCredentials,
    LexisNexisConnectionConfig,
    LexisNexisConnectionResponse,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    DocumentType,
    Jurisdiction,
    Citation,
    Headnote,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    ShepardizeRequest,
    ShepardizeResponse,
    CitingReference,
    TreatmentType,
)


class LexisNexisService:
    """Service for LexisNexis API operations"""

    def __init__(self, config: Optional[LexisNexisConnectionConfig] = None):
        """Initialize LexisNexis service
        
        Args:
            config: LexisNexis connection configuration
        """
        self.config = config
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _get_base_url(self) -> str:
        """Get LexisNexis API base URL"""
        if not self.config:
            raise ValueError("LexisNexis connection not configured")
        return self.config.base_url

    async def _refresh_token(self, credentials: LexisNexisCredentials) -> str:
        """Refresh OAuth access token"""
        if not self.config:
            raise ValueError("LexisNexis connection not configured")
            
        token_url = f"{self.config.base_url}/oauth/v2/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret,
                    "scope": "http://api.lexisnexis.com/research",
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
        config: LexisNexisConnectionConfig,
        credentials: LexisNexisCredentials,
    ) -> LexisNexisConnectionResponse:
        """Establish LexisNexis connection
        
        Args:
            config: Connection configuration
            credentials: OAuth credentials
            
        Returns:
            Connection response with status
        """
        self.config = config
        await self._refresh_token(credentials)
        
        return LexisNexisConnectionResponse(
            connected=True,
            base_url=config.base_url,
            api_version="v1",
            token_expires_at=self._token_expires_at,
        )

    async def disconnect(self) -> bool:
        """Disconnect from LexisNexis"""
        self._access_token = None
        self._token_expires_at = None
        return True

    async def search_documents(
        self,
        request: DocumentSearchRequest,
    ) -> DocumentListResponse:
        """Search legal documents
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching documents
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "query": request.query,
            "offset": request.offset,
            "limit": request.limit,
            "sort": request.sort.value,
        }
        
        if request.document_type:
            payload["documentType"] = request.document_type.value
        if request.jurisdiction:
            payload["jurisdiction"] = request.jurisdiction.value
        if request.court:
            payload["court"] = request.court
        if request.date_from:
            payload["dateFrom"] = request.date_from.isoformat()
        if request.date_to:
            payload["dateTo"] = request.date_to.isoformat()
        if request.topics:
            payload["topics"] = request.topics
        payload["includeFullText"] = request.include_full_text
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/search",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        documents = []
        for item in data.get("results", []):
            documents.append(DocumentResponse(
                document_id=item.get("documentId", ""),
                title=item.get("title", ""),
                document_type=DocumentType(item.get("documentType", "cases")),
                jurisdiction=Jurisdiction(item.get("jurisdiction")) if item.get("jurisdiction") else None,
                court=item.get("court"),
                date_decided=item.get("dateDecided"),
                summary=item.get("summary"),
                full_text=item.get("fullText") if request.include_full_text else None,
                topics=item.get("topics", []),
            ))
            
        total = data.get("totalResults", len(documents))
        return DocumentListResponse(
            documents=documents,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(documents)) < total,
            query_id=data.get("queryId"),
        )

    async def get_document(self, document_id: str) -> Optional[DocumentResponse]:
        """Get document by ID
        
        Args:
            document_id: Document identifier
            
        Returns:
            Document details or None if not found
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/v1/documents/{document_id}",
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
            
        return DocumentResponse(
            document_id=data.get("documentId", ""),
            title=data.get("title", ""),
            document_type=DocumentType(data.get("documentType", "cases")),
            full_text=data.get("fullText"),
            summary=data.get("summary"),
            topics=data.get("topics", []),
        )

    async def search_cases(
        self,
        request: CaseSearchRequest,
    ) -> CaseListResponse:
        """Search case law
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching cases
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "query": request.query,
            "offset": request.offset,
            "limit": request.limit,
            "sort": request.sort.value,
        }
        
        if request.jurisdiction:
            payload["jurisdiction"] = request.jurisdiction.value
        if request.court:
            payload["court"] = request.court
        if request.date_from:
            payload["dateFrom"] = request.date_from.isoformat()
        if request.date_to:
            payload["dateTo"] = request.date_to.isoformat()
        if request.topics:
            payload["topics"] = request.topics
        if request.key_numbers:
            payload["keyNumbers"] = request.key_numbers
        payload["includeOpinion"] = request.include_opinion
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/cases/search",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        cases = []
        for item in data.get("results", []):
            cases.append(CaseResponse(
                case_id=item.get("caseId", ""),
                case_name=item.get("caseName", ""),
                short_name=item.get("shortName"),
                citation=Citation(full_citation=item.get("citation", "")),
                court=item.get("court", ""),
                jurisdiction=Jurisdiction(item.get("jurisdiction", "US-FED")),
                date_decided=item.get("dateDecided", date.today()),
                judges=item.get("judges", []),
                parties=item.get("parties", []),
                topics=item.get("topics", []),
            ))
            
        total = data.get("totalResults", len(cases))
        return CaseListResponse(
            cases=cases,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(cases)) < total,
        )

    async def get_case(self, case_id: str) -> Optional[CaseResponse]:
        """Get case by ID
        
        Args:
            case_id: Case identifier
            
        Returns:
            Case details or None if not found
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/v1/cases/{case_id}",
                headers=self._get_headers(),
                timeout=self.config.timeout if self.config else 30,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
            
        return CaseResponse(
            case_id=data.get("caseId", ""),
            case_name=data.get("caseName", ""),
            citation=Citation(full_citation=data.get("citation", "")),
            court=data.get("court", ""),
            jurisdiction=Jurisdiction(data.get("jurisdiction", "US-FED")),
            date_decided=data.get("dateDecided", date.today()),
            opinion_text=data.get("opinionText"),
        )

    async def search_statutes(
        self,
        request: StatuteSearchRequest,
    ) -> StatuteListResponse:
        """Search statutes
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching statutes
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "query": request.query,
            "offset": request.offset,
            "limit": request.limit,
            "sort": request.sort.value,
        }
        
        if request.jurisdiction:
            payload["jurisdiction"] = request.jurisdiction.value
        if request.code_name:
            payload["codeName"] = request.code_name
        payload["includeAnnotations"] = request.include_annotations
        payload["includeHistory"] = request.include_history
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/statutes/search",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        statutes = []
        for item in data.get("results", []):
            statutes.append(StatuteResponse(
                statute_id=item.get("statuteId", ""),
                title=item.get("title", ""),
                code_name=item.get("codeName", ""),
                section_number=item.get("sectionNumber", ""),
                section_title=item.get("sectionTitle"),
                jurisdiction=Jurisdiction(item.get("jurisdiction", "US-FED")),
                text=item.get("text"),
                topics=item.get("topics", []),
            ))
            
        total = data.get("totalResults", len(statutes))
        return StatuteListResponse(
            statutes=statutes,
            total=total,
            offset=request.offset,
            limit=request.limit,
            has_more=(request.offset + len(statutes)) < total,
        )

    async def shepardize(
        self,
        request: ShepardizeRequest,
    ) -> ShepardizeResponse:
        """Get Shepard's citation analysis
        
        Args:
            request: Shepardize parameters
            
        Returns:
            Citation analysis results
        """
        if not self._access_token:
            raise ValueError("Not connected - call connect() first")
            
        payload: Dict[str, Any] = {
            "citation": request.citation,
            "includeHistory": request.include_history,
            "includeCitingReferences": request.include_citing_references,
            "limit": request.limit,
        }
        
        if request.treatment_filter:
            payload["treatmentFilter"] = request.treatment_filter.value
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/shepards",
                headers=self._get_headers(),
                json=payload,
                timeout=self.config.timeout if self.config else 30,
            )
            response.raise_for_status()
            data = response.json()
            
        citing_refs = []
        for item in data.get("citingReferences", []):
            citing_refs.append(CitingReference(
                document_id=item.get("documentId", ""),
                citation=item.get("citation", ""),
                case_name=item.get("caseName"),
                court=item.get("court"),
                date_decided=item.get("dateDecided"),
                treatment=TreatmentType(item.get("treatment", "neutral")),
                headnote_numbers=item.get("headnoteNumbers", []),
                discussion_text=item.get("discussionText"),
                depth=item.get("depth", 1),
            ))
            
        return ShepardizeResponse(
            citation=request.citation,
            document_id=data.get("documentId"),
            case_name=data.get("caseName"),
            overall_treatment=TreatmentType(data.get("overallTreatment", "neutral")),
            citing_references=citing_refs,
            positive_count=data.get("positiveCount", 0),
            negative_count=data.get("negativeCount", 0),
            cautionary_count=data.get("cautionaryCount", 0),
            neutral_count=data.get("neutralCount", 0),
            total_citing=data.get("totalCiting", 0),
            warning_signals=data.get("warningSignals", []),
        )
