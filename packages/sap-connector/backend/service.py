"""
SAP Connector Service

Provides business logic for SAP ERP integration including
RFC calls, BAPI execution, OData services, and IDoc processing.
"""

import httpx
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, quote
import base64

from .schemas import (
    SAPCredentials,
    SAPConnectionConfig,
    SAPConnectionResponse,
    RFCCallRequest,
    RFCCallResponse,
    RFCMetadata,
    RFCParameter,
    BAPICallRequest,
    BAPICallResponse,
    BAPIMessage,
    ODataRequest,
    ODataResponse,
    ODataEntityRequest,
    ODataVersion,
    IDocSendRequest,
    IDocSendResponse,
    IDocStatus,
    IDocState,
    IDocType,
)


class SAPService:
    """Service for SAP API operations"""

    def __init__(self, config: Optional[SAPConnectionConfig] = None):
        """Initialize SAP service
        
        Args:
            config: SAP connection configuration
        """
        self.config = config
        self._session_id: Optional[str] = None
        self._csrf_token: Optional[str] = None

    def _get_base_url(self) -> str:
        """Get SAP base URL"""
        if not self.config:
            raise ValueError("SAP connection not configured")
        return f"https://{self.config.host}"

    def _get_auth_header(self, credentials: SAPCredentials) -> str:
        """Get authorization header"""
        auth_string = f"{credentials.username}:{credentials.password}"
        encoded = base64.b64encode(auth_string.encode()).decode()
        return f"Basic {encoded}"

    def _get_headers(
        self,
        credentials: SAPCredentials,
        content_type: str = "application/json",
    ) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Authorization": self._get_auth_header(credentials),
            "Content-Type": content_type,
            "Accept": "application/json",
            "sap-client": self.config.client if self.config else "100",
        }
        if self._csrf_token:
            headers["X-CSRF-Token"] = self._csrf_token
        return headers

    async def connect(
        self,
        config: SAPConnectionConfig,
        credentials: SAPCredentials,
    ) -> SAPConnectionResponse:
        """Establish SAP connection
        
        Args:
            config: Connection configuration
            credentials: Authentication credentials
            
        Returns:
            Connection response
        """
        self.config = config
        base_url = self._get_base_url()
        
        async with httpx.AsyncClient(verify=False, timeout=config.timeout) as client:
            # Fetch CSRF token
            headers = self._get_headers(credentials)
            headers["X-CSRF-Token"] = "Fetch"
            
            response = await client.get(
                f"{base_url}/sap/bc/rest/ping",
                headers=headers,
            )
            
            if response.status_code == 200:
                self._csrf_token = response.headers.get("x-csrf-token")
                self._session_id = response.cookies.get("SAP_SESSIONID")
                
                return SAPConnectionResponse(
                    connected=True,
                    session_id=self._session_id,
                    system_info={
                        "host": config.host,
                        "system_number": config.system_number,
                        "client": config.client,
                    },
                )
            else:
                return SAPConnectionResponse(connected=False)

    async def disconnect(self) -> bool:
        """Close SAP connection
        
        Returns:
            True if disconnected successfully
        """
        self._session_id = None
        self._csrf_token = None
        return True

    async def call_rfc(
        self,
        credentials: SAPCredentials,
        request: RFCCallRequest,
    ) -> RFCCallResponse:
        """Execute RFC function call
        
        Args:
            credentials: SAP credentials
            request: RFC call request
            
        Returns:
            RFC call response
        """
        base_url = self._get_base_url()
        
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            response = await client.post(
                f"{base_url}/sap/bc/srt/rfc/sap/{request.function_name}",
                headers=self._get_headers(credentials),
                json=request.parameters,
            )
            
            if response.status_code == 200:
                data = response.json()
                return RFCCallResponse(
                    success=True,
                    export_params=data.get("EXPORT", {}),
                    tables=data.get("TABLES", {}),
                    messages=data.get("RETURN", []),
                )
            else:
                return RFCCallResponse(
                    success=False,
                    messages=[{"TYPE": "E", "MESSAGE": response.text}],
                )

    async def get_rfc_metadata(
        self,
        credentials: SAPCredentials,
        function_name: str,
    ) -> RFCMetadata:
        """Get RFC function metadata
        
        Args:
            credentials: SAP credentials
            function_name: Function module name
            
        Returns:
            Function metadata
        """
        # Call RFC_FUNCTION_INTERFACE to get metadata
        request = RFCCallRequest(
            function_name="RFC_GET_FUNCTION_INTERFACE",
            parameters={"FUNCNAME": function_name},
        )
        
        response = await self.call_rfc(credentials, request)
        
        import_params = []
        export_params = []
        changing_params = []
        table_params = []
        
        for param in response.tables.get("PARAMS", []):
            rfc_param = RFCParameter(
                name=param.get("PARAMETER", ""),
                type=param.get("TABNAME", ""),
                direction=param.get("PARAMCLASS", ""),
                optional=param.get("OPTIONAL", "") == "X",
                description=param.get("STEXT", ""),
            )
            
            if param.get("PARAMCLASS") == "I":
                import_params.append(rfc_param)
            elif param.get("PARAMCLASS") == "E":
                export_params.append(rfc_param)
            elif param.get("PARAMCLASS") == "C":
                changing_params.append(rfc_param)
            elif param.get("PARAMCLASS") == "T":
                table_params.append(rfc_param)
        
        return RFCMetadata(
            name=function_name,
            import_params=import_params,
            export_params=export_params,
            changing_params=changing_params,
            table_params=table_params,
        )

    async def call_bapi(
        self,
        credentials: SAPCredentials,
        request: BAPICallRequest,
    ) -> BAPICallResponse:
        """Execute BAPI call
        
        Args:
            credentials: SAP credentials
            request: BAPI call request
            
        Returns:
            BAPI call response
        """
        # Execute BAPI
        rfc_request = RFCCallRequest(
            function_name=request.bapi_name,
            parameters=request.parameters,
        )
        
        rfc_response = await self.call_rfc(credentials, rfc_request)
        
        # Parse return messages
        return_messages = []
        for msg in rfc_response.messages:
            if isinstance(msg, dict):
                return_messages.append(BAPIMessage(
                    type=msg.get("TYPE", "E"),
                    id=msg.get("ID", ""),
                    number=msg.get("NUMBER", ""),
                    message=msg.get("MESSAGE", ""),
                    log_number=msg.get("LOG_NO"),
                    log_msg_number=msg.get("LOG_MSG_NO"),
                ))
        
        # Check for errors
        has_error = any(m.type in ("E", "A") for m in return_messages)
        
        # Commit if requested and no errors
        committed = False
        if request.auto_commit and not has_error:
            commit_request = RFCCallRequest(function_name="BAPI_TRANSACTION_COMMIT")
            await self.call_rfc(credentials, commit_request)
            committed = True
        
        return BAPICallResponse(
            success=not has_error,
            data=rfc_response.export_params,
            tables=rfc_response.tables,
            return_messages=return_messages,
            committed=committed,
        )

    async def commit_bapi(self, credentials: SAPCredentials) -> bool:
        """Commit BAPI transaction
        
        Args:
            credentials: SAP credentials
            
        Returns:
            True if committed successfully
        """
        request = RFCCallRequest(function_name="BAPI_TRANSACTION_COMMIT")
        response = await self.call_rfc(credentials, request)
        return response.success

    async def rollback_bapi(self, credentials: SAPCredentials) -> bool:
        """Rollback BAPI transaction
        
        Args:
            credentials: SAP credentials
            
        Returns:
            True if rolled back successfully
        """
        request = RFCCallRequest(function_name="BAPI_TRANSACTION_ROLLBACK")
        response = await self.call_rfc(credentials, request)
        return response.success

    def _build_odata_url(self, request: ODataRequest) -> str:
        """Build OData request URL"""
        url = f"{request.service_path}/{request.entity_set}"
        
        if request.key:
            url += f"({request.key})"
        
        params = []
        
        if request.select:
            params.append(f"$select={','.join(request.select)}")
        if request.filter:
            params.append(f"$filter={quote(request.filter)}")
        if request.expand:
            params.append(f"$expand={','.join(request.expand)}")
        if request.orderby:
            params.append(f"$orderby={quote(request.orderby)}")
        if request.top:
            params.append(f"$top={request.top}")
        if request.skip:
            params.append(f"$skip={request.skip}")
        if request.count:
            params.append("$count=true")
        
        if params:
            url += "?" + "&".join(params)
        
        return url

    async def odata_get(
        self,
        credentials: SAPCredentials,
        request: ODataRequest,
    ) -> ODataResponse:
        """Execute OData GET request
        
        Args:
            credentials: SAP credentials
            request: OData request
            
        Returns:
            OData response
        """
        base_url = self._get_base_url()
        url = self._build_odata_url(request)
        
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            response = await client.get(
                f"{base_url}{url}",
                headers=self._get_headers(credentials),
            )
            
            if response.status_code == 200:
                data = response.json()
                return ODataResponse(
                    success=True,
                    data=data.get("d", {}).get("results", data.get("d", data)),
                    count=data.get("d", {}).get("__count"),
                    next_link=data.get("d", {}).get("__next"),
                )
            else:
                return ODataResponse(success=False, data=response.text)

    async def odata_create(
        self,
        credentials: SAPCredentials,
        request: ODataEntityRequest,
    ) -> ODataResponse:
        """Execute OData POST (create) request
        
        Args:
            credentials: SAP credentials
            request: OData entity request
            
        Returns:
            OData response
        """
        base_url = self._get_base_url()
        url = f"{request.service_path}/{request.entity_set}"
        
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            response = await client.post(
                f"{base_url}{url}",
                headers=self._get_headers(credentials),
                json=request.data,
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                return ODataResponse(success=True, data=data.get("d", data))
            else:
                return ODataResponse(success=False, data=response.text)

    async def odata_update(
        self,
        credentials: SAPCredentials,
        request: ODataEntityRequest,
    ) -> ODataResponse:
        """Execute OData PATCH (update) request
        
        Args:
            credentials: SAP credentials
            request: OData entity request
            
        Returns:
            OData response
        """
        if not request.key:
            raise ValueError("Entity key is required for update")
        
        base_url = self._get_base_url()
        url = f"{request.service_path}/{request.entity_set}({request.key})"
        
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            response = await client.patch(
                f"{base_url}{url}",
                headers=self._get_headers(credentials),
                json=request.data,
            )
            
            if response.status_code in (200, 204):
                return ODataResponse(success=True, data={"updated": True})
            else:
                return ODataResponse(success=False, data=response.text)

    async def odata_delete(
        self,
        credentials: SAPCredentials,
        service_path: str,
        entity_set: str,
        key: str,
    ) -> ODataResponse:
        """Execute OData DELETE request
        
        Args:
            credentials: SAP credentials
            service_path: OData service path
            entity_set: Entity set name
            key: Entity key
            
        Returns:
            OData response
        """
        base_url = self._get_base_url()
        url = f"{service_path}/{entity_set}({key})"
        
        async with httpx.AsyncClient(verify=False, timeout=30) as client:
            response = await client.delete(
                f"{base_url}{url}",
                headers=self._get_headers(credentials),
            )
            
            if response.status_code == 204:
                return ODataResponse(success=True, data={"deleted": True})
            else:
                return ODataResponse(success=False, data=response.text)

    async def send_idoc(
        self,
        credentials: SAPCredentials,
        request: IDocSendRequest,
    ) -> IDocSendResponse:
        """Send IDoc to SAP
        
        Args:
            credentials: SAP credentials
            request: IDoc send request
            
        Returns:
            IDoc send response
        """
        # Build IDoc data structure
        idoc_data = {
            "IDOC_CONTROL_REC_40": {
                "IDOCTYP": request.idoc_type,
                "MESTYP": request.message_type,
                "RCVPRT": "LS",
                "RCVPRN": request.receiver_partner,
                "RCVPOR": request.receiver_port,
            },
            "IDOC_DATA_REC_40": [],
        }
        
        # Convert segments to IDoc data records
        segment_number = 0
        for segment in request.segments:
            segment_number += 1
            idoc_data["IDOC_DATA_REC_40"].append({
                "SEGNUM": str(segment_number).zfill(6),
                "SEGNAM": segment.name,
                "SDATA": str(segment.data),
            })
        
        # Call IDoc inbound function
        rfc_request = RFCCallRequest(
            function_name="IDOC_INBOUND_ASYNCHRONOUS",
            parameters=idoc_data,
        )
        
        response = await self.call_rfc(credentials, rfc_request)
        
        if response.success:
            idoc_number = response.export_params.get("DOCNUM", "")
            return IDocSendResponse(
                success=True,
                idoc_number=idoc_number,
                status=IDocState.SENT,
                messages=["IDoc sent successfully"],
            )
        else:
            return IDocSendResponse(
                success=False,
                idoc_number="",
                status=IDocState.ERROR,
                messages=[m.get("MESSAGE", "") for m in response.messages if isinstance(m, dict)],
            )

    async def get_idoc_status(
        self,
        credentials: SAPCredentials,
        idoc_number: str,
    ) -> IDocStatus:
        """Get IDoc status
        
        Args:
            credentials: SAP credentials
            idoc_number: IDoc number
            
        Returns:
            IDoc status
        """
        # Call RFC to get IDoc status
        rfc_request = RFCCallRequest(
            function_name="EDI_DOCUMENT_READ",
            parameters={"DOCUMENT_NUMBER": idoc_number},
        )
        
        response = await self.call_rfc(credentials, rfc_request)
        control = response.export_params.get("IDOC_CONTROL", {})
        
        from datetime import datetime
        
        return IDocStatus(
            idoc_number=idoc_number,
            idoc_type=control.get("IDOCTYP", ""),
            message_type=control.get("MESTYP", ""),
            direction=control.get("DIRECT", "1") == "1" and "outbound" or "inbound",
            status=IDocState.PROCESSED,
            status_text=control.get("STATUS", ""),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            partner=control.get("RCVPRN", ""),
        )

    async def get_idoc_types(
        self,
        credentials: SAPCredentials,
    ) -> List[IDocType]:
        """Get available IDoc types
        
        Args:
            credentials: SAP credentials
            
        Returns:
            List of IDoc types
        """
        rfc_request = RFCCallRequest(
            function_name="IDOCTYPES_LIST_ALL",
            parameters={},
        )
        
        response = await self.call_rfc(credentials, rfc_request)
        
        idoc_types = []
        for item in response.tables.get("PT_IDOCTYPES", []):
            idoc_types.append(IDocType(
                name=item.get("IDOCTYP", ""),
                description=item.get("DESCRP", ""),
                extension=item.get("CIMTYP"),
                message_type=item.get("MESTYP", ""),
            ))
        
        return idoc_types
