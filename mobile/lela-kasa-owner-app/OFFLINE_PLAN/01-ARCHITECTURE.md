# Offline Architecture: Unified Sync Lifecycle

## Overview
The Lela-Kasa Offline Architecture follows the **Offline-First** principle. The UI never talks directly to the Network for core operations; it always talks to the **Local Database (SQLite)**.

## The Data Flow

### 1. Reading Data (UI <- SQLite)
- UI components use **React Query** hooks.
- These hooks call **Offline Repositories** instead of SDK methods.
- Repositories fetch data from **SQLite**.
- Result: Instant UI, even offline.

### 2. Writing Data (UI -> SQLite + Outbox)
- User submits a form (e.g., New Sale).
- The Repository starts a **SQLite Transaction**:
    1.  Inserts/Updates the domain table (e.g., `sales`, `customers`).
    2.  Updates projections (e.g., reduces `beverage.stock`, increases `customer.credit`).
    3.  Inserts a record into the `outbox` table with the operation details.
- Transaction commits.
- UI updates immediately (reflecting "Pending" state).
- The **Sync Engine** is notified to attempt a push if online.

### 3. Synchronizing (Sync Engine <-> One Sync API)
- The Sync Engine gathers all `PENDING` records from the `outbox`.
- It constructs a single payload for the **One Sync API** (`POST /api/v1/sync`).
- **Push Phase:** The backend processes the batch, ensuring idempotency.
- **Pull Phase:** The backend returns all changes since the last `sync_cursor`.
- **Resolution Phase:**
    - Successful outbox items are marked `SYNCED`.
    - Pulled changes are applied to local SQLite tables (Upsert/Delete).
    - Local `sync_cursor` is updated.

## Key Components

### 1. SQLite Store (`src/offline/db`)
Using `expo-sqlite` for durable persistence. It manages the lifecycle of the database and migrations.

### 2. Generic Repository (`src/offline/repositories/base`)
An abstract class that handles:
- Standard CRUD for a table.
- Injecting local metadata (`last_synced_at`, `sync_status`).
- Finding by ID/Query.

### 3. Outbox Manager (`src/offline/sync/outbox`)
Manages the queue of pending writes. It ensures operations are processed in the correct order (e.g., Create Customer before Create Sale for that customer).

### 4. Sync Coordinator (`src/offline/sync/coordinator`)
The "brain" of the operation. It:
- Monitors network reachability (NetInfo).
- Orchestrates the call to the One Sync API.
- Handles retries with exponential backoff.
- Updates the global `SyncStatus`.

## Conflict Strategy: "Server Wins" with Local Visibility
Given the simple retail nature of the app:
- **Sales/Payments:** Append-only. No conflicts expected (idempotency handles replays).
- **Customers:** If a customer was edited online and offline, the Server version wins during the pull, but the user is notified if their change was overwritten.

## Security
- Tokens stay in `SecureStore`.
- Domain data in SQLite is accessible while the app is unlocked.
- Logout clears the SQLite database (after warning about pending writes).
