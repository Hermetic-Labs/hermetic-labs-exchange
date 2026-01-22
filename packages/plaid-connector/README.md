# @eve-os/plaid-connector

Full Plaid banking integration for EVE-OS. Provides secure access to financial data including accounts, transactions, balances, identity verification, and investment tracking.

## Features

### 🔗 Link Tokens
Create Plaid Link tokens for secure user authentication and account connection.

```typescript
import { PlaidConnector } from '@eve-os/plaid-connector';

const plaid = new PlaidConnector();
plaid.configure({
  clientId: 'your-client-id',
  secret: 'your-secret',
  environment: 'sandbox'
});

const linkToken = await plaid.createLinkToken({
  userId: 'user-123',
  clientName: 'My App',
  products: ['transactions', 'auth'],
  countryCodes: ['US']
});
```

### 🏦 Account Linking
Exchange public tokens for access tokens and retrieve linked accounts.

```typescript
// Exchange public token after Link flow completes
const accessToken = await plaid.exchangePublicToken(publicToken);

// Get linked accounts
const accounts = await plaid.getAccounts(accessToken);
```

### 💰 Transactions
Retrieve and sync transaction history with automatic pagination.

```typescript
const transactions = await plaid.getTransactions(accessToken, {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  count: 100
});
```

### 👤 Identity Verification
Access account holder identity information for KYC/AML compliance.

```typescript
const identity = await plaid.getIdentity(accessToken);
// Returns names, addresses, emails, phone numbers
```

### 🔐 Auth (ACH/Bank Numbers)
Retrieve account and routing numbers for ACH transfers.

```typescript
const auth = await plaid.getAuth(accessToken);
// Returns ACH, EFT, BACS, and international numbers
```

### 💵 Balance
Get real-time account balances.

```typescript
const balances = await plaid.getBalances(accessToken);
// Returns available, current, and limit for each account
```

### 📈 Investments
Track investment holdings, securities, and transactions.

```typescript
const holdings = await plaid.getInvestmentHoldings(accessToken);
const transactions = await plaid.getInvestmentTransactions(accessToken, {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

### 📋 Liabilities
Access credit card, mortgage, and student loan information.

```typescript
const liabilities = await plaid.getLiabilities(accessToken);
// Returns credit, mortgage, and student loan details
```

### 🔔 Webhooks
Handle Plaid webhooks for real-time updates.

```typescript
// Verify and process webhooks
const verification = await plaid.verifyWebhook(webhookBody, headers);

// Event emitter for webhook events
plaid.on('webhook', (event) => {
  console.log('Webhook received:', event.webhookType, event.webhookCode);
});
```

## Installation

```bash
pnpm add @eve-os/plaid-connector
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PLAID_CLIENT_ID` | Your Plaid client ID |
| `PLAID_SECRET` | Your Plaid secret key |
| `PLAID_ENV` | Environment: `sandbox`, `development`, or `production` |
| `PLAID_WEBHOOK_URL` | Webhook endpoint URL |

### Supported Products

- `transactions` - Transaction history
- `auth` - Account/routing numbers
- `identity` - Account holder identity
- `assets` - Asset reports
- `investments` - Investment accounts
- `liabilities` - Liabilities (credit, mortgage, student loans)
- `payment_initiation` - Payment initiation (UK/EU)
- `transfer` - ACH transfers
- `income_verification` - Income verification
- `employment` - Employment verification

## Backend Integration

The package includes FastAPI routes for server-side integration:

```python
from plaid_connector.backend.routes import router

app.include_router(router, prefix="/api")
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/plaid/link-token` | Create a link token |
| POST | `/plaid/exchange` | Exchange public token |
| GET | `/plaid/accounts/{access_token}` | Get accounts |
| GET | `/plaid/transactions/{access_token}` | Get transactions |
| POST | `/plaid/webhook` | Handle webhooks |

## License

MIT © EVE Core Team
