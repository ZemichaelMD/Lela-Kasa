import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'lela_kasa_offline.db';

let _db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db) return _db;
  const db = await openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  _db = db;
  return db;
}

export function resetDb(): void {
  _db = null;
}
