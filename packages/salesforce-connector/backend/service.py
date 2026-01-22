"""
Salesforce Connector Service

Provides business logic for Salesforce CRM integration including
OAuth authentication, SOQL queries, object CRUD, and bulk operations.
"""

import httpx
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from .schemas import (
    SalesforceCredentials,
    OAuthTokenResponse,
    SOQLQueryRequest,
    SOQLQueryResponse,
    SObjectCreateResponse,
    SObjectDeleteResponse,
    BulkOperationType,
    BulkOperationRequest,
    BulkOperationResponse,
    BulkJobState,
    BulkJobStatus,
    DescribeObjectResponse,
)


class SalesforceService:
    """Service for Salesforce API operations"""

    PRODUCTION_AUTH_URL = "https://login.salesforce.com"
    SANDBOX_AUTH_URL = "https://test.salesforce.com"
    API_VERSION = "v59.0"

    def __init__(self, sandbox: bool = False):
        """Initialize Salesforce service
        
        Args:
            sandbox: Whether to use sandbox environment
        """
        self.sandbox = sandbox
        self.auth_url = self.SANDBOX_AUTH_URL if sandbox else self.PRODUCTION_AUTH_URL

    def get_authorization_url(
        self,
        client_id: str,
        redirect_uri: str,
        scope: str = "api refresh_token",
        state: Optional[str] = None,
    ) -> str:
        """Generate OAuth authorization URL
        
        Args:
            client_id: OAuth client ID
            redirect_uri: Redirect URI after authorization
            scope: OAuth scopes
            state: Optional state parameter
            
        Returns:
            Authorization URL
        """
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scope,
        }
        if state:
            params["state"] = state
        return f"{self.auth_url}/services/oauth2/authorize?{urlencode(params)}"

    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ) -> OAuthTokenResponse:
        """Exchange authorization code for access token
        
        Args:
            code: Authorization code
            client_id: OAuth client ID
            client_secret: OAuth client secret
            redirect_uri: Redirect URI
            
        Returns:
            OAuth token response
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/services/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status()
            data = response.json()
            return OAuthTokenResponse(**data)

    async def refresh_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> OAuthTokenResponse:
        """Refresh access token
        
        Args:
            refresh_token: Refresh token
            client_id: OAuth client ID
            client_secret: OAuth client secret
            
        Returns:
            New OAuth token response
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/services/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()
            return OAuthTokenResponse(**data)

    def _get_headers(self, credentials: SalesforceCredentials) -> Dict[str, str]:
        """Get request headers with authorization"""
        return {
            "Authorization": f"{credentials.token_type} {credentials.access_token}",
            "Content-Type": "application/json",
        }

    def _get_base_url(self, credentials: SalesforceCredentials) -> str:
        """Get API base URL"""
        return f"{credentials.instance_url}/services/data/{self.API_VERSION}"

    async def execute_soql(
        self,
        credentials: SalesforceCredentials,
        request: SOQLQueryRequest,
    ) -> SOQLQueryResponse:
        """Execute SOQL query
        
        Args:
            credentials: Salesforce credentials
            request: SOQL query request
            
        Returns:
            Query response with records
        """
        base_url = self._get_base_url(credentials)
        endpoint = "queryAll" if request.include_deleted else "query"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/{endpoint}",
                headers=self._get_headers(credentials),
                params={"q": request.query},
            )
            response.raise_for_status()
            data = response.json()
            return SOQLQueryResponse(
                total_size=data.get("totalSize", 0),
                done=data.get("done", True),
                next_records_url=data.get("nextRecordsUrl"),
                records=data.get("records", []),
            )

    async def get_next_records(
        self,
        credentials: SalesforceCredentials,
        next_records_url: str,
    ) -> SOQLQueryResponse:
        """Get next batch of query records
        
        Args:
            credentials: Salesforce credentials
            next_records_url: URL for next batch
            
        Returns:
            Query response with next batch of records
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{credentials.instance_url}{next_records_url}",
                headers=self._get_headers(credentials),
            )
            response.raise_for_status()
            data = response.json()
            return SOQLQueryResponse(
                total_size=data.get("totalSize", 0),
                done=data.get("done", True),
                next_records_url=data.get("nextRecordsUrl"),
                records=data.get("records", []),
            )

    async def get_record(
        self,
        credentials: SalesforceCredentials,
        object_type: str,
        record_id: str,
        fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Get a single record
        
        Args:
            credentials: Salesforce credentials
            object_type: SObject type
            record_id: Record ID
            fields: Optional list of fields to retrieve
            
        Returns:
            Record data
        """
        base_url = self._get_base_url(credentials)
        url = f"{base_url}/sobjects/{object_type}/{record_id}"
        
        params = {}
        if fields:
            params["fields"] = ",".join(fields)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(credentials),
                params=params if params else None,
            )
            response.raise_for_status()
            return response.json()

    async def create_record(
        self,
        credentials: SalesforceCredentials,
        object_type: str,
        fields: Dict[str, Any],
    ) -> SObjectCreateResponse:
        """Create a new record
        
        Args:
            credentials: Salesforce credentials
            object_type: SObject type
            fields: Field values
            
        Returns:
            Create response with record ID
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/sobjects/{object_type}",
                headers=self._get_headers(credentials),
                json=fields,
            )
            response.raise_for_status()
            data = response.json()
            return SObjectCreateResponse(
                id=data.get("id"),
                success=data.get("success", True),
                errors=data.get("errors", []),
            )

    async def update_record(
        self,
        credentials: SalesforceCredentials,
        object_type: str,
        record_id: str,
        fields: Dict[str, Any],
    ) -> bool:
        """Update a record
        
        Args:
            credentials: Salesforce credentials
            object_type: SObject type
            record_id: Record ID
            fields: Field values to update
            
        Returns:
            True if successful
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{base_url}/sobjects/{object_type}/{record_id}",
                headers=self._get_headers(credentials),
                json=fields,
            )
            response.raise_for_status()
            return True

    async def delete_record(
        self,
        credentials: SalesforceCredentials,
        object_type: str,
        record_id: str,
    ) -> SObjectDeleteResponse:
        """Delete a record
        
        Args:
            credentials: Salesforce credentials
            object_type: SObject type
            record_id: Record ID
            
        Returns:
            Delete response
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{base_url}/sobjects/{object_type}/{record_id}",
                headers=self._get_headers(credentials),
            )
            response.raise_for_status()
            return SObjectDeleteResponse(id=record_id, success=True)

    async def describe_object(
        self,
        credentials: SalesforceCredentials,
        object_type: str,
    ) -> DescribeObjectResponse:
        """Describe an SObject
        
        Args:
            credentials: Salesforce credentials
            object_type: SObject type
            
        Returns:
            Object metadata
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/sobjects/{object_type}/describe",
                headers=self._get_headers(credentials),
            )
            response.raise_for_status()
            data = response.json()
            return DescribeObjectResponse(
                name=data.get("name"),
                label=data.get("label"),
                label_plural=data.get("labelPlural"),
                key_prefix=data.get("keyPrefix"),
                queryable=data.get("queryable", False),
                createable=data.get("createable", False),
                updateable=data.get("updateable", False),
                deletable=data.get("deletable", False),
                fields=data.get("fields", []),
            )

    async def create_bulk_job(
        self,
        credentials: SalesforceCredentials,
        request: BulkOperationRequest,
    ) -> BulkJobStatus:
        """Create a bulk job
        
        Args:
            credentials: Salesforce credentials
            request: Bulk operation request
            
        Returns:
            Bulk job status
        """
        base_url = self._get_base_url(credentials)
        
        job_data = {
            "object": request.object_type,
            "operation": request.operation.value,
            "contentType": "JSON",
        }
        
        if request.external_id_field:
            job_data["externalIdFieldName"] = request.external_id_field
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/jobs/ingest",
                headers=self._get_headers(credentials),
                json=job_data,
            )
            response.raise_for_status()
            data = response.json()
            return BulkJobStatus(
                id=data.get("id"),
                state=BulkJobState(data.get("state")),
                object=data.get("object"),
                operation=data.get("operation"),
                created_by_id=data.get("createdById"),
                created_date=data.get("createdDate"),
                system_modstamp=data.get("systemModstamp"),
                number_records_processed=data.get("numberRecordsProcessed", 0),
                number_records_failed=data.get("numberRecordsFailed", 0),
            )

    async def upload_bulk_data(
        self,
        credentials: SalesforceCredentials,
        job_id: str,
        records: List[Dict[str, Any]],
    ) -> bool:
        """Upload data to a bulk job
        
        Args:
            credentials: Salesforce credentials
            job_id: Bulk job ID
            records: Records to upload
            
        Returns:
            True if successful
        """
        base_url = self._get_base_url(credentials)
        headers = self._get_headers(credentials)
        headers["Content-Type"] = "application/json"
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{base_url}/jobs/ingest/{job_id}/batches",
                headers=headers,
                json=records,
            )
            response.raise_for_status()
            return True

    async def close_bulk_job(
        self,
        credentials: SalesforceCredentials,
        job_id: str,
    ) -> BulkJobStatus:
        """Close a bulk job to start processing
        
        Args:
            credentials: Salesforce credentials
            job_id: Bulk job ID
            
        Returns:
            Updated job status
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{base_url}/jobs/ingest/{job_id}",
                headers=self._get_headers(credentials),
                json={"state": "UploadComplete"},
            )
            response.raise_for_status()
            data = response.json()
            return BulkJobStatus(
                id=data.get("id"),
                state=BulkJobState(data.get("state")),
                object=data.get("object"),
                operation=data.get("operation"),
                created_by_id=data.get("createdById"),
                created_date=data.get("createdDate"),
                system_modstamp=data.get("systemModstamp"),
                number_records_processed=data.get("numberRecordsProcessed", 0),
                number_records_failed=data.get("numberRecordsFailed", 0),
            )

    async def get_bulk_job_status(
        self,
        credentials: SalesforceCredentials,
        job_id: str,
    ) -> BulkJobStatus:
        """Get bulk job status
        
        Args:
            credentials: Salesforce credentials
            job_id: Bulk job ID
            
        Returns:
            Job status
        """
        base_url = self._get_base_url(credentials)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/jobs/ingest/{job_id}",
                headers=self._get_headers(credentials),
            )
            response.raise_for_status()
            data = response.json()
            return BulkJobStatus(
                id=data.get("id"),
                state=BulkJobState(data.get("state")),
                object=data.get("object"),
                operation=data.get("operation"),
                created_by_id=data.get("createdById"),
                created_date=data.get("createdDate"),
                system_modstamp=data.get("systemModstamp"),
                number_records_processed=data.get("numberRecordsProcessed", 0),
                number_records_failed=data.get("numberRecordsFailed", 0),
                total_processing_time=data.get("totalProcessingTime"),
            )

    async def execute_bulk_operation(
        self,
        credentials: SalesforceCredentials,
        request: BulkOperationRequest,
    ) -> BulkOperationResponse:
        """Execute a complete bulk operation
        
        Args:
            credentials: Salesforce credentials
            request: Bulk operation request
            
        Returns:
            Bulk operation response
        """
        # Create job
        job_status = await self.create_bulk_job(credentials, request)
        
        # Upload data if provided
        if request.records:
            await self.upload_bulk_data(credentials, job_status.id, request.records)
        
        # Close job to start processing
        job_status = await self.close_bulk_job(credentials, job_status.id)
        
        return BulkOperationResponse(
            job_id=job_status.id,
            state=job_status.state,
            records_processed=job_status.number_records_processed,
            records_failed=job_status.number_records_failed,
        )
