"""
Stripe Connector - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    TRIALING = "trialing"


# Payment Intent Schemas
class PaymentIntentRequest(BaseModel):
    amount: int = Field(..., description="Amount in cents", ge=50)
    currency: str = Field(default="usd", max_length=3)
    customer_id: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    automatic_payment_methods: bool = True


class PaymentIntentResponse(BaseModel):
    id: str
    client_secret: str
    amount: int
    currency: str
    status: PaymentStatus
    created: datetime


# Customer Schemas
class CustomerRequest(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    address: Optional[Dict[str, str]] = None


class CustomerResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created: datetime
    default_source: Optional[str] = None


# Subscription Schemas
class SubscriptionRequest(BaseModel):
    customer_id: str
    price_id: str
    quantity: int = 1
    trial_period_days: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None


class SubscriptionResponse(BaseModel):
    id: str
    customer_id: str
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False


# Webhook Schemas
class WebhookEvent(BaseModel):
    id: str
    type: str
    created: datetime
    data: Dict[str, Any]
    livemode: bool = False
