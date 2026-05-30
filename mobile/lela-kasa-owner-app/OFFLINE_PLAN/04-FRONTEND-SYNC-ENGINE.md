# Unified Sync Engine: Mobile Implementation

## Core Components Grouping

To avoid repeating code, we will implement a "Unified Engine" pattern.

### 1. The `OfflineRepository<T>` Base Class
Location: `src/offline/repositories/BaseRepository.ts`
- **Generic CRUD:** `create`, `update`, `delete`, `findById`, `list`.
- **Auto-Metadata:** Automatically sets `local_id`, `sync_status = 'pending'`, and `local_updated_at`.
- **Outbox Integration:** Automatically inserts into the `outbox` table during writes.

### 2. The `useOfflineQuery` Hook
Location: `src/offline/hooks/useOfflineQuery.ts`
- A wrapper around `useQuery` from React Query.
- It fetches from the `OfflineRepository` instead of the API.
- It automatically invalidates when a sync completes.

### 3. The `SyncCoordinator`
Location: `src/offline/sync/SyncCoordinator.ts`
- **One Loop:** A single `sync()` function that:
    1. Collects `PENDING` outbox items.
    2. Calls `POST /api/v1/sync`.
    3. Iterates through `results` to update local `server_id` and `sync_status`.
    4. Iterates through `changes` to update local domain tables.
    5. Updates the `last_sync_cursor`.

### 4. The `OfflineProvider`
Location: `src/providers/OfflineProvider.tsx`
- Initializes SQLite.
- Runs migrations.
- Provides `SyncStatus` (Online/Offline/Syncing/Pending Count) via Context.

## Unified Model Implementation Steps

For EVERY model (Sale, Customer, Beverage, etc.):

1.  **Define SQLite Table:** In `migrations.ts`.
2.  **Create Repository:** Extend `BaseRepository`.
    ```typescript
    class CustomerRepository extends BaseRepository<Customer> {
      constructor() { super('customers'); }
      // Add custom search logic here
    }
    ```
3.  **Update Screen:** Replace SDK call with Repository call.
    ```typescript
    // BEFORE
    const { data } = useQuery(['customers'], () => sdk.customers.list());

    // AFTER
    const { data } = useOfflineQuery(['customers'], () => customerRepo.list());
    ```

## Handling Complex Writes (e.g., Sales)
Sales involve multiple tables (Sale, SaleLines, Payments).
- The `SaleRepository.create()` method should handle the multi-table SQLite transaction.
- The `outbox` payload for a Sale should be a "Flat Bundle" containing the sale and all its lines.

## Offline Visibility Utilities
- **`SyncBadge`:** A component that shows a "Cloud" icon with status (Pending/Synced) next to a record.
- **`EstimatedValue`:** A component that shows a tilde (`~`) next to stocks or balances that have pending local changes.

## Reusability Summary
- **Storage:** 1 `SQLite` instance.
- **Sync Logic:** 1 `SyncCoordinator`.
- **Data Access:** N `Repositories` (all sharing `BaseRepository`).
- **UI Hooks:** 1 `useSync` + 1 `useOfflineQuery`.
