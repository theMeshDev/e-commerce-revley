# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Docker Desktop running
- Ports 3000, 3001, 3002 available

## 30-Second Setup

```bash
# Terminal 1 - Backend
cd subscription-service
npm install
cp .env.template .env
npx supabase start
# IMPORTANT: Copy SUPABASE_PK and SUPABASE_SK from output into .env
npm run start:dev

# Terminal 2 - Merchant Portal
cd merchant
npm install
cp .env.template .env
# IMPORTANT: Copy SUPABASE_PK from Terminal 1 into .env
npm run dev

# Terminal 3 - Checkout
cd checkout
npm install
npm run dev
```

## URLs

- **Checkout**: http://localhost:3002
- **Merchant Portal**: http://localhost:3001 (Login: merchant1@example.com / password)
- **API Swagger**: http://localhost:3000/docs

## Test Cards

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`

## Quick Test Flow

1. **Make a purchase**:
   - Go to http://localhost:3002
   - Fill form with test data
   - Use success card `4242424242424242`, expiry `12/27`, CVV `123`
   - Click Checkout

2. **View in merchant portal**:
   - Go to http://localhost:3001
   - Login with merchant1@example.com / password
   - Click "Transactions" to see your purchase
   - Status will show "Captured" after ~2 seconds (webhook delay)

3. **Test subscription**:
   - Go to http://localhost:3002
   - Check "Subscribe & Save" box
   - Complete checkout
   - View in Merchant Portal → Subscriptions
   - Wait 30 seconds to see recurring charge (30 days compressed to 30 seconds)

4. **Configure processor split**:
   - Merchant Portal → Settings
   - Toggle "Processor Split" ON
   - Set Stripe: 70%, NMI: 30%
   - Click "Save Split Configuration"
   - Make multiple purchases to see distribution

## What Was Implemented

✅ **Database Schema**: Extended with all necessary fields for transactions, subscriptions, payments
✅ **Checkout Flow**: Complete payment processing with Stripe/NMI support
✅ **Webhooks**: Async status updates from processors and subscription billing
✅ **Merchant Dashboard**: View transactions and subscriptions with pagination
✅ **Processor Split**: Configure % routing across multiple processors
✅ **Scale Design**: Comprehensive document on handling high-traffic scenarios

## Files Changed/Added

**Backend (subscription-service):**
- `supabase/migrations/20260428190957_extend_schema.sql` - Database schema
- `src/checkout/checkout.service.ts` - New checkout logic
- `src/webhooks/webhooks.service.ts` - New webhook handlers
- `src/merchant/merchant.service.ts` - Added endpoints for transactions/subscriptions
- Updated controllers and modules accordingly

**Frontend (merchant):**
- `lib/api.ts` - Added API functions
- `components/pages/transactions.tsx` - Connected to API
- `components/pages/subscriptions.tsx` - Connected to API
- `components/pages/settings.tsx` - Added processor split UI

**Frontend (checkout):**
- `app/page.tsx` - Connected to backend API

**Documentation:**
- `CLAUDE.md` - Repository guide for AI assistants
- `IMPLEMENTATION.md` - Detailed implementation notes
- `SCALE_DESIGN.md` - Scaling architecture proposal
- `QUICKSTART.md` - This file

## Troubleshooting

**Supabase won't start:**
```bash
npx supabase stop
npx supabase start
```

**Port already in use:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database schema not applied:**
```bash
cd subscription-service
npx supabase db reset
```

**Checkout fails:**
- Check backend logs in Terminal 1
- Verify .env files have correct Supabase credentials
- Ensure Docker is running

## Next Steps for Production

1. Add automated tests (Jest for backend, Playwright for frontend)
2. Implement proper error handling and retry logic
3. Add structured logging and monitoring
4. Set up CI/CD pipeline
5. Implement rate limiting and circuit breakers
6. See SCALE_DESIGN.md for detailed scaling recommendations

## Support

All code follows existing patterns in the codebase. If you encounter issues:
1. Check backend logs (Terminal 1)
2. Check browser console for frontend errors
3. Verify Supabase is running: `npx supabase status`
4. Review IMPLEMENTATION.md for detailed explanations
