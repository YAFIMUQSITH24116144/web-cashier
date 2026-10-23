import { Capacitor } from '@capacitor/core';
import type { Product } from '@/types';
import { getDatabase } from './database';

export async function loadProductsFromDatabase(): Promise<Product[]> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  const db = await getDatabase();

  const result = await db.query(`
    SELECT
      m.id,
      m.name,
      m.price,
      m.image_path,
      m.is_available,
      c.name AS category_name
    FROM menus m
    LEFT JOIN categories c
      ON c.id = m.category_id
    ORDER BY m.created_at ASC
  `);

  return (result.values ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category_name ?? row.category_id ?? ''),
    price: Number(row.price ?? 0),
    image: String(row.image_path ?? ''),
    available: Number(row.is_available ?? 1) === 1,
  }));
}