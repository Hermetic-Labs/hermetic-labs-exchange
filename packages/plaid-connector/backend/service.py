"""
Plaid Service - Core business logic for Plaid integration.
"""

import os
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from .schemas import (
    LinkTokenRequest,
    LinkTokenResponse,
    ExchangeTokenResponse,
    AccountResponse,
    AccountBalance,
    TransactionResponse,
    TransactionLocation,
    PersonalFinanceCategory,
    TransactionsResponse,
    WebhookPayload,
)

logger = logging.getLogger(__name__)


class PlaidServiceError(Exception):
    """Exception raised for Plaid service errors."""

    def __init__(
        self,
        message: str,
        error_type: Optional[str] = None,
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        super().__init__(message)
        self.error_type = error_type
        self.error_code = error_code
        self.request_id = request_id


class PlaidService:
    """
    Service class for Plaid API integration.
    
    Handles all Plaid API communication including Link tokens,
    token exchange, account retrieval, and transaction sync.
    """

    ENVIRONMENTS = {
        "sandbox": "https://sandbox.plaid.com",
        "development": "https://development.plaid.com",
        "production": "https://production.plaid.com",
    }

    def __init__(
        self,
        client_id: Optional[str] = None,
        secret: Optional[str] = None,
        environment: str = "sandbox",
        timeout: float = 30.0,
    ):
        """
        Initialize the Plaid service.

        Args:
            client_id: Plaid client ID (defaults to PLAID_CLIENT_ID env var)
            secret: Plaid secret key (defaults to PLAID_SECRET env var)
            environment: Plaid environment (sandbox, development, production)
            timeout: Request timeout in seconds
        """
        self.client_id = client_id or os.getenv("PLAID_CLIENT_ID")
        self.secret = secret or os.getenv("PLAID_SECRET")
        self.environment = environment or os.getenv("PLAID_ENV", "sandbox")
        self.base_url = self.ENVIRONMENTS.get(self.environment, self.ENVIRONMENTS["sandbox"])
        self.timeout = timeout

        if not self.client_id or not self.secret:
            logger.warning("Plaid credentials not configured")

    async def _request(
        self,
        endpoint: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Make an authenticated request to the Plaid API.

        Args:
            endpoint: API endpoint path
            payload: Request payload

        Returns:
            API response as dictionary

        Raises:
            PlaidServiceError: If the request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        # Add credentials to payload
        payload["client_id"] = self.client_id
        payload["secret"] = self.secret

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                
                data = response.json()
                
                if response.status_code >= 400:
                    raise PlaidServiceError(
                        message=data.get("error_message", "Unknown error"),
                        error_type=data.get("error_type"),
                        error_code=data.get("error_code"),
                        request_id=data.get("request_id"),
                    )
                
                return data
                
            except httpx.RequestError as e:
                logger.error(f"Plaid request failed: {e}")
                raise PlaidServiceError(f"Request failed: {e}")

    async def create_link_token(self, request: LinkTokenRequest) -> LinkTokenResponse:
        """
        Create a Link token for initializing Plaid Link.

        Args:
            request: Link token request parameters

        Returns:
            Link token response with token and expiration
        """
        payload = {
            "user": {"client_user_id": request.user_id},
            "client_name": request.client_name,
            "products": request.products,
            "country_codes": request.country_codes,
            "language": request.language,
        }

        if request.webhook:
            payload["webhook"] = request.webhook
        if request.access_token:
            payload["access_token"] = request.access_token
        if request.redirect_uri:
            payload["redirect_uri"] = request.redirect_uri

        response = await self._request("/link/token/create", payload)

        return LinkTokenResponse(
            link_token=response["link_token"],
            expiration=datetime.fromisoformat(response["expiration"].replace("Z", "+00:00")),
            request_id=response["request_id"],
        )

    async def exchange_public_token(self, public_token: str) -> ExchangeTokenResponse:
        """
        Exchange a public token for an access token.

        Args:
            public_token: Public token from Plaid Link

        Returns:
            Access token response
        """
        response = await self._request(
            "/item/public_token/exchange",
            {"public_token": public_token},
        )

        return ExchangeTokenResponse(
            access_token=response["access_token"],
            item_id=response["item_id"],
            request_id=response["request_id"],
        )

    async def get_accounts(self, access_token: str) -> List[AccountResponse]:
        """
        Get accounts for an access token.

        Args:
            access_token: Plaid access token

        Returns:
            List of account information
        """
        response = await self._request(
            "/accounts/get",
            {"access_token": access_token},
        )

        return [self._map_account(acc) for acc in response["accounts"]]

    async def get_transactions(
        self,
        access_token: str,
        start_date: str,
        end_date: str,
        count: int = 100,
        offset: int = 0,
    ) -> TransactionsResponse:
        """
        Get transactions for an access token.

        Args:
            access_token: Plaid access token
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            count: Number of transactions to fetch
            offset: Pagination offset

        Returns:
            Transactions response with accounts and transactions
        """
        response = await self._request(
            "/transactions/get",
            {
                "access_token": access_token,
                "start_date": start_date,
                "end_date": end_date,
                "options": {
                    "count": count,
                    "offset": offset,
                },
            },
        )

        return TransactionsResponse(
            accounts=[self._map_account(acc) for acc in response["accounts"]],
            transactions=[self._map_transaction(txn) for txn in response["transactions"]],
            total_transactions=response["total_transactions"],
            request_id=response["request_id"],
        )

    def _map_account(self, data: Dict[str, Any]) -> AccountResponse:
        """Map Plaid API account response to schema."""
        balances = data.get("balances", {})
        return AccountResponse(
            account_id=data["account_id"],
            name=data["name"],
            official_name=data.get("official_name"),
            type=data["type"],
            subtype=data.get("subtype"),
            mask=data.get("mask"),
            balances=AccountBalance(
                available=balances.get("available"),
                current=balances.get("current"),
                limit=balances.get("limit"),
                iso_currency_code=balances.get("iso_currency_code"),
                unofficial_currency_code=balances.get("unofficial_currency_code"),
                last_updated_datetime=balances.get("last_updated_datetime"),
            ),
            verification_status=data.get("verification_status"),
        )

    def _map_transaction(self, data: Dict[str, Any]) -> TransactionResponse:
        """Map Plaid API transaction response to schema."""
        location = data.get("location", {})
        pfc = data.get("personal_finance_category")
        
        return TransactionResponse(
            transaction_id=data["transaction_id"],
            account_id=data["account_id"],
            amount=data["amount"],
            iso_currency_code=data.get("iso_currency_code"),
            unofficial_currency_code=data.get("unofficial_currency_code"),
            category=data.get("category"),
            category_id=data.get("category_id"),
            check_number=data.get("check_number"),
            date=data["date"],
            datetime=data.get("datetime"),
            authorized_date=data.get("authorized_date"),
            authorized_datetime=data.get("authorized_datetime"),
            location=TransactionLocation(
                address=location.get("address"),
                city=location.get("city"),
                region=location.get("region"),
                postal_code=location.get("postal_code"),
                country=location.get("country"),
                lat=location.get("lat"),
                lon=location.get("lon"),
                store_number=location.get("store_number"),
            ),
            name=data["name"],
            merchant_name=data.get("merchant_name"),
            payment_channel=data["payment_channel"],
            pending=data["pending"],
            pending_transaction_id=data.get("pending_transaction_id"),
            personal_finance_category=(
                PersonalFinanceCategory(
                    primary=pfc["primary"],
                    detailed=pfc["detailed"],
                )
                if pfc
                else None
            ),
            transaction_code=data.get("transaction_code"),
            transaction_type=data.get("transaction_type"),
        )

    async def process_webhook(self, payload: WebhookPayload) -> Dict[str, Any]:
        """
        Process an incoming Plaid webhook.

        Args:
            payload: Webhook payload

        Returns:
            Processing result
        """
        webhook_type = payload.webhook_type
        webhook_code = payload.webhook_code

        logger.info(f"Processing Plaid webhook: {webhook_type}/{webhook_code}")

        # Handle different webhook types
        if webhook_type == "TRANSACTIONS":
            if webhook_code == "SYNC_UPDATES_AVAILABLE":
                # Trigger transaction sync
                return {"action": "sync_transactions", "item_id": payload.item_id}
            elif webhook_code == "TRANSACTIONS_REMOVED":
                return {
                    "action": "remove_transactions",
                    "transaction_ids": payload.removed_transactions,
                }

        elif webhook_type == "ITEM":
            if webhook_code == "ERROR":
                return {
                    "action": "handle_error",
                    "item_id": payload.item_id,
                    "error": payload.error.dict() if payload.error else None,
                }
            elif webhook_code == "PENDING_EXPIRATION":
                return {
                    "action": "notify_expiration",
                    "item_id": payload.item_id,
                    "expiration": payload.consent_expiration_time,
                }

        return {"action": "none", "message": f"Unhandled webhook: {webhook_type}/{webhook_code}"}


# Default service instance
_default_service: Optional[PlaidService] = None


def get_plaid_service() -> PlaidService:
    """Get or create the default Plaid service instance."""
    global _default_service
    if _default_service is None:
        _default_service = PlaidService()
    return _default_service
