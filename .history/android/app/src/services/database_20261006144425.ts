import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let db: SQLiteDBConnection | null = null;

export async function getDatabase() {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('Capacitor SQLite adapter hanya digunakan di Android.');
  }

  if (db) {
    return db;
  }

  const dbName = 'webcashier';

  const consistency = await sqlite.checkConnectionsConsistency();

  if (consistency.result) {
    const isConn = await sqlite.isConnection(dbName, false);

    if (isConn.result) {
      db = await sqlite.retrieveConnection(dbName, false);
    }
  }

  if (!db) {
    db = await sqlite.createConnection(
      dbName,
      false,
      'no-encryption',
      1,
      false
    );
  }

  await db.open();

  return db;
}