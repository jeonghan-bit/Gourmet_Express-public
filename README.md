# Gourmet Express

A full-stack restaurant ordering and operations application built with Next.js,
TypeScript, PostgreSQL/Drizzle, Firebase, NextAuth, Supabase storage, and Twilio.
The existing storefront and admin implementation are retained for portfolio review;
account-specific configuration is supplied through private environment variables.

## Purpose and role

The application connects customer ordering with restaurant operations: browsing a
menu, configuring dishes, submitting pickup/delivery orders, managing fulfilment,
printing receipts, and sending status notifications.

Development was AI-assisted. My work included identifying an API access-control
issue and adding checks before protected database records were returned. The project
also includes polling improvements that consolidate dashboard requests and avoid
unnecessary monitoring outside operating conditions. No unsupported performance
percentage or independent authorship of every line is claimed here.

## How the application works

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Customer UI | `my-app/app/OrderPage.tsx`, `checkout`, `profile`, `orders-history` | Menu, options, cart, scheduled/ASAP ordering, profile and history |
| Operations UI | `my-app/app/admin` | Dashboard, orders, customers, products, categories, options, hours and receipt workflows |
| Client data | `my-app/hooks`, React Query | Requests, shared caches, mutations and targeted refreshes |
| Authentication | `firebaseConfig.js`, `usePhoneVerification.ts`, `lib/auth.ts` | Firebase phone verification, server ID-token verification and NextAuth session creation |
| Access control | `lib/adminAuth.ts`, API handlers, `middleware.ts` | Current active-account/role checks, admin permissions and customer ownership scope |
| Validation | `lib/schemas.ts`, `cartPricing.server.ts`, `deliveryAddress.server.ts` | Allowed fields, server-calculated prices, option validation and signed address integrity |
| Database | `lib/db.ts`, `lib/orders.ts`, `lib/dateFilters.ts` | Drizzle/PostgreSQL schema, parameterized data access, filtering, pagination and Toronto day boundaries |
| Notifications | `app/api/send-sms/route.ts` | Admin-only Twilio messaging with consent checks, body limits and rate limits |
| Media | `app/api/products/image`, `supabaseClient.ts` | Image processing, thumbnails and configured Supabase storage |
| Hosting | Next.js on Vercel, `app/providers.tsx` | Hosted UI/server routes and Vercel Analytics/Speed Insights |

### Order lifecycle

1. The storefront loads active products/categories through the public menu query.
   The customer chooses options and builds a cart.
2. Firebase phone authentication returns an ID token. The server verifies the token
   and phone ownership, looks up the account, and creates a NextAuth session.
3. Checkout submits the cart and fulfilment details to `/api/submit-order`.
   The server checks identity/ownership, validates inputs, retrieves current prices,
   calculates the total, and persists the order. An idempotency key prevents retry duplicates.
4. Customer history queries are scoped to the authenticated account. Operational
   access requires admin authorization on the server, independently of the UI.
5. The admin monitors pending orders, changes fulfilment status, reviews/prints a
   receipt, and invokes the notification workflow when appropriate.
6. React Query invalidates affected views after changes so the customer/admin UI
   refreshes relevant data.

### APIs

| API | Main responsibility and access |
| --- | --- |
| `GET /api/menu` | Public active menu |
| `GET /api/storefront-status` | Public weekly hours, closure and maintenance state |
| `/api/auth/*` | NextAuth sign-in, session and sign-out |
| `/api/user/profile`, `/api/user/update-personal` | Authenticated account's profile and allowed personal edits |
| `POST /api/submit-order` | Authenticated, validated and repriced order submission |
| `/api/orders`, `/api/orders/:id` | Owner-scoped customer reads; authorized admin order operations |
| `/api/orders/:id/reorder` | Authorized reordering against current availability/prices |
| `/api/admin/dashboard-summary`, `/api/metrics` | Admin order lists and operational metrics |
| `/api/customers` and nested routes | Admin customer management |
| `/api/products`, `/api/add-product`, `/api/edit-product` and nested routes | Public active menu reads and admin product/option/image writes |
| `/api/collections`, `/api/options` and nested routes | Category/option data with admin mutation guards |
| `/api/store-hours`, `/api/temporary-closure`, `/api/maintenance-mode` | Public status and authorized operating-state changes |
| `POST /api/send-sms` | Admin-only, consent-aware Twilio notification |
| `/api/address/autocomplete`, `/api/address/details` | Authenticated Google Places search and signed delivery-address details |

