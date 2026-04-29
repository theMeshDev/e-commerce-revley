# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Revley hiring challenge implementing a subscription billing system with three applications:
- **subscription-service**: NestJS backend API for payment processing, checkout, and merchant portal
- **merchant**: Next.js merchant portal for viewing transactions, subscriptions, and configuring processors
- **checkout**: Next.js checkout page for customer purchases

## Running Services

### Backend (subscription-service)
```bash
cd subscription-service
npm i
cp .env.template .env

# Start local Supabase (first time takes a while)
npx supabase start

# Copy SUPABASE_PK and SUPABASE_SK from output into .env
# Re-print credentials if needed: npx supabase status

npm run start:dev  # Auto-reloads on changes

# Swagger docs at http://localhost:3000/docs
```

### Merchant Portal
```bash
cd merchant
npm i
cp .env.template .env
# Copy SUPABASE_PK from backend setup

npm run dev

# Navigate to http://localhost:3001/
# Login with: merchant1@example.com / password
```

### Checkout
```bash
cd checkout
npm i

npm run dev

# Navigate to http://localhost:3002/
```

## Testing and Development Commands

### Backend (subscription-service)
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Lint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run build` - Build production bundle
- `npm run db:reset` - Reset local Supabase database
- `npm run db:types` - Generate TypeScript types from database schema

### Frontend (merchant & checkout)
- `npm run dev` - Start dev server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run typecheck` - TypeScript type checking (no emit)

## Architecture

### Backend (subscription-service)

**Module Structure:**
- `auth/` - Supabase JWT authentication via `JwtAuthGuard`, extracts user info and storeId from tokens
- `checkout/` - Processes customer checkout, determines payment processor, creates transactions/subscriptions
- `merchant/` - Merchant-authenticated endpoints for viewing transactions, subscriptions, and configuring store settings
- `stripe/` - Mock Stripe service: creates payment intents, validates cards, processes charges, fires async webhooks
- `nmi/` - Mock NMI service: manages customer vaults, processes sales/auth/capture actions, fires async webhooks
- `eventbridge/` - Mock AWS EventBridge Scheduler: creates/deletes subscription schedules, fires webhooks at scheduled intervals (1 day = 1 second for testing)
- `webhooks/` - Receives async webhook events from Stripe, NMI, and EventBridge to update transaction/subscription state
- `common/database/` - Supabase database types generated from schema

**Payment Processor Flow:**
1. Checkout determines processor from store config
2. Stripe: create payment intent → verify token → charge (fires webhooks ~1500ms later)
3. NMI: create customer vault → perform vault action (sale/auth) → fires webhooks ~1500ms later
4. Webhooks update transaction state asynchronously

**Subscription Flow:**
1. Checkout creates subscription record
2. EventBridge schedule created with frequency in days
3. Mock scheduler fires webhook after (frequencyDays * 1000ms) delay
4. Webhook handler re-charges customer and records transaction

**Authentication:**
- Merchant endpoints require Supabase JWT via `@UseGuards(JwtAuthGuard)`
- JWT contains `user.user_metadata.store_id` for multi-tenant isolation
- Checkout endpoints are public (no auth guard)
- Test credentials: `merchant1@example.com / password`

**Database Schema:**
- `store` - Merchant stores with `checkout_processor` enum (stripe, NMI)
- `customers` - Customer records linked to stores
- `payment_methods` - Customer payment methods
- `integrations` - Store integrations (stripe, NMI, shopify) with credentials and active/inactive status
- `transactions` - Payment transactions
- `subscriptions` - Recurring subscription records

### Frontend Architecture

**Merchant Portal (merchant/):**
- Next.js 16 with App Router
- Shadcn UI components (Radix UI + Tailwind)
- Supabase client authentication
- Routes:
  - `/login` - Authentication
  - `/(dashboard)/transactions` - Transaction table
  - `/(dashboard)/subscriptions` - Subscription table
  - `/(dashboard)/settings` - Store settings and processor configuration

**Checkout (checkout/):**
- Next.js 16 with App Router
- Shadcn UI components
- Single-page checkout flow with optional subscription toggle
- `/success` - Post-checkout success page

**Shared Frontend Patterns:**
- `lib/` - Utility functions and API clients
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- Environment variables prefixed with `NEXT_PUBLIC_` for client-side access

## Key Implementation Notes

**Mock Payment Processors:**
- Both Stripe and NMI services use in-memory storage (Map)
- Test cards defined in `stripe.types.ts` and `nmi.types.ts` determine success/decline outcomes
- Webhooks fired asynchronously with ~1500ms delay to simulate real processor behavior
- Use test card `4242424242424242` for successful charges

**Mock EventBridge:**
- Schedules stored in-memory
- Time compression: 1 day = 1 second (30-day subscription fires after 30s)
- Deleted schedules won't fire even if timer is pending

**Database Migrations:**
- Schema defined in `subscription-service/supabase/migrations/`
- Initial schema: `20260330160552_initial_tables.sql`
- Extend tables as needed for new features (customers, payment_methods, transactions, subscriptions need additional fields)

**Testing:**
- Use Swagger docs at http://localhost:3000/docs for API testing
- Mock services include spec files with test coverage patterns
- Backend uses Jest with ts-jest

## Challenge Tasks

The codebase contains several `NotImplementedException` stubs to be implemented:
1. `/checkout` endpoint - Process customer checkout with processor selection, card validation, transaction recording, subscription scheduling
2. `/merchant/transactions` - Return merchant's transaction history with pagination support
3. `/merchant/subscriptions` - Return merchant's subscription data with pagination support
4. `/webhooks/*` - Handle async events from Stripe, NMI, and EventBridge to update transaction/subscription state
5. Support processor % split routing (extend store schema, update UI, modify checkout logic)

When implementing, extend database tables thoughtfully as transactions/subscriptions need fields like: amount, status, processor, customer details, timestamps, card info, etc.
