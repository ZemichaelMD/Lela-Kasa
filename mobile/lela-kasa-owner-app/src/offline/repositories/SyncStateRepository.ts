import { getDatabase } from "../db/database";

export interface SyncState {
  id: number;
  shop_id: string;
  last_sync_cursor: string | null;
  last_sync_at: string | null;
}

export class SyncStateRepository {
  async get(): Promise<SyncState | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<SyncState>(
      "SELECT * FROM sync_state WHERE id = 1",
    );
  }

  async set(data: Partial<SyncState>): Promise<void> {
    const db = await getDatabase();
    const existing = await this.get();

    const keys = Object.keys(data);
    if (keys.length === 0) return;

    if (existing) {
      const updates = keys.map((key) => `${key} = ?`).join(", ");
      const values = Object.values(data);
      await db.runAsync(
        `UPDATE sync_state SET ${updates} WHERE id = 1`,
        values,
      );
    } else {
      const allKeys = ["id", ...keys];
      const placeholders = allKeys.map(() => "?").join(", ");
      const values = [1, ...Object.values(data)];
      await db.runAsync(
        `INSERT INTO sync_state (${allKeys.join(", ")}) VALUES (${placeholders})`,
        values,
      );
    }
  }
}

export const syncStateRepo = new SyncStateRepository();
