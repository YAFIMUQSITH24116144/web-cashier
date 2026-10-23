import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { initializeDatabase } from './databaseSchema';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let db: SQLiteDBConnection | null = null;
let databasePromise: Promise<SQLiteDBConnection> | null = null;

export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Capacitor SQLite database hanya digunakan pada Android.'
    );
  }

  // Jika database sudah tersedia, gunakan connection yang sama
  if (db) {
    return db;
  }

  // Cegah beberapa proses membuka database yang sama secara bersamaan
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = (async () => {
    const dbName = 'kasir';

    try {
      console.log(
        '[SQLite] Memeriksa connection database...'
      );

      const consistency =
        await sqlite.checkConnectionsConsistency();

      if (consistency.result) {
        const connection =
          await sqlite.isConnection(
            dbName,
            false
          );

        if (connection.result) {
          console.log(
            '[SQLite] Mengambil connection yang sudah ada...'
          );

          db = await sqlite.retrieveConnection(
            dbName,
            false
          );

          // Pastikan hanya membuka database jika belum terbuka
          const isOpen =
            await db.isDBOpen();

          if (!isOpen.result) {
            console.log(
              '[SQLite] Connection belum terbuka, membuka database...'
            );

            await db.open();
          } else {
            console.log(
              '[SQLite] Database sudah terbuka.'
            );
          }

          return db;
        }
      }

      console.log(
        '[SQLite] Membuat connection database baru...'
      );

      db = await sqlite.createConnection(
        dbName,
        false,
        'no-encryption',
        1,
        false
      );

      await db.open();

      console.log(
        '[SQLite] Database baru berhasil dibuka.'
      );

      return db;
    } catch (error) {
      console.error(
        '[SQLite] Gagal mendapatkan database:',
        error
      );

      db = null;
      throw error;
    } finally {
      databasePromise = null;
    }
  })();

  return databasePromise;
}

export async function initializeAndroidDatabase() {
  const database = await getDatabase();

  await initializeDatabase(database);

  console.log(
    'Android SQLite database berhasil diinisialisasi.'
  );

  return database;
}