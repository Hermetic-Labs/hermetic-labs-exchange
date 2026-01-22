# Stripe Connector

Stripe payment integration for EVE-OS marketplace.

## Features

- Payment intents and charges
- Subscription management
- Customer management
- Webhook handling
- Invoice generation

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { StripeConnector } from '@eve-os/stripe-connector';

const stripe = new StripeConnector({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});
```

## Usage

### Create Payment Intent

```typescript
const paymentIntent = await stripe.createPaymentIntent({
    amount: 2000, // $20.00
    currency: 'usd',
    customerId: 'cus_xxx'
});
```

### Manage Subscriptions

```typescript
const subscription = await stripe.createSubscription({
    customerId: 'cus_xxx',
    priceId: 'price_xxx'
});
```

## API Reference

See [StripeConnector.ts](./frontend/StripeConnector.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stripe/payment-intent` | Create payment intent |
| POST | `/stripe/customer` | Create customer |
| POST | `/stripe/subscription` | Create subscription |
| POST | `/stripe/webhook` | Handle Stripe webhooks |

## License

MIT - See [LICENSE](../../LICENSE)
