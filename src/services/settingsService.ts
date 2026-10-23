import { Capacitor } from '@capacitor/core';
import type { AppSettings } from '@/types';
import { getDatabase } from './database';

const TABLE_NAME = 'app_settings';

async function ensureSettingsTable() {
  const db = await getDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export async function loadSettingsFromDatabase(): Promise<AppSettings | null> {
  if (Capacitor.getPlatform() !== 'android') {
    return null;
  }

  const db = await ensureSettingsTable();

  const result = await db.query(
    `
      SELECT data
      FROM ${TABLE_NAME}
      WHERE id = 1
      LIMIT 1
    `
  );

  if (!result.values || result.values.length === 0) {
    console.log('Belum ada Settings tersimpan di SQLite.');
    return null;
  }

  const rawData = result.values[0].data;

  try {
    const settings = JSON.parse(String(rawData)) as AppSettings;

    console.log(
      'Settings berhasil dimuat dari SQLite:',
      settings
    );

    return settings;
  } catch (error) {
    console.error(
      'Data Settings SQLite tidak valid:',
      error
    );

    return null;
  }
}

export async function saveSettingsToDatabase(
  settings: AppSettings
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await ensureSettingsTable();

  const data = JSON.stringify(settings);

  await db.run(
    `
      INSERT INTO ${TABLE_NAME} (
        id,
        data,
        updated_at
      )
      VALUES (
        1,
        ?,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(id)
      DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `,
    [data]
  );

  const verify = await db.query(
    `
      SELECT
        id,
        data,
        updated_at
      FROM ${TABLE_NAME}
      WHERE id = 1
      LIMIT 1
    `
  );

  if (!verify.values || verify.values.length === 0) {
    throw new Error(
      'Settings tidak ditemukan setelah disimpan ke SQLite.'
    );
  }

  console.log(
    'Settings berhasil disimpan ke SQLite:',
    {
      id: verify.values[0].id,
      updatedAt: verify.values[0].updated_at,
      dataLength: String(
        verify.values[0].data ?? ''
      ).length,
    }
  );
}