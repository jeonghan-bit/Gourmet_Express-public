# Gourmet Express
This repository is a sanitized public version of the original Gourmet Express application. The original repository remains private to protect production configuration and sensitive information.

A full-stack restaurant ordering and management application built with Next.js,
TypeScript, PostgreSQL, Firebase, Supabase, and Twilio.

https://gourmet-express-kipling.com
<img width="1578" height="842" alt="Screenshot 2026-09-30 at 3 08 50 PM" src="https://github.com/user-attachments/assets/bc20bf17-c349-46ee-9c7f-321cf11e3091" />



## 1. Purpose

Connect customer ordering with restaurant operations in one application. Customers
can browse the menu and place orders; staff can manage orders, menu items,
customers, business hours, and notifications.

## 2. Repository Structure

```text
Gourmet_Express-public/
├── Data/                  # Menu extraction script and source menu data
├── firebase.json          # Firebase emulator configuration
└── my-app/                # Next.js application
    ├── app/               # Customer pages, layouts, and styles
    │   ├── admin/         # Operations dashboard and management screens
    │   ├── api/           # Backend routes: orders, menu, users, SMS, and settings
    │   ├── checkout/      # Order submission and fulfilment choices
    │   ├── orders-history/ # Customer order history and reordering
    │   └── profile/       # Customer profile management
    ├── components/        # Shared UI, product dialogs, and receipt printing
    ├── hooks/             # Cart state, authentication, queries, and mutations
    ├── lib/               # Database schema, access checks, validation, and utilities
    ├── public/            # Images, menu assets, and notification sounds
    ├── types/             # Shared TypeScript and session types
    ├── .env.example       # Blank configuration template
    └── package.json       # Dependencies and application scripts
```

## 3. Key Features

- **Customer ordering:** menu categories, product options, cart, pickup/delivery,
  ASAP/scheduled orders, order history, and reordering.
- **Admin operations:** order dashboard, status updates, customer management,
  menu/category/option management, business hours, maintenance, and temporary closure.
- **Authentication and authorization:** Firebase phone verification, NextAuth
  sessions, server-side admin checks, and owner-scoped customer order access.
- **Data integrity:** PostgreSQL persistence through Drizzle, input validation,
  server-calculated prices, and idempotent order submissions.
- **Integrations:** Twilio notifications, Supabase image storage, Google Places
  address lookup, receipt preview/printing, and Vercel hosting/analytics support.
- **Polling improvements:** consolidated dashboard data, operating-state-aware
  monitoring, duplicate-alert suppression, and targeted React Query refreshes.

## 4. Requirements

- Node.js 20+ and npm.
- A PostgreSQL database with the tables defined in `my-app/lib/db.ts` and populated
  menu/account records. The app does not automatically create or seed its database.
- A Firebase project with Phone authentication and Admin SDK configuration.
- Supabase storage configuration for product images.
- Twilio credentials for SMS and a Google Places API key for address lookup.
- A Vercel account if deploying to Vercel; set the project root to `my-app`.

Install dependencies and create your private configuration:

```sh
cd my-app
npm ci
cp .env.example .env.local
```

Fill in `.env.local` with your own test database and service configuration, including
`NEXTAUTH_SECRET` and `NEXTAUTH_URL`. Use synthetic customer data for demonstrations.
Keep real environment files and service-account credentials outside source control.

## 5. Scripts

Run these commands from `my-app/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Create a production build and check compilation/types |
| `npm run start` | Serve the production build after running `npm run build` |
| `npm run lint` | Run the configured Next.js lint command |

For menu extraction, `Data/web_crawler.py` reads `html_context.txt` and writes
`menu_data.txt`. Run it from `Data/`; it requires Python and `beautifulsoup4`.
