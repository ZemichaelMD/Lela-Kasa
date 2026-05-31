import { getDatabase } from "../db/database";
import { enqueueOperation, EnqueueParams } from "../outbox";

export interface BaseMetadata {
  id: string;
  sync_status: "synced" | "pending" | "failed" | "conflicted";
  last_synced_at?: string | null;
  server_version: number;
}

export abstract class BaseRepository<T extends BaseMetadata> {
  constructor(protected tableName: string) {}

  protected async db() {
    return await getDatabase();
  }

  protected generateLocalId(): string {
    const ts = Date.now().toString(36);
    const r = Math.random().toString(36).substring(2, 12);
    return `loc_${ts}_${r}`;
  }

  async findById(id: string): Promise<T | null> {
    const db = await this.db();
    return await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
  }

  async list(shopId?: string): Promise<T[]> {
    const db = await this.db();
    if (shopId) {
      return await db.getAllAsync<T>(
        `SELECT * FROM ${this.tableName} WHERE shop_id = ? AND deleted_at IS NULL`,
        [shopId],
      );
    }
    return await db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`,
    );
  }

  async upsert(data: Partial<T> & { id: string }): Promise<void> {
    const db = await this.db();
    const existing = await this.findById(data.id);

    // Filter out keys that don't belong to the database schema or are complex objects
    // For a real production app, we'd use a schema map.
    // For now, we'll just be careful with what we pass to upsert.
    const cleanData = { ...data };

    // Ensure meta columns exist if not provided
    if (!cleanData.sync_status) cleanData.sync_status = "synced";

    const keys = Object.keys(cleanData).join(", ");
    const placeholders = Object.keys(cleanData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(cleanData) as any[];

    if (existing) {
      const updates = Object.keys(cleanData)
        .filter((key) => key !== "id")
        .map((key) => `${key} = ?`)
        .join(", ");
      const updateValues = Object.keys(cleanData)
        .filter((key) => key !== "id")
        .map((key) => (cleanData as any)[key]);

      await db.runAsync(
        `UPDATE ${this.tableName} SET ${updates} WHERE id = ?`,
        [...updateValues, cleanData.id],
      );
    } else {
      await db.runAsync(
        `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`,
        values,
      );
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.db();
    await db.runAsync(
      `UPDATE ${this.tableName} SET deleted_at = datetime('now'), sync_status = 'pending' WHERE id = ?`,
      [id],
    );
  }

  async enqueueOutbox(params: EnqueueParams): Promise<void> {
    await enqueueOperation(params);
  }
}
