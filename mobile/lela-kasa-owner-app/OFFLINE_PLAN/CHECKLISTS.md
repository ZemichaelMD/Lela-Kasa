# Offline Sync Implementation Checklists

## Phase 1: Infrastructure & Database
- [ ] Install `expo-sqlite`, `@react-native-community/netinfo`.
- [ ] Create `src/offline/db/database.ts` (SQLite setup).
- [ ] Implement `src/offline/db/migrations.ts` with tables from `02-DATABASE-SCHEMA.md`.
- [ ] Create `OfflineProvider` to wrap the app and manage DB lifecycle.
- [ ] Create `BaseRepository` with generic CRUD and outbox insertion.

## Phase 2: Read Path (Bootstrap)
- [ ] Create `SyncCoordinator.bootstrap()` to fetch initial data from server.
- [ ] Implement `UserRepository`, `ShopRepository`, `BeverageRepository`, `CustomerRepository` (Read methods).
- [ ] Update `DashboardScreen` to read from SQLite.
- [ ] Update `CustomersScreen` and `BeveragesScreen` to read from SQLite.
- [ ] Update `NewSaleScreen` to load dropdowns (customers, beverages) from SQLite.

## Phase 3: Write Path (Local Projection)
- [ ] Implement `CustomerRepository.create()` with local-first logic.
- [ ] Implement `SaleRepository.create()` with multi-table transaction (Lines, Payments, Stock adjustments).
- [ ] Implement `PaymentRepository.create()` for standalone payments.
- [ ] Verify that UI updates immediately with "Pending" state after a write.
- [ ] Verify that projected stock and balances are updated locally in SQLite.

## Phase 4: One Sync API (Backend)
- [ ] Create `SyncModule` and `SyncController` in NestJS.
- [ ] Implement `ProcessedMutation` table for idempotency.
- [ ] Implement `SyncService.sync()` to process outbox items.
- [ ] Implement Delta detection logic (fetching records updated after cursor).
- [ ] Add unit tests for idempotency and partial batch failures.

## Phase 5: Synchronization (Mobile)
- [ ] Implement `SyncCoordinator.sync()` (The main loop).
- [ ] Connect `NetInfo` to trigger `sync()` on connectivity regain.
- [ ] Implement Outbox result processing (updating `sync_status` and `server_id`).
- [ ] Implement Change processing (applying server updates to local tables).
- [ ] Add "Sync Now" button and status indicators in the UI.

## Phase 6: Hardening & UI
- [ ] Add `SyncBadge` to list items (Sales, Customers).
- [ ] Add `EstimatedValue` labels to stock and balances.
- [ ] Implement "Logout Warning" if outbox is not empty.
- [ ] Implement Conflict UI (showing "Server Version" vs "Your Version").
- [ ] Performance audit: Ensure large SQLite reads don't lag the UI.

## Phase 7: Validation
- [ ] **Test:** Create Sale offline -> Sync -> Verify on Web/Admin.
- [ ] **Test:** Create Customer offline -> Create Sale for that Customer offline -> Sync -> Verify both created.
- [ ] **Test:** Sync while offline -> Ensure outbox remains PENDING.
- [ ] **Test:** Kill app with pending outbox -> Restart -> Sync -> Verify no data loss.
- [ ] **Test:** Trigger duplicate sync (double click) -> Ensure backend idempotency works.
