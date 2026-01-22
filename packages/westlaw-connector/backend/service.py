"""
Westlaw Connector Service

Provides business logic for Westlaw legal research
integration including KeyCite, case law, and statutes.
"""

import httpx
from typing import Any, Dict, List, Optional
from datetime import date, datetime

from .schemas import (
    WestlawCredentials,
    WestlawConnectionConfig,
    WestlawConnectionResponse,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    DocumentType,
    Jurisdiction,
    LegalCitation,
    Headnote,
    KeyNumber,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    KeyCiteRequest,
    KeyCiteResponse,
    KeyCiteStatus,
    CitingReference,
    NegativeHistory,
    PositiveHistory,
    TreatmentType,
)


class WestlawService:
    """Service for Westlaw API operations"""

    def __init__(self, config: Optional[WestlawConnectionConfig] = None):
        """Initialize Westlaw service
        
        Args:
            config: Westlaw connection configuration
        """
        self.config = config
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _get_base_url(self) -> str:
        """Get Westlaw API base URL"""
        if not self.config:
            raise ValueError("Westlaw connection not configured")
        return self.config.base_url

    async def _authenticate(self, credentials: WestlawCredentials) -> str:
        """Authenticate with Westlaw API"""
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        auth_url = f"{self.config.base_url}/auth/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                auth_url,
                headers={
                    "X-API-Key": credentials.api_key,
                },
                data={
                    "grant_type": "client_credentials",
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret or "",
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
        config: WestlawConnectionConfig,
        credentials: WestlawCredentials,
    ) -> WestlawConnectionResponse:
        """Establish Westlaw connection
        
        Args:
            config: Connection configuration
            credentials: API credentials
            
        Returns:
            Connection response with status
        """
        self.config = config
        await self._authenticate(credentials)
        
        return WestlawConnectionResponse(
            connected=True,
            base_url=config.base_url,
            api_version="v1",
            token_expires_at=self._token_expires_at,
        )

    async def disconnect(self) -> bool:
        """Disconnect from Westlaw"""
        self._access_token = None
        self._token_expires_at = None
        return True

    async def search_documents(
        self,
        request: DocumentSearchRequest,
    ) -> DocumentListResponse:
        """Search for legal documents
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching documents
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/search",
                headers=self._get_headers(),
                json={
                    "query": request.query,
                    "documentType": request.document_type.value if request.document_type else None,
                    "jurisdiction": request.jurisdiction.value if request.jurisdiction else None,
                    "court": request.court,
                    "dateFrom": request.date_from,
                    "dateTo": request.date_to,
                    "keyNumbers": request.key_numbers,
                    "sortOrder": request.sort_order.value,
                    "offset": request.offset,
                    "limit": request.limit,
                },
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            
        documents = []
        for doc in data.get("documents", []):
            documents.append(DocumentResponse(
                document_id=doc["id"],
                title=doc["title"],
                document_type=DocumentType(doc.get("type", "cases")),
                court=doc.get("court"),
                synopsis=doc.get("synopsis"),
                topics=doc.get("topics", []),
            ))
            
        return DocumentListResponse(
            documents=documents,
            total=data.get("total", 0),
            offset=request.offset,
            limit=request.limit,
            has_more=data.get("hasMore", False),
            query_id=data.get("queryId"),
        )

    async def search_cases(
        self,
        request: CaseSearchRequest,
    ) -> CaseListResponse:
        """Search for case law
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching cases
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/cases/search",
                headers=self._get_headers(),
                json={
                    "query": request.query,
                    "jurisdiction": request.jurisdiction.value if request.jurisdiction else None,
                    "court": request.court,
                    "dateFrom": request.date_from,
                    "dateTo": request.date_to,
                    "keyNumbers": request.key_numbers,
                    "topics": request.topics,
                    "judge": request.judge,
                    "sortOrder": request.sort_order.value,
                    "offset": request.offset,
                    "limit": request.limit,
                },
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            
        cases = []
        for case in data.get("cases", []):
            citation = LegalCitation(
                cite=case.get("citation", ""),
                title=case.get("caseName", ""),
                court=case.get("court", ""),
                date=case.get("dateDecided", ""),
                jurisdiction=case.get("jurisdiction", "US-FED"),
            )
            cases.append(CaseResponse(
                case_id=case["id"],
                case_name=case["caseName"],
                citation=citation,
                court=case.get("court", ""),
                date_decided=case.get("dateDecided", ""),
                synopsis=case.get("synopsis"),
                holding=case.get("holding"),
                judges=case.get("judges", []),
            ))
            
        return CaseListResponse(
            cases=cases,
            total=data.get("total", 0),
            offset=request.offset,
            limit=request.limit,
            has_more=data.get("hasMore", False),
        )

    async def search_statutes(
        self,
        request: StatuteSearchRequest,
    ) -> StatuteListResponse:
        """Search for statutes
        
        Args:
            request: Search parameters
            
        Returns:
            List of matching statutes
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/statutes/search",
                headers=self._get_headers(),
                json={
                    "query": request.query,
                    "jurisdiction": request.jurisdiction.value if request.jurisdiction else None,
                    "codeName": request.code_name,
                    "dateFrom": request.date_from,
                    "dateTo": request.date_to,
                    "includeAnnotations": request.include_annotations,
                    "sortOrder": request.sort_order.value,
                    "offset": request.offset,
                    "limit": request.limit,
                },
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            
        statutes = []
        for statute in data.get("statutes", []):
            statutes.append(StatuteResponse(
                statute_id=statute["id"],
                title=statute["title"],
                citation=statute.get("citation", ""),
                jurisdiction=Jurisdiction(statute.get("jurisdiction", "US-FED")),
                code_name=statute.get("codeName", ""),
                section_number=statute.get("sectionNumber", ""),
                effective_date=statute.get("effectiveDate"),
                text=statute.get("text"),
                annotations=statute.get("annotations", []),
            ))
            
        return StatuteListResponse(
            statutes=statutes,
            total=data.get("total", 0),
            offset=request.offset,
            limit=request.limit,
            has_more=data.get("hasMore", False),
        )

    async def get_document(
        self,
        document_id: str,
    ) -> DocumentResponse:
        """Get a specific document by ID
        
        Args:
            document_id: Document identifier
            
        Returns:
            Full document details
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/v1/documents/{document_id}",
                headers=self._get_headers(),
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            doc = response.json()
            
        return DocumentResponse(
            document_id=doc["id"],
            title=doc["title"],
            document_type=DocumentType(doc.get("type", "cases")),
            court=doc.get("court"),
            date_decided=doc.get("dateDecided"),
            judges=doc.get("judges", []),
            parties=doc.get("parties", []),
            synopsis=doc.get("synopsis"),
            full_text=doc.get("fullText"),
            word_count=doc.get("wordCount"),
            topics=doc.get("topics", []),
        )

    async def keycite(
        self,
        request: KeyCiteRequest,
    ) -> KeyCiteResponse:
        """KeyCite a citation
        
        Args:
            request: KeyCite request parameters
            
        Returns:
            KeyCite validation results
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self._get_base_url()}/v1/keycite",
                headers=self._get_headers(),
                json={
                    "citation": request.citation,
                    "includeCitingRefs": request.include_citing_refs,
                    "includeHistory": request.include_history,
                    "depthLimit": request.depth_limit,
                },
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            
        citing_refs = []
        for ref in data.get("citingReferences", []):
            citing_refs.append(CitingReference(
                citation=ref.get("citation", ""),
                case_name=ref.get("caseName", ""),
                court=ref.get("court", ""),
                date=ref.get("date", ""),
                depth=ref.get("depth", 1),
                headnote_numbers=ref.get("headnoteNumbers", []),
                quoted_text=ref.get("quotedText"),
                treatment=TreatmentType(ref["treatment"]) if ref.get("treatment") else None,
            ))
            
        negative_history = []
        for hist in data.get("negativeHistory", []):
            negative_history.append(NegativeHistory(
                citation=hist.get("citation", ""),
                case_name=hist.get("caseName", ""),
                action=hist.get("action", ""),
                court=hist.get("court", ""),
                date=hist.get("date", ""),
                description=hist.get("description", ""),
            ))
            
        positive_history = []
        for hist in data.get("positiveHistory", []):
            positive_history.append(PositiveHistory(
                citation=hist.get("citation", ""),
                case_name=hist.get("caseName", ""),
                action=hist.get("action", ""),
                court=hist.get("court", ""),
                date=hist.get("date", ""),
            ))
            
        status = KeyCiteStatus(data.get("status", "unknown"))
        status_icons = {
            KeyCiteStatus.GOOD: "green",
            KeyCiteStatus.CAUTION: "yellow",
            KeyCiteStatus.NEGATIVE: "red",
            KeyCiteStatus.UNKNOWN: "none",
        }
            
        return KeyCiteResponse(
            citation=request.citation,
            status=status,
            status_icon=status_icons.get(status, "none"),
            status_description=data.get("statusDescription", ""),
            citing_references=citing_refs,
            negative_history=negative_history,
            positive_history=positive_history,
            total_citing_references=data.get("totalCitingReferences", len(citing_refs)),
            last_updated=datetime.fromisoformat(data["lastUpdated"]) if data.get("lastUpdated") else None,
        )

    async def get_key_number(
        self,
        key_number: str,
    ) -> KeyNumber:
        """Get details for a West Key Number
        
        Args:
            key_number: The key number to look up
            
        Returns:
            Key number details
        """
        if not self.config:
            raise ValueError("Westlaw connection not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._get_base_url()}/v1/keynumbers/{key_number}",
                headers=self._get_headers(),
                timeout=self.config.timeout,
            )
            response.raise_for_status()
            data = response.json()
            
        return KeyNumber(
            number=data.get("number", key_number),
            topic=data.get("topic", ""),
            description=data.get("description", ""),
            hierarchy=data.get("hierarchy", []),
        )
