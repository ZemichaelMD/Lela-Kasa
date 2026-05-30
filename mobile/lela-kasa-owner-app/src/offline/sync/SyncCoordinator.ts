import { getSdk } from "../../lib/sdk";
import { syncStateRepo } from "../repositories/SyncStateRepository";
import { getDatabase } from "../db/database";
import { customerRepo } from "../repositories/CustomerRepository";
import { beverageRepo } from "../repositories/BeverageRepository";
import { saleRepo } from "../repositories/SaleRepository";
import { priceTierRepo } from "../repositories/PriceTierRepository";
import { paymentAccountRepo } from "../repositories/PaymentAccountRepository";
import { SyncResponse } from "../../lib/sdk/resources/sync";

export class SyncCoordinator {
  private isSyncing = false;

  async sync(shopId: string): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const db = await getDatabase();
      const state = await syncStateRepo.get();
      const lastSyncCursor = state?.last_sync_cursor || undefined;

      // 1. Collect PENDING outbox items
      const outboxItems = await db.getAllAsync<any>(
        'SELECT * FROM outbox WHERE status = "pending" ORDER BY created_at ASC',
      );

      const formattedOutbox = outboxItems.map((item) => {
        let payload = {};
        try {
          payload = item.payload_json ? JSON.parse(item.payload_json) : {};
        } catch (e) {
          console.error("Failed to parse payload for outbox item", item.id, e);
        }
        return {
          id: item.id,
          entityType: item.entity_type,
          operation: item.operation,
          clientMutationId: item.client_mutation_id,
          payload,
        };
      });

      // 2. Call One Sync API
      const sdk = getSdk();
      const response = await sdk.sync.sync({
        shopId,
        lastSyncCursor,
        outbox: formattedOutbox,
      });

      // 3. Process Results
      await db.withTransactionAsync(async () => {
        for (const res of response.results) {
          if (res.status === "SUCCESS") {
            await db.runAsync(
              'UPDATE outbox SET status = "synced" WHERE id = ?',
              [res.outboxId],
            );
          } else {
            await db.runAsync(
              'UPDATE outbox SET status = "failed", error_message = ? WHERE id = ?',
              [res.error || "Unknown error", res.outboxId],
            );
          }
        }

        // 4. Process Changes (Pull)
        await this.applyChanges(response.changes);

        // 5. Update Sync State
        await syncStateRepo.set({
          shop_id: shopId,
          last_sync_cursor: response.newSyncCursor,
          last_sync_at: new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  private async applyChanges(changes: SyncResponse["changes"]) {
    const db = await getDatabase();

    // Customers
    if (changes.customers) {
      for (const c of changes.customers) {
        await customerRepo.upsert({
          local_id: c.id,
          server_id: c.id,
          shop_id: c.shopId,
          name: c.name,
          phone: c.phone,
          credit_balance_cents: c.creditBalanceCents || 0,
          outstanding_boxes: c.outstandingBoxes || 0,
          outstanding_bottles: c.outstandingBottles || 0,
          price_tier_id: c.priceTierId,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          server_version: c.version || 0,
        });
      }
    }

    // Beverages
    if (changes.beverages) {
      for (const b of changes.beverages) {
        await beverageRepo.upsert({
          local_id: b.id,
          server_id: b.id,
          shop_id: b.shopId,
          name: b.name,
          brand: b.brand,
          bottles_per_box: b.bottlesPerBox || 24,
          stock_bottles: b.stockBottles || 0,
          isActive: b.isActive ? 1 : 0,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          server_version: b.version || 0,
        });
      }
    }

    // Price Tiers
    if (changes.priceTiers) {
      for (const t of changes.priceTiers) {
        await priceTierRepo.upsert({
          local_id: t.id,
          server_id: t.id,
          shop_id: t.shopId,
          name: t.name,
          isDefault: t.isDefault ? 1 : 0,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          server_version: t.version || 0,
        });
      }
    }

    // Beverage Prices
    if (changes.beveragePrices) {
      for (const p of changes.beveragePrices) {
        await db.runAsync(
          `INSERT OR REPLACE INTO beverage_prices (local_id, server_id, beverage_id, price_tier_id, price_per_box_cents, price_per_bottle_cents, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.id,
            p.beverageId,
            p.priceTierId,
            p.pricePerBoxCents,
            p.pricePerBottleCents,
            "synced",
          ],
        );
      }
    }

    // Payment Accounts
    if (changes.paymentAccounts) {
      for (const a of changes.paymentAccounts) {
        await paymentAccountRepo.upsert({
          local_id: a.id,
          server_id: a.id,
          shop_id: a.shopId,
          name: a.name,
          kind: a.kind,
          account_number: a.accountNumber,
          isActive: a.isActive ? 1 : 0,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          server_version: a.version || 0,
        });
      }
    }

    // Sales
    if (changes.sales) {
      for (const s of changes.sales) {
        await saleRepo.upsert({
          local_id: s.id,
          server_id: s.id,
          shop_id: s.shopId,
          customer_id: s.customerId,
          sale_date: s.saleDate,
          subtotal_cents: s.subtotalCents,
          paid_cents: s.paidCents,
          status: s.status,
          price_tier_id: s.priceTierId,
          notes: s.notes,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          server_version: s.version || 0,
        });

        // Upsert lines if included
        if (s.lines) {
          for (const l of s.lines) {
            await db.runAsync(
              `INSERT OR REPLACE INTO sale_lines (local_id, server_id, sale_id, beverage_id, boxes, bottles, price_per_box_cents, price_per_bottle_cents, line_total_cents, sync_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                l.id,
                l.id,
                s.id,
                l.beverageId,
                l.boxes,
                l.bottles,
                l.pricePerBoxCents,
                l.pricePerBottleCents,
                l.lineTotalCents,
                "synced",
              ],
            );
          }
        }
      }
    }

    // Handle Tombstones (Deletes)
    if (changes.tombstones) {
      for (const [entityType, ids] of Object.entries(changes.tombstones)) {
        if (Array.isArray(ids) && ids.length > 0) {
          const placeholders = ids.map(() => "?").join(", ");
          await db.runAsync(
            `DELETE FROM ${entityType} WHERE server_id IN (${placeholders})`,
            ids,
          );
        }
      }
    }
  }
}

export const syncCoordinator = new SyncCoordinator();
