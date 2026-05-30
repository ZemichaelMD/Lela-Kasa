import * as SQLite from "expo-sqlite";
import { migrate } from "./migrations";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("lela_kasa_offline.db");
  await migrate(db);
  return db;
}

export const getDb = getDatabase;

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  // expo-sqlite doesn't have a direct deleteDatabaseAsync,
  // but we can just drop all tables or reopen and migrate.
  // For a clean reset, we'd need to use FileSystem.deleteAsync but that's overkill for now.
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS sync_state;
    DROP TABLE IF EXISTS outbox;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS shops;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS beverages;
    DROP TABLE IF EXISTS price_tiers;
    DROP TABLE IF EXISTS beverage_prices;
    DROP TABLE IF EXISTS payment_accounts;
    DROP TABLE IF EXISTS sales;
    DROP TABLE IF EXISTS sale_lines;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS sale_container_kasas;
    DROP TABLE IF EXISTS sale_returned_containers;
    DROP TABLE IF EXISTS stock_movements;
    PRAGMA user_version = 0;
  `);
  await migrate(database);
}

export const resetDb = resetDatabase;
