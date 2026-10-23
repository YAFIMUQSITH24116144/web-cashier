import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { initializeDatabase } from './databaseSchema';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let db: SQLiteDBConnection | null = null;

export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Capacitor SQLite database hanya digunakan pada Android.'
    );
  }

  if (db) {
    return db;
  }

  const dbName = 'kasir';

  const consistency = await sqlite.checkConnectionsConsistency();

  if (consistency.result) {
    const connection = await sqlite.isConnection(
      dbName,
      false
    );

    if (connection.result) {
      db = await sqlite.retrieveConnection(
        dbName,
        false
      );
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

export async function initializeAndroidDatabase() {
  const database = await getDatabase();

  await initializeDatabase(database);

  console.log('Android SQLite database berhasil diinisialisasi.');

  return database;
}