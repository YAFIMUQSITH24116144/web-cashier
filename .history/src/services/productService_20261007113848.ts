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
      m.category_id,
      c.name AS category_name
    FROM menus m
    LEFT JOIN categories c
      ON c.id = m.category_id
    ORDER BY m.created_at ASC
  `);

  console.log(
    'CEK GAMBAR DARI SQLITE:',
    (result.values ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      imageLength: String(row.image_path ?? '').length,
      imageStart: String(row.image_path ?? '').substring(0, 80),
    }))
  );

  return (result.values ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category_id ?? ''),
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

  console.log(
    'Menyimpan produk ke SQLite:',
    product
  );

  const categoryResult = await db.query(
    `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
    `,
    [product.category]
  );

  if (
    !categoryResult.values ||
    categoryResult.values.length === 0
  ) {
    throw new Error(
      `Kategori "${product.category}" tidak ditemukan di database.`
    );
  }

  const categoryId = categoryResult.values[0].id;

  const result = await db.run(
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
    'Hasil INSERT produk:',
    result
  );

  const verify = await db.query(
    `
      SELECT
        id,
        name,
        price,
        category_id,
        image_path,
        is_available
      FROM menus
      WHERE id = ?
      LIMIT 1
    `,
    [product.id]
  );

  if (
    !verify.values ||
    verify.values.length === 0
  ) {
    throw new Error(
      'Produk tidak ditemukan setelah INSERT SQLite.'
    );
  }

  const savedProduct = verify.values[0];

  console.log(
    'Produk berhasil diverifikasi di SQLite:',
    {
      id: savedProduct.id,
      name: savedProduct.name,
      imageType: typeof savedProduct.image_path,
      imageLength: String(
        savedProduct.image_path ?? ''
      ).length,
      imageStart: String(
        savedProduct.image_path ?? ''
      ).substring(0, 80),
    }
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
      LIMIT 1
    `,
    [product.category]
  );

  if (
    !categoryResult.values ||
    categoryResult.values.length === 0
  ) {
    throw new Error(
      `Kategori "${product.category}" tidak ditemukan di database.`
    );
  }

  const categoryId = categoryResult.values[0].id;

  const result = await db.run(
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
    product.name,
    result
  );

  // Verifikasi hasil UPDATE
  const verify = await db.query(
    `
      SELECT
        id,
        name,
        image_path,
        is_available
      FROM menus
      WHERE id = ?
      LIMIT 1
    `,
    [product.id]
  );

  if (
    !verify.values ||
    verify.values.length === 0
  ) {
    throw new Error(
      'Produk tidak ditemukan setelah UPDATE SQLite.'
    );
  }

  const savedProduct = verify.values[0];

  console.log(
    'Hasil UPDATE produk:',
    {
      id: savedProduct.id,
      name: savedProduct.name,
      imageType: typeof savedProduct.image_path,
      imageLength: String(
        savedProduct.image_path ?? ''
      ).length,
      imageStart: String(
        savedProduct.image_path ?? ''
      ).substring(0, 80),
    }
  );
}

export async function deleteProductFromDatabase(
  productId: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  await db.run(
    `
      DELETE FROM menus
      WHERE id = ?
    `,
    [productId]
  );

  console.log(
    'Produk berhasil dihapus:',
    productId
  );
}