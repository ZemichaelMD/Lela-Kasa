# One Sync API: Backend Implementation

## Endpoint: `POST /api/v1/sync`

This single endpoint is the heartbeat of the offline system. It handles bidirectional data exchange in a single request-response cycle.

## 1. Request Body Structure
```json
{
  "clientTime": "2023-10-27T10:00:00Z",
  "lastSyncCursor": "string_or_timestamp",
  "shopId": "uuid",
  "outbox": [
    {
      "id": "local_outbox_id",
      "entityType": "SALE | CUSTOMER | PAYMENT | STOCK_MOVEMENT",
      "operation": "CREATE | UPDATE",
      "clientMutationId": "unique_id_for_idempotency",
      "payload": { ... }
    }
  ]
}
```

## 2. Server-Side Processing Logic

### Step A: Idempotency Check
For each item in `outbox`, check if `clientMutationId` has already been processed. If yes, skip processing and return the existing record's `server_id`.

### Step B: Transactional Processing
Process outbox items in the order they were sent:
1.  **Customers:** Create/Update and return `server_id`.
2.  **Sales:** Create sale + lines + movements. Link to `server_id` of customer if newly created.
3.  **Payments:** Record payment. Link to `server_id` of sale/customer.
4.  **Stock Movements:** Apply deltas.

### Step C: Delta Generation
Identify all changes in the database for the given `shopId` that occurred *after* `lastSyncCursor`.
- Include `Upserts`: New or modified records.
- Include `Tombstones`: IDs of deleted records.

## 3. Response Body Structure
```json
{
  "serverTime": "2023-10-27T10:00:05Z",
  "newSyncCursor": "new_string_or_timestamp",
  "results": [
    {
      "outboxId": "local_outbox_id",
      "status": "SUCCESS | ERROR | CONFLICT",
      "serverId": "uuid",
      "error": "optional_message"
    }
  ],
  "changes": {
    "customers": [...],
    "beverages": [...],
    "sales": [...],
    "payments": [...],
    "priceTiers": [...],
    "beveragePrices": [...],
    "paymentAccounts": [...],
    "tombstones": {
      "customers": ["uuid1", "uuid2"],
      "sales": ["uuid3"]
    }
  }
}
```

## 4. Key Implementation Details (NestJS)

- **SyncService:** Create a central service that orchestrates the `prisma.$transaction`.
- **Idempotency Table:** A dedicated table `ProcessedMutation` to store `clientMutationId` and the resulting `serverId`.
- **Cursor Strategy:** Use the `updatedAt` timestamp of the records as the cursor.
- **Payload Validation:** Use `class-validator` with a polymorphic DTO for the outbox items.

## 5. Security
- Ensure the user has `SHOP_OWNER` or `SHOP_EMPLOYEE` permissions for the provided `shopId`.
- Validate that all `customerId` and `beverageId` in the payloads belong to the same `shopId`.
