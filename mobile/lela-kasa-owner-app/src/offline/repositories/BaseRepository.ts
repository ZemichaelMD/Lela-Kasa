import { getDatabase } from "../db/database";

export interface BaseMetadata {
  local_id: string;
  server_id?: string | null;
  sync_status: "synced" | "pending" | "failed" | "conflicted";
  last_synced_at?: string | null;
  server_version: number;
}

export abstract class BaseRepository<T extends BaseMetadata> {
  constructor(protected tableName: string) {}

  protected async db() {
    return await getDatabase();
  }

  async findById(local_id: string): Promise<T | null> {
    const db = await this.db();
    return await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE local_id = ?`,
      [local_id],
    );
  }

  async findByServerId(server_id: string): Promise<T | null> {
    const db = await this.db();
    return await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE server_id = ?`,
      [server_id],
    );
  }

  async list(shopId?: string): Promise<T[]> {
    const db = await this.db();
    if (shopId) {
      return await db.getAllAsync<T>(
        `SELECT * FROM ${this.tableName} WHERE shop_id = ?`,
        [shopId],
      );
    }
    return await db.getAllAsync<T>(`SELECT * FROM ${this.tableName}`);
  }

  async upsert(data: Partial<T> & { local_id: string }): Promise<void> {
    const db = await this.db();
    const existing = await this.findById(data.local_id);

    if (existing) {
      const updates = Object.keys(data)
        .filter((key) => key !== "local_id")
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.keys(data)
        .filter((key) => key !== "local_id")
        .map((key) => (data as any)[key]);

      await db.runAsync(
        `UPDATE ${this.tableName} SET ${updates} WHERE local_id = ?`,
        [...values, data.local_id],
      );
    } else {
      const keys = Object.keys(data).join(", ");
      const placeholders = Object.keys(data)
        .map(() => "?")
        .join(", ");
      const values = Object.values(data);

      await db.runAsync(
        `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`,
        values,
      );
    }
  }

  async delete(local_id: string): Promise<void> {
    const db = await this.db();
    await db.runAsync(`DELETE FROM ${this.tableName} WHERE local_id = ?`, [
      local_id,
    ]);
  }

  protected generateLocalId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async enqueueOutbox(
    entity_id: string,
    operation: "CREATE" | "UPDATE" | "DELETE",
    payload: any,
    client_mutation_id: string,
  ): Promise<void> {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO outbox (id, entity_type, entity_id, operation, payload_json, client_mutation_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.generateLocalId(),
        this.tableName,
        entity_id,
        operation,
        JSON.stringify(payload),
        client_mutation_id,
      ],
    );
  }
}
