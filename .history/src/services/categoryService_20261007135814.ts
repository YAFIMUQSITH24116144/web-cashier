import { Capacitor } from '@capacitor/core';
import type { Category } from '@/types';
import { getDatabase } from './database';

export async function loadCategoriesFromDatabase(): Promise<Category[]> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  const db = await getDatabase();

  const result = await db.query(`
    SELECT
      id,
      name
    FROM categories
    ORDER BY name ASC
  `);

  return (result.values ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
  }));
}