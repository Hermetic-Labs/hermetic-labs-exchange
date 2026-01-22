"""
Pydantic schemas for Plaid Connector API.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class PlaidError(BaseModel):
    """Plaid API error response."""
    error_type: str
    error_code: str
    error_message: str
    display_message: Optional[str] = None
    request_id: Optional[str] = None


class LinkTokenRequest(BaseModel):
    """Request to create a Plaid Link token."""
    user_id: str = Field(..., description="Unique identifier for the user")
    client_name: str = Field(..., description="Name of the client application")
    products: List[str] = Field(
        default=["transactions"],
        description="Plaid products to enable"
    )
    country_codes: List[str] = Field(
        default=["US"],
        description="Country codes for supported institutions"
    )
    language: str = Field(default="en", description="Language for Link")
    webhook: Optional[str] = Field(None, description="Webhook URL for updates")
    access_token: Optional[str] = Field(
        None,
        description="Access token for update mode"
    )
    redirect_uri: Optional[str] = Field(
        None,
        description="Redirect URI for OAuth"
    )


class LinkTokenResponse(BaseModel):
    """Response containing the Link token."""
    link_token: str
    expiration: datetime
    request_id: str


class ExchangeTokenRequest(BaseModel):
    """Request to exchange a public token for an access token."""
    public_token: str = Field(..., description="Public token from Plaid Link")


class ExchangeTokenResponse(BaseModel):
    """Response containing the access token."""
    access_token: str
    item_id: str
    request_id: str


class AccountBalance(BaseModel):
    """Account balance information."""
    available: Optional[float] = None
    current: Optional[float] = None
    limit: Optional[float] = None
    iso_currency_code: Optional[str] = None
    unofficial_currency_code: Optional[str] = None
    last_updated_datetime: Optional[datetime] = None


class AccountResponse(BaseModel):
    """Plaid account information."""
    account_id: str
    name: str
    official_name: Optional[str] = None
    type: Literal["depository", "credit", "loan", "investment", "brokerage", "other"]
    subtype: Optional[str] = None
    mask: Optional[str] = None
    balances: AccountBalance
    verification_status: Optional[str] = None


class TransactionLocation(BaseModel):
    """Transaction location information."""
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    store_number: Optional[str] = None


class PersonalFinanceCategory(BaseModel):
    """Personal finance category."""
    primary: str
    detailed: str


class TransactionResponse(BaseModel):
    """Plaid transaction information."""
    transaction_id: str
    account_id: str
    amount: float
    iso_currency_code: Optional[str] = None
    unofficial_currency_code: Optional[str] = None
    category: Optional[List[str]] = None
    category_id: Optional[str] = None
    check_number: Optional[str] = None
    date: str
    datetime: Optional[str] = None
    authorized_date: Optional[str] = None
    authorized_datetime: Optional[str] = None
    location: TransactionLocation
    name: str
    merchant_name: Optional[str] = None
    payment_channel: Literal["online", "in store", "other"]
    pending: bool
    pending_transaction_id: Optional[str] = None
    personal_finance_category: Optional[PersonalFinanceCategory] = None
    transaction_code: Optional[str] = None
    transaction_type: Optional[str] = None


class TransactionsRequest(BaseModel):
    """Request parameters for transactions."""
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    count: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class TransactionsResponse(BaseModel):
    """Response containing transactions."""
    accounts: List[AccountResponse]
    transactions: List[TransactionResponse]
    total_transactions: int
    request_id: str


class WebhookPayload(BaseModel):
    """Plaid webhook payload."""
    webhook_type: str
    webhook_code: str
    item_id: Optional[str] = None
    error: Optional[PlaidError] = None
    new_transactions: Optional[int] = None
    removed_transactions: Optional[List[str]] = None
    consent_expiration_time: Optional[datetime] = None


class WebhookResponse(BaseModel):
    """Webhook processing response."""
    received: bool = True
    webhook_type: str
    webhook_code: str
    processed: bool = False
    message: Optional[str] = None
