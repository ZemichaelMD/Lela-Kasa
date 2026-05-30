# Offline Sync Master Plan: Unified Sync Engine

## Goal
To implement a robust, reusable, and efficient offline data retention and synchronization system for the Lela-Kasa Owner App. This system ensures that core shop operations (Sales, Customer Registration, Payments) can continue without interruption in poor network environments, with a single-turn "One Sync API" for all data synchronization.

## Scope
- **Offline Writes:** Create Sale, Record Payment, Register Customer, Record Container Return, Adjust Stock.
- **Offline Reads:** Access to all shop data (Beverages, Prices, Customers, Sales History, Ledger).
- **Online-Only:** Subscriptions, Billing, User Permissions, OTP/Auth flows, Deletes/Voids (v1).
- **Target Platform:** React Native (Expo) with SQLite storage.

## Core Pillars

### 1. The "One Sync API" (Backend)
A single POST endpoint `/api/v1/sync` that handles:
- **Pushing:** Batching all local outbox operations (sales, customers, payments) in one request.
- **Pulling:** Receiving incremental updates (delta sync) and tombstones (deletes) from the server.
- **Idempotency:** Strict use of Client Mutation IDs to prevent duplicate processing.

### 2. The Unified Sync Engine (Mobile)
A generic, repository-backed engine that abstracts SQLite interactions:
- **Local Source of Truth:** All UI components read from SQLite via React Query.
- **Outbox Pattern:** Every write is first committed to a local SQLite table + an Outbox table in a single transaction.
- **Background/Foreground Sync:** Automatic triggers to flush the outbox and pull updates.

### 3. Reusability & Component Grouping
- **Generic Repositories:** Use a base class for CRUD operations on SQLite tables.
- **Unified Sync Hook:** A single hook `useSync()` to monitor status and trigger manual sync.
- **Sync UI Components:** Shared "Pending" badges and "Offline" banners.

## Document Structure
- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md): Technical overview of the sync lifecycle.
- [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md): SQLite table definitions and local metadata.
- [03-BACKEND-SYNC-API.md](./03-BACKEND-SYNC-API.md): API contract and implementation guide for the One Sync API.
- [04-FRONTEND-SYNC-ENGINE.md](./04-FRONTEND-SYNC-ENGINE.md): Implementation details for the mobile sync logic and repositories.
- [CHECKLISTS.md](./CHECKLISTS.md): Step-by-step implementation tasks for AI agents.

## Strategic Workflow
1. **Foundation:** Setup SQLite and generic repository patterns.
2. **Read Path:** Implement "Bootstrap" to populate SQLite and switch UI to read from local DB.
3. **Write Path:** Implement the Outbox and local projection for Sales and Customers.
4. **Synchronization:** Build the One Sync API on the backend and the Sync Coordinator on mobile.
5. **Validation:** Rigorous testing of conflict resolution and idempotency.