### Technical problems illustrated

**Access control:** `requireAuthenticatedUser` verifies the current account is active;
`requireAdmin` checks both current database role and session role. Order queries use
ownership predicates for customers. Hiding admin navigation alone is insufficient:
API permissions must be checked before returning protected records.

**Polling:** the pending-order monitor waits for operating-state information and
polls while the store can accept orders, with a closing grace period. It tracks
processed order IDs to avoid repeated alerts during a session. The dashboard uses
one summary response, and mutations invalidate relevant caches rather than keeping
separate redundant widget requests running.

**Data integrity:** server-side pricing/option validation prevents client totals
from being trusted. Database-backed idempotency handles order retries. Delivery
address integrity checks protect verified address fields. PostgreSQL transactions
are used where related updates must stay consistent.

## Run locally

Requires Node.js 20+ and separate test accounts/services. This is the existing app,
not a self-seeding mock: it expects the tables defined in `my-app/lib/db.ts` and
menu/account records in your configured PostgreSQL database. Use synthetic records
for a public demonstration, not a copy of production customer data.

```sh
cd my-app
npm ci
cp .env.example .env.local
# Fill in your private test configuration.
npm run dev
```

Open `http://localhost:3000`. Generate a fresh `NEXTAUTH_SECRET` for your test setup:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The blank `.env.example` lists the required settings. Real `.env*` files,
service-account credentials, IDE database metadata and deployment account metadata
are excluded from source control. No real values belong in the example.

### Firebase

Set all `NEXT_PUBLIC_FIREBASE_*` fields from your own Firebase web app and the
server-only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
from its Admin SDK configuration. Enable Phone authentication and authorize your
local/demo domains. For demonstration, configure fictional phone numbers and test
verification codes in Firebase Authentication.

The browser obtains an ID token; `lib/auth.ts` verifies it with Firebase Admin and
checks that the verified phone matches the submitted account phone. The web config
is public by design; the Admin private key must remain server-only.
See [Firebase phone authentication](https://firebase.google.com/docs/auth/web/phone-auth).

### PostgreSQL, Supabase and Google Places

`DATABASE_URL` connects Drizzle to PostgreSQL; `DATABASE_POOL_MAX` bounds each
instance's connection pool. Supabase is used for product image storage through
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not as a substitute
for the app's PostgreSQL data-access layer. Configure the storage bucket policies
for your own test project. `GOOGLE_PLACES_API` is server-only and supports the
address-search routes. No original database/storage account is included in source.

### Twilio

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` privately.
The admin notification API looks up the recipient, checks consent and validates
message limits before calling Twilio. Use test credentials and appropriate magic
numbers for a demonstration; real credentials may deliver real SMS.
See [Twilio test credentials](https://www.twilio.com/docs/iam/test-credentials).

### Vercel

Import the repository into your own Vercel project and set **Root Directory** to
`my-app`. Add the environment variables for the relevant environment, set
`NEXTAUTH_URL` to your demo URL, and use a separate test database/service accounts.
Vercel detects Next.js and builds the existing frontend and route handlers.
Keep the Firebase web variables public and the database/session/Admin SDK/Twilio
values server-only. See [Vercel environment configuration](https://vercel.com/docs/environment-variables).

## Verification and sharing

From `my-app`, run `npm run build` to check compilation and types. Browser workflows,
Firebase authentication, Twilio delivery, database behaviour, and printing require
separate runtime checks with your configured test services. Closing print preview
does not establish that a physical printer received the receipt.

Configuration sanitization is not a complete application security audit. Commit-time
removal also does not erase older secrets/account identifiers from Git history.
Keep the original repository private until its history has been checked/sanitized,
or publish only the sanitized current files into a fresh repository without that
history. The application implementation itself can remain intact.
