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

  if (db) {
    return db;
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = (async () => {
    const dbName = 'kasir';

    try {
      console.log('[SQLite] Membuat/membuka database...');

      /*
       * Jangan menggunakan checkConnectionsConsistency()
       * karena pada perangkat ini plugin mengembalikan
       * "CapacitorSQLitePlugin: null".
       */

      try {
        const connection = await sqlite.isConnection(
          dbName,
          false
        );

        console.log(
          '[SQLite] Status connection:',
          connection
        );

        if (connection.result) {
          console.log(
            '[SQLite] Mengambil connection yang sudah ada...'
          );

          db = await sqlite.retrieveConnection(
            dbName,
            false
          );

          const isOpen = await db.isDBOpen();

          console.log(
            '[SQLite] Status database:',
            isOpen
          );

          if (!isOpen.result) {
            console.log(
              '[SQLite] Database belum terbuka, membuka...'
            );

            await db.open();
          }

          console.log(
            '[SQLite] Database berhasil dibuka.'
          );

          return db;
        }
      } catch (connectionError) {
        console.warn(
          '[SQLite] Tidak dapat memeriksa connection lama, membuat connection baru:',
          connectionError
        );
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