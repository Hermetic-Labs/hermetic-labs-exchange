"""
Stripe Connector - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Dict, Any, Optional
from .schemas import (
    PaymentIntentRequest,
    PaymentIntentResponse,
    CustomerRequest,
    CustomerResponse,
    SubscriptionRequest,
    SubscriptionResponse,
    WebhookEvent
)
from .service import StripeService

router = APIRouter(prefix="/stripe", tags=["stripe"])

# Dependency injection for service
def get_stripe_service() -> StripeService:
    return StripeService()


@router.post("/payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: PaymentIntentRequest,
    service: StripeService = Depends(get_stripe_service)
) -> PaymentIntentResponse:
    """Create a Stripe payment intent."""
    try:
        return await service.create_payment_intent(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/customer", response_model=CustomerResponse)
async def create_customer(
    request: CustomerRequest,
    service: StripeService = Depends(get_stripe_service)
) -> CustomerResponse:
    """Create a Stripe customer."""
    try:
        return await service.create_customer(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/customer/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    service: StripeService = Depends(get_stripe_service)
) -> CustomerResponse:
    """Get a Stripe customer by ID."""
    try:
        return await service.get_customer(customer_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/subscription", response_model=SubscriptionResponse)
async def create_subscription(
    request: SubscriptionRequest,
    service: StripeService = Depends(get_stripe_service)
) -> SubscriptionResponse:
    """Create a Stripe subscription."""
    try:
        return await service.create_subscription(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/subscription/{subscription_id}")
async def cancel_subscription(
    subscription_id: str,
    service: StripeService = Depends(get_stripe_service)
) -> Dict[str, Any]:
    """Cancel a Stripe subscription."""
    try:
        await service.cancel_subscription(subscription_id)
        return {"success": True, "subscription_id": subscription_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    service: StripeService = Depends(get_stripe_service)
) -> Dict[str, Any]:
    """Handle Stripe webhook events."""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature", "")
        
        event = await service.verify_webhook(payload, sig_header)
        await service.process_webhook_event(event)
        
        return {"received": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
