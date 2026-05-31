import { getSdk } from "../../lib/sdk";
import { syncStateRepo } from "../repositories/SyncStateRepository";
import { getDatabase } from "../db/database";
import { resetStaleSyncingOperations } from "../outbox";
import { customerRepo } from "../repositories/CustomerRepository";
import { beverageRepo } from "../repositories/BeverageRepository";
import { saleRepo } from "../repositories/SaleRepository";
import { priceTierRepo } from "../repositories/PriceTierRepository";
import { paymentAccountRepo } from "../repositories/PaymentAccountRepository";
import { SyncResponse, SyncOutboxItem } from "../../lib/sdk/resources/sync";

type SyncListener = (summary: any) => void;
const listeners = new Set<SyncListener>();

export class SyncCoordinator {
  private _isSyncing = false;
  private _lastSyncTime = 0;

  subscribe(listener: SyncListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  private notify() {
    // This will be used to notify the provider to refresh its summary
    listeners.forEach((l) => l({}));
  }

  async sync(shopId: string): Promise<void> {
    if (this._isSyncing) return;

    // Debounce: ignore rapid repeated calls within 2 seconds
    const now = Date.now();
    if (now - this._lastSyncTime < 2000) return;

    this._isSyncing = true;

    let itemIds: string[] = [];
    let db: any;

    try {
      db = await getDatabase();

      // Reset any operations stuck in "syncing" from a crashed previous sync
      await resetStaleSyncingOperations();

      const state = await syncStateRepo.get();
      const lastSyncCursor = state?.last_sync_cursor || undefined;

      // 1. Collect PENDING and previously FAILED outbox items
      const outboxItems: Array<{
        id: string;
        entity_type: string | null;
        entity_id: string | null;
        operation: string;
        client_mutation_id: string;
        body_json?: string | null;
      }> = await db.getAllAsync(
        'SELECT * FROM outbox WHERE status IN ("pending", "failed") ORDER BY created_at ASC',
      );

      const outboxById = new Map(outboxItems.map((item) => [item.id, item]));
      itemIds = outboxItems.map((item) => item.id);

      // Mark selected items as "syncing" before the API call (crash detection)
      if (itemIds.length > 0) {
        const placeholders = itemIds.map(() => "?").join(", ");
        await db.runAsync(
          `UPDATE outbox SET status = "syncing", updated_at = ? WHERE id IN (${placeholders})`,
          [new Date().toISOString(), ...itemIds],
        );
      }

      const formattedOutbox: SyncOutboxItem[] = outboxItems.map((item) => {
        let payload = {};
        try {
          payload = item.body_json ? JSON.parse(item.body_json) : {};
        } catch (e) {
          console.error("Failed to parse payload for outbox item", item.id, e);
        }
        return {
          id: item.id,
          entityType: item.entity_type ?? "unknown",
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

      // 3. Process Results & Changes in a single transaction
      await db.withTransactionAsync(async () => {
        const syncedAt = new Date().toISOString();
        // Process outbox results
        for (const res of response.results) {
          if (res.status === "SUCCESS") {
            await db.runAsync(
              'UPDATE outbox SET status = "synced", updated_at = ? WHERE id = ?',
              [syncedAt, res.outboxId],
            );
            const outboxItem = outboxById.get(res.outboxId);
            if (
              res.serverId &&
              outboxItem?.entity_id &&
              (outboxItem.entity_type === "sales" ||
                outboxItem.entity_type === "sale") &&
              outboxItem.operation === "create_sale"
            ) {
              await this.reconcileCreatedSale(
                db,
                outboxItem.entity_id,
                res.serverId,
                syncedAt,
              );
            }
          } else {
            await db.runAsync(
              'UPDATE outbox SET status = "failed", last_error_message = ?, updated_at = ? WHERE id = ?',
              [
                res.error || "Unknown error",
                syncedAt,
                res.outboxId,
              ],
            );
          }
        }

        // Process Pull Changes
        await this.applyChanges(response.changes);

        // Update Sync State
        await syncStateRepo.set({
          shop_id: shopId,
          last_sync_cursor: response.newSyncCursor,
          last_sync_at: syncedAt,
        });
      });

      this._lastSyncTime = Date.now();
      this.notify();
    } catch (error) {
      // Reset items stuck in "syncing" back to "pending" on failure
      if (itemIds && itemIds.length > 0) {
        const placeholders = itemIds.map(() => "?").join(", ");
        await db.runAsync(
          `UPDATE outbox SET status = "pending", updated_at = ? WHERE id IN (${placeholders})`,
          [new Date().toISOString(), ...itemIds],
        ).catch(() => {});
      }
      console.error("Sync failed:", error);
      throw error;
    } finally {
      this._isSyncing = false;
    }
  }

  private async reconcileCreatedSale(
    db: any,
    localSaleId: string,
    serverSaleId: string,
    syncedAt: string,
  ) {
    if (!localSaleId || !serverSaleId || localSaleId === serverSaleId) return;

    const existingServerSale = (await db.getFirstAsync(
      "SELECT id FROM sales WHERE id = ?",
      [serverSaleId],
    )) as { id: string } | null;

    if (existingServerSale) {
      await this.reassignSaleChildren(
        db,
        localSaleId,
        serverSaleId,
        syncedAt,
      );
      await db.runAsync(
        `UPDATE sales SET deleted_at = ?, sync_status = 'synced', last_synced_at = ? WHERE id = ?`,
        [syncedAt, syncedAt, localSaleId],
      );
      return;
    }

    await db.runAsync(
      `UPDATE sales
       SET id = ?, sync_status = 'synced', last_synced_at = ?, server_updated_at = ?, local_updated_at = ?
       WHERE id = ?`,
      [serverSaleId, syncedAt, syncedAt, syncedAt, localSaleId],
    );

    await this.reassignSaleChildren(db, localSaleId, serverSaleId, syncedAt);
  }

  private async reassignSaleChildren(
    db: any,
    localSaleId: string,
    serverSaleId: string,
    syncedAt: string,
  ) {
    await db.runAsync(
      `UPDATE sale_lines SET sale_id = ?, sync_status = 'synced', last_synced_at = ? WHERE sale_id = ?`,
      [serverSaleId, syncedAt, localSaleId],
    );
    await db.runAsync(
      `UPDATE payments SET sale_id = ?, sync_status = 'synced', last_synced_at = ? WHERE sale_id = ?`,
      [serverSaleId, syncedAt, localSaleId],
    );
    await db.runAsync(
      `UPDATE sale_container_kasas SET sale_id = ?, sync_status = 'synced', last_synced_at = ? WHERE sale_id = ?`,
      [serverSaleId, syncedAt, localSaleId],
    );
    await db.runAsync(
      `UPDATE sale_returned_containers SET sale_id = ?, sync_status = 'synced', last_synced_at = ? WHERE sale_id = ?`,
      [serverSaleId, syncedAt, localSaleId],
    );
  }

  private async applyChanges(changes: SyncResponse["changes"]) {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Customers
    if (changes.customers) {
      for (const c of changes.customers) {
        await customerRepo.upsert({
          id: c.id,
          shop_id: c.shopId,
          name: c.name,
          phone: c.phone,
          credit_balance_cents: c.creditBalanceCents || 0,
          outstanding_boxes: c.outstandingBoxes || 0,
          outstanding_bottles: c.outstandingBottles || 0,
          price_tier_id: c.priceTierId,
          sync_status: "synced",
          last_synced_at: now,
          server_version: c.version || 0,
        });
      }
    }

    // Beverages
    if (changes.beverages) {
      for (const b of changes.beverages) {
        await beverageRepo.upsert({
          id: b.id,
          shop_id: b.shopId,
          name: b.name,
          brand: b.brand,
          bottles_per_box: b.bottlesPerBox || 24,
          stock_bottles: b.stockBottles || 0,
          is_active: b.isActive ? 1 : 0,
          sync_status: "synced",
          last_synced_at: now,
          server_version: b.version || 0,
        });
      }
    }

    // Price Tiers
    if (changes.priceTiers) {
      for (const t of changes.priceTiers) {
        await priceTierRepo.upsert({
          id: t.id,
          shop_id: t.shopId,
          name: t.name,
          is_default: t.isDefault ? 1 : 0,
          sync_status: "synced",
          last_synced_at: now,
          server_version: t.version || 0,
        });
      }
    }

    // Beverage Prices
    if (changes.beveragePrices) {
      for (const p of changes.beveragePrices) {
        await db.runAsync(
          `INSERT OR REPLACE INTO beverage_prices (id, beverage_id, price_tier_id, price_per_box_cents, price_per_bottle_cents, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.beverageId,
            p.priceTierId,
            p.pricePerBoxCents,
            p.pricePerBottleCents,
            "synced",
            now,
          ],
        );
      }
    }

    // Payment Accounts
    if (changes.paymentAccounts) {
      for (const a of changes.paymentAccounts) {
        await paymentAccountRepo.upsert({
          id: a.id,
          shop_id: a.shopId,
          name: a.name,
          kind: a.kind,
          account_number: a.accountNumber,
          is_active: a.isActive ? 1 : 0,
          sync_status: "synced",
          last_synced_at: now,
          server_version: a.version || 0,
        });
      }
    }

    // Sales
    if (changes.sales) {
      for (const s of changes.sales) {
        await saleRepo.upsert({
          id: s.id,
          shop_id: s.shopId,
          customer_id: s.customerId ?? null,
          sale_date: s.saleDate,
          subtotal_cents: s.subtotalCents ?? 0,
          paid_cents: s.paidCents ?? 0,
          credit_delta_cents: s.creditDeltaCents ?? 0,
          boxes_out_delta: s.boxesOutDelta ?? 0,
          bottles_out_delta: s.bottlesOutDelta ?? 0,
          boxes_returned_on_sale: s.boxesReturnedOnSale ?? 0,
          bottles_returned_on_sale: s.bottlesReturnedOnSale ?? 0,
          status: s.status,
          price_tier_id: s.priceTierId,
          notes: s.notes ?? null,
          voided_at: s.voidedAt ?? null,
          void_reason: s.voidReason ?? null,
          sync_status: "synced",
          last_synced_at: now,
          server_version: s.version || 0,
          server_updated_at: s.updatedAt ?? now,
        });

        if (s.lines && s.lines.length > 0) {
          await db.runAsync(`DELETE FROM sale_lines WHERE sale_id = ?`, [s.id]);
          for (const l of s.lines) {
            await db.runAsync(
              `INSERT OR REPLACE INTO sale_lines (id, shop_id, sale_id, beverage_id, boxes, bottles, price_per_box_cents, price_per_bottle_cents, line_total_cents, sync_status, last_synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                l.id,
                s.shopId,
                s.id,
                l.beverageId,
                l.boxes,
                l.bottles,
                l.pricePerBoxCents,
                l.pricePerBottleCents,
                l.lineTotalCents,
                "synced",
                now,
              ],
            );
          }
        }

        if (Array.isArray(s.containerKasas)) {
          await db.runAsync(`DELETE FROM sale_container_kasas WHERE sale_id = ?`, [
            s.id,
          ]);
          for (const ck of s.containerKasas) {
            await db.runAsync(
              `INSERT OR REPLACE INTO sale_container_kasas (id, shop_id, sale_id, beverage_id, count, local_updated_at, server_updated_at, sync_status, last_synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ck.id,
                s.shopId,
                s.id,
                ck.beverageId,
                ck.count,
                ck.createdAt ?? now,
                ck.createdAt ?? now,
                "synced",
                now,
              ],
            );
          }
        }

        if (Array.isArray(s.returnedContainers)) {
          await db.runAsync(
            `DELETE FROM sale_returned_containers WHERE sale_id = ?`,
            [s.id],
          );
          for (const rc of s.returnedContainers) {
            await db.runAsync(
              `INSERT OR REPLACE INTO sale_returned_containers (id, shop_id, sale_id, beverage_id, boxes, bottles, local_updated_at, server_updated_at, sync_status, last_synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                rc.id,
                s.shopId,
                s.id,
                rc.beverageId,
                rc.boxes,
                rc.bottles,
                rc.createdAt ?? now,
                rc.createdAt ?? now,
                "synced",
                now,
              ],
            );
          }
        }
      }
    }

    // Customer Ledger Entries
    if (changes.customerLedgerEntries) {
      for (const e of changes.customerLedgerEntries) {
        await db.runAsync(
          `INSERT OR REPLACE INTO customer_ledger_entries (id, customer_id, type, date, data_json, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id,
            e.customerId,
            e.type,
            e.date,
            e.dataJson || JSON.stringify(e.data || {}),
            "synced",
            now,
          ],
        );
      }
    }

    // Stock Movements
    if (changes.stockMovements) {
      for (const m of changes.stockMovements) {
        await db.runAsync(
          `INSERT OR REPLACE INTO stock_movements (id, shop_id, beverage_id, reason, bottles_delta, notes, recorded_by_id, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id,
            m.shopId,
            m.beverageId,
            m.reason,
            m.bottlesDelta || m.deltaBottles || 0,
            m.notes || null,
            m.recordedById || null,
            "synced",
            now,
          ],
        );
      }
    }

    // Handle Deletes
    if (changes.tombstones) {
      for (const [entityType, ids] of Object.entries(changes.tombstones)) {
        if (Array.isArray(ids) && ids.length > 0) {
          const placeholders = ids.map(() => "?").join(", ");
          const table = entityType.toLowerCase().endsWith("s")
            ? entityType.toLowerCase()
            : entityType.toLowerCase() + "s";
          // Fix for some common mismatches
          const actualTable =
            table === "beverageprices"
              ? "beverage_prices"
              : table === "paymentaccounts"
                ? "payment_accounts"
                : table;

          await db.runAsync(
            `UPDATE ${actualTable} SET deleted_at = ?, sync_status = 'synced' WHERE id IN (${placeholders})`,
            [now, ...ids],
          );
        }
      }
    }
  }
}

export const syncCoordinator = new SyncCoordinator();
