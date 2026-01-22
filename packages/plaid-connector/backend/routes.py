"""
FastAPI routes for Plaid Connector.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import List, Optional
import logging

from .schemas import (
    LinkTokenRequest,
    LinkTokenResponse,
    ExchangeTokenRequest,
    ExchangeTokenResponse,
    AccountResponse,
    TransactionsRequest,
    TransactionsResponse,
    WebhookPayload,
    WebhookResponse,
)
from .service import PlaidService, PlaidServiceError, get_plaid_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token", response_model=LinkTokenResponse)
async def create_link_token(
    request: LinkTokenRequest,
    service: PlaidService = Depends(get_plaid_service),
) -> LinkTokenResponse:
    """
    Create a Plaid Link token for initializing Plaid Link.

    The Link token is used to initialize the Plaid Link flow in the frontend,
    allowing users to securely connect their bank accounts.

    Args:
        request: Link token request parameters

    Returns:
        Link token response with token and expiration

    Raises:
        HTTPException: If token creation fails
    """
    try:
        return await service.create_link_token(request)
    except PlaidServiceError as e:
        logger.error(f"Failed to create link token: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "error_type": e.error_type,
                "error_code": e.error_code,
            },
        )


@router.post("/exchange", response_model=ExchangeTokenResponse)
async def exchange_public_token(
    request: ExchangeTokenRequest,
    service: PlaidService = Depends(get_plaid_service),
) -> ExchangeTokenResponse:
    """
    Exchange a public token from Plaid Link for an access token.

    After a user completes the Plaid Link flow, the frontend receives a
    public token which must be exchanged for a permanent access token.

    Args:
        request: Exchange token request with public token

    Returns:
        Access token response

    Raises:
        HTTPException: If token exchange fails
    """
    try:
        return await service.exchange_public_token(request.public_token)
    except PlaidServiceError as e:
        logger.error(f"Failed to exchange public token: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "error_type": e.error_type,
                "error_code": e.error_code,
            },
        )


@router.get("/accounts/{access_token}", response_model=List[AccountResponse])
async def get_accounts(
    access_token: str,
    service: PlaidService = Depends(get_plaid_service),
) -> List[AccountResponse]:
    """
    Get accounts for a connected item.

    Retrieves all accounts associated with the given access token,
    including account names, types, and current balances.

    Args:
        access_token: Plaid access token

    Returns:
        List of account information

    Raises:
        HTTPException: If account retrieval fails
    """
    try:
        return await service.get_accounts(access_token)
    except PlaidServiceError as e:
        logger.error(f"Failed to get accounts: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "error_type": e.error_type,
                "error_code": e.error_code,
            },
        )


@router.get("/transactions/{access_token}", response_model=TransactionsResponse)
async def get_transactions(
    access_token: str,
    start_date: str,
    end_date: str,
    count: int = 100,
    offset: int = 0,
    service: PlaidService = Depends(get_plaid_service),
) -> TransactionsResponse:
    """
    Get transactions for a connected item.

    Retrieves transactions for all accounts associated with the given
    access token within the specified date range.

    Args:
        access_token: Plaid access token
        start_date: Start date (YYYY-MM-DD format)
        end_date: End date (YYYY-MM-DD format)
        count: Number of transactions to return (max 500)
        offset: Pagination offset

    Returns:
        Transactions response with accounts and transaction list

    Raises:
        HTTPException: If transaction retrieval fails
    """
    try:
        return await service.get_transactions(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            count=count,
            offset=offset,
        )
    except PlaidServiceError as e:
        logger.error(f"Failed to get transactions: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "error_type": e.error_type,
                "error_code": e.error_code,
            },
        )


@router.post("/webhook", response_model=WebhookResponse)
async def handle_webhook(
    request: Request,
    plaid_verification: Optional[str] = Header(None, alias="Plaid-Verification"),
    service: PlaidService = Depends(get_plaid_service),
) -> WebhookResponse:
    """
    Handle incoming Plaid webhooks.

    Processes webhook notifications from Plaid, including transaction
    updates, item errors, and consent expiration warnings.

    Args:
        request: FastAPI request object
        plaid_verification: Plaid webhook verification header

    Returns:
        Webhook processing response

    Raises:
        HTTPException: If webhook processing fails
    """
    try:
        body = await request.json()
        payload = WebhookPayload(**body)

        logger.info(
            f"Received Plaid webhook: {payload.webhook_type}/{payload.webhook_code}"
        )

        # Process the webhook
        result = await service.process_webhook(payload)

        return WebhookResponse(
            received=True,
            webhook_type=payload.webhook_type,
            webhook_code=payload.webhook_code,
            processed=True,
            message=result.get("message"),
        )

    except Exception as e:
        logger.error(f"Failed to process webhook: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": str(e)},
        )
