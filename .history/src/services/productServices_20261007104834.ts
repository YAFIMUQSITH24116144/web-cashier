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

export async function saveProductToDatabase(
  product: Product
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  const categoryResult = await db.query(
    `
      SELECT id
      FROM categories
      WHERE id = ?
         OR name = ?
      LIMIT 1
    `,
    [product.category, product.category]
  );

  const categoryId =
    categoryResult.values?.[0]?.id ?? product.category;

  await db.run(
    `
      INSERT INTO menus (
        id,
        category_id,
        name,
        price,
        image_path,
        is_available
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      product.id,
      categoryId,
      product.name,
      product.price,
      product.image,
      product.available ? 1 : 0,
    ]
  );

  console.log(
    'Produk berhasil disimpan:',
    product.name
  );
}

export async function updateProductInDatabase(
  product: Product
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  const categoryResult = await db.query(
    `
      SELECT id
      FROM categories
      WHERE id = ?
         OR name = ?
      LIMIT 1
    `,
    [product.category, product.category]
  );

  const categoryId =
    categoryResult.values?.[0]?.id ?? product.category;

  await db.run(
    `
      UPDATE menus
      SET
        category_id = ?,
        name = ?,
        price = ?,
        image_path = ?,
        is_available = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      categoryId,
      product.name,
      product.price,
      product.image,
      product.available ? 1 : 0,
      product.id,
    ]
  );

  console.log(
    'Produk berhasil diperbarui:',
    product.name
  );
}