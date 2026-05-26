# LeLa Kasa

Beer and beverage sales management platform for grocery shop owners and their employees. Manage sales, customers, inventory, payment accounts, and generate reports — all in one place.

## Apps

| App | Description | Stack |
|-----|-------------|-------|
| `client/` | Owner & staff web portal (PWA) | React 19, Vite, Tailwind CSS |
| `admin/` | Super-admin dashboard | React 19, Vite, Tailwind CSS |
| `backend/` | REST API + WebSockets | NestJS 11, Prisma, PostgreSQL, Redis |
| `mobile/lela-kasa-owner-app/` | Mobile app | Expo (React Native) |

## Features

- **Sales management** — Record sales with multiple beverages, box/bottle quantities, return tracking, and credit
- **Payment accounts** — Log payments to multiple accounts (cash, CBE, Abyssinia, etc.)
- **Customer management** — Full CRM with interaction history
- **Beverage & price tiers** — Multiple price tiers with historical price tracking
- **Employee management** — Register employees, assign roles and permissions
- **Reports & dashboard** — Sales performance, inventory levels, and customer analytics
- **Subscription gating** — Shop-level subscription management
- **PWA** — Installable on mobile and desktop from the browser

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis

## Getting Started

**1. Install dependencies**

```bash
# from each app directory
cd backend && pnpm install
cd client  && pnpm install
cd admin   && pnpm install
cd mobile/lela-kasa-owner-app && pnpm install
```

**2. Configure environment**

Copy `.env.example` to `.env` in `backend/` and fill in the required values:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

**3. Run database migrations**

```bash
cd backend
pnpm db:migrate
pnpm db:seed   # optional seed data
```

**4. Start development servers**

```bash
# backend — http://localhost:3000
cd backend && pnpm dev

# client portal — http://localhost:5174
cd client && pnpm dev

# admin dashboard — http://localhost:5175
cd admin && pnpm dev
```

## Deployment

### Backend

Deploy to any Node.js host. Run migrations before starting:

```bash
pnpm db:deploy
pnpm start:prod
```

### Client & Admin (Cloudflare Pages)

Both apps deploy automatically via GitHub Actions on push to `main`. Each app also gets a preview URL on every pull request.

To deploy manually:

```bash
cd client && pnpm deploy:prod
cd admin  && pnpm deploy:prod
```

**Required GitHub secrets:**

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Cloudflare Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Mobile

```bash
cd mobile/lela-kasa-owner-app
eas build
eas submit
```

## Project Structure

```
lela-kasa/
├── admin/                      # Super-admin web app
│   ├── src/
│   ├── wrangler.toml           # Cloudflare Pages config (lala-kasa-admin)
│   └── package.json
├── backend/                    # NestJS API
│   ├── prisma/                 # Schema & migrations
│   └── src/
├── client/                     # Owner/staff web app (PWA)
│   ├── src/
│   ├── wrangler.toml           # Cloudflare Pages config (lela-kasa-owner)
│   └── package.json
├── mobile/
│   └── lela-kasa-owner-app/   # Expo mobile app
└── .github/
    └── workflows/
        ├── deploy-client.yml   # Auto-deploy client on push to main
        └── deploy-admin.yml    # Auto-deploy admin on push to main
```
