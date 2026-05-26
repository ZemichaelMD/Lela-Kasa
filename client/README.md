# LeLa Kasa

A modern beverage sales management application for Ethiopian shop owners and their employees. Track customers, beverage sales (by the box and bottle), credit/debt, container returns, and payments across multiple accounts · all in one place.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript ~5.7 |
| UI Framework | React 19.2 |
| Build Tool | Vite ^6.0 |
| Routing | React Router DOM ^7.1 |
| Styling | Tailwind CSS v4 |
| Validation | Zod ^3.23 |
| Icons | Lucide React ^0.469 |
| Dates | date-fns ^4.1, react-day-picker 9.13 |
| Toasts | sonner ^2.0 |
| IDs | @paralleldrive/cuid2 ^2.2 |
| UI Primitives | @radix-ui/react-popover ^1.1 |
| Linting | ESLint v9 + typescript-eslint v8 |

## Features

- **Interactive Sales Table** · core feature. Create multi-line sales with customer selection, beverages (boxes/bottles), price tiers, payment method, payment account, and container return tracking. Supports draft (OPEN) and CONFIRMED statuses, voiding with reason, editing, and duplication.
- **Dashboard & KPIs** · time-period-selectable KPIs: total sales, outstanding credit, containers out, low stock alerts. Top customers, top beverages, recent voids.
- **CRUD Master Data Management**
  - **Customers** · name, phone, credit balance, container tracking, price tier lock, full ledger.
  - **Beverages** · name, brand, bottles-per-box, stock tracking, active/inactive.
  - **Price Tiers** · multi-tier pricing per beverage with price-per-box and price-per-bottle, history preserved.
  - **Payment Accounts** · named accounts (e.g., "Cash - Dagim", "CBE Bereket").
  - **Employees** · invite, manage, assign granular permissions (e.g., `sales:view`, `sales:create`, `sales:void`).
- **RBAC** · Owner and Employee roles. Owners have full access; employees have permission slugs gating UI and routes.
- **Authentication** · email/password login, JWT access + refresh token flow, auto-refresh, forgot/reset password, shop owner registration.
- **Customer Portal** · separate customer login for self-service order placement.
- **Subscription & Billing** · subscription management with Chapa (Ethiopian payment processor) integration and a payment wall.
- **Internationalization** · English and Amharic locales with 17 translation modules covering all pages.
- **Ethiopian Calendar** · Ethiopian date input component with conversion utilities and Amharic month names.
- **Reporting & Export** · report generation page and CSV export for sales data.
- **AI Chatbot** · floating chat assistant in the app shell.
- **Dark Mode** · "Royal Indigo & Ink" theme with light/dark variants.
- **Responsive Design** · mobile-first, works on phones and tablets.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 8

### Installation

```bash
cd lela-kasa/client
pnpm install
```

### Environment Variables

Copy the example environment file and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:3001` | Backend API base URL |
| `VITE_WS_URL` | Yes | `http://localhost:3001` | WebSocket URL |
| `VITE_ADMIN_ACCESS_TOKEN` | No | · | Dev-time bootstrap token for testing without login |

### Development

```bash
pnpm dev
```

Starts the Vite dev server on **port 5174**.

### Build

```bash
pnpm build
```

Runs TypeScript type checking then Vite production build.

### Preview Production Build

```bash
pnpm preview
```

Serves the built output on **port 5174**.

### Lint

```bash
pnpm lint
```

### Type Check

```bash
pnpm typecheck
```

### Clean

```bash
pnpm clean
```

Removes `dist/` and `node_modules/`.

## Project Structure

```
client/
├── index.html                  # SPA HTML entry point
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint flat config
├── .env.example                # Environment variable template
├── pnpm-lock.yaml              # Lock file
└── src/
    ├── main.tsx                # App entry point
    ├── index.css               # Global styles (Tailwind + theme)
    ├── router.tsx              # Route definitions
    ├── components/             # Reusable UI components (app-shell, sidebar, topbar, data-table, etc.)
    ├── pages/                  # Route page components (29 pages)
    ├── sdk/                    # API client SDK (HTTP client, auth, resources)
    │   └── resources/          # API resource modules (auth, sales, customers, etc.)
    ├── contract/               # Shared type contracts (Zod-validated DTOs, enums, paths)
    ├── ui/                     # Design system
    │   ├── components/         # Primitives (button, card, badge, etc.)
    │   ├── lib/                # Utilities (cn helper)
    │   └── styles/             # Theme tokens (theme.css)
    ├── utils/                  # Shared utilities (dates, money, IDs, results, etc.)
    └── lib/                    # Core application logic (auth context, i18n, SDK, etc.)
        └── i18n/               # Translation files
            ├── en/             # English translations (17 modules)
            └── am/             # Amharic translations (17 modules)
```

## Path Aliases

| Alias | Path |
|---|---|
| `@/` | `src/` |
| `@kasa/contract/` | `src/contract/` |
| `@kasa/sdk/` | `src/sdk/` |
| `@kasa/utils/` | `src/utils/` |
| `@kasa/ui/` | `src/ui/` |

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server on port 5174 |
| `pnpm build` | Type-check then build for production |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | Run ESLint across the project |
| `pnpm typecheck` | TypeScript type checking only |
| `pnpm clean` | Remove `dist/` and `node_modules/` |

## Design Theme

"Royal Indigo & Ink" · indigo primary with violet accent on a soft pearl canvas (light mode) and deep midnight-ink canvas (dark mode). All CSS custom properties are defined in `src/ui/styles/theme.css` and exposed as Tailwind v4 theme tokens.

## License

Private. All rights reserved.
