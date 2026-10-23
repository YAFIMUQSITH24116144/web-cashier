import { Capacitor } from '@capacitor/core';
import type {
  Order,
  Product,
  OrderStatus,
  PaymentMethod,
} from '@/types';
import { getDatabase } from './database';

function mapOrderStatus(status: string): OrderStatus {
  switch (status) {
    case 'PAID':
      return 'lunas';

    case 'CANCELLED':
      return 'batal';

    default:
      return 'menunggu';
  }
}

function mapPaymentMethod(
  method: string | null | undefined
): PaymentMethod | undefined {
  if (method === 'qris') {
    return 'qris';
  }

  if (method === 'tunai') {
    return 'tunai';
  }

  return undefined;
}

/**
 * =========================================================
 * SIMPAN PEMBAYARAN
 * =========================================================
 */
export async function savePaymentToDatabase(
  order: Order
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  // -------------------------------------------------------
  // 1. Cari order berdasarkan invoice
  // -------------------------------------------------------

  const existingOrder = await db.query(
    `
      SELECT id
      FROM orders
      WHERE invoice_number = ?
      LIMIT 1
    `,
    [order.receiptNumber]
  );

  let orderId: number;

  // -------------------------------------------------------
  // 2. Kalau order sudah ada → UPDATE
  // -------------------------------------------------------

  if (
    existingOrder.values &&
    existingOrder.values.length > 0
  ) {
    orderId = Number(
      existingOrder.values[0].id
    );

    await db.run(
      `
        UPDATE orders
        SET
          status = ?,
          total = ?
        WHERE id = ?
      `,
      [
        mapDatabaseStatus(order.status),
        order.total,
        orderId,
      ]
    );
  }

  // -------------------------------------------------------
  // 3. Kalau belum ada → INSERT
  // -------------------------------------------------------

  else {
    const result = await db.run(
      `
        INSERT INTO orders (
          invoice_number,
          created_at,
          status,
          total
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        order.receiptNumber,
        order.createdAt.toISOString(),
        mapDatabaseStatus(order.status),
        order.total,
      ]
    );

    if (!result.changes?.lastId) {
      throw new Error(
        'Gagal membuat order di database.'
      );
    }

    orderId = Number(
      result.changes.lastId
    );
  }

  // -------------------------------------------------------
  // 4. Pastikan order_items ada
  // -------------------------------------------------------

  const existingItems = await db.query(
    `
      SELECT id
      FROM order_items
      WHERE order_id = ?
      LIMIT 1
    `,
    [orderId]
  );

  if (
    !existingItems.values ||
    existingItems.values.length === 0
  ) {
    for (const item of order.items) {
      const subtotal =
        item.product.price *
        item.quantity;

      await db.run(
        `
          INSERT INTO order_items (
            order_id,
            menu_id,
            menu_name,
            quantity,
            price,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product.id,
          item.product.name,
          item.quantity,
          item.product.price,
          subtotal,
        ]
      );
    }
  }

  // -------------------------------------------------------
  // 5. Simpan payment
  // -------------------------------------------------------

  if (order.status === 'lunas') {
    await db.run(
      `
        INSERT OR REPLACE INTO payments (
          order_id,
          amount_paid,
          change_amount,
          method,
          paid_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        orderId,

        order.amountPaid ??
          order.total,

        order.change ?? 0,

        order.paymentMethod ??
          'tunai',

        (
          order.paidAt ??
          new Date()
        ).toISOString(),
      ]
    );
  }

  console.log(
    'Pembayaran berhasil disimpan ke SQLite:',
    order.receiptNumber
  );
}

/**
 * =========================================================
 * LOAD ORDERS DARI DATABASE
 * =========================================================
 */
export async function loadOrdersFromDatabase(): Promise<Order[]> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  const db = await getDatabase();

  const ordersResult = await db.query(`
    SELECT
      o.id,
      o.invoice_number,
      o.created_at,
      o.status,
      o.total,

      p.amount_paid,
      p.change_amount,
      p.method,
      p.paid_at

    FROM orders o

    LEFT JOIN payments p
      ON p.order_id = o.id

    ORDER BY o.created_at DESC
  `);

  const rows =
    ordersResult.values ?? [];

  const orders: Order[] = [];

  for (const row of rows) {
    // -----------------------------------------------------
    // Ambil item order
    // -----------------------------------------------------

    const itemsResult =
      await db.query(
        `
          SELECT
            oi.menu_id,
            oi.menu_name,
            oi.quantity,
            oi.price,
            oi.subtotal,

            m.category_id,
            m.image_path,
            m.is_available

          FROM order_items oi

          LEFT JOIN menus m
            ON m.id = oi.menu_id

          WHERE oi.order_id = ?

          ORDER BY oi.id ASC
        `,
        [row.id]
      );

    const itemRows =
      itemsResult.values ?? [];

    const items =
      itemRows.map((item) => {
        const product: Product = {
          id: String(
            item.menu_id ?? ''
          ),

          name: String(
            item.menu_name ?? ''
          ),

          category: String(
            item.category_id ?? ''
          ),

          price: Number(
            item.price ?? 0
          ),

          image: String(
            item.image_path ?? ''
          ),

          available:
            Number(
              item.is_available ?? 1
            ) === 1,
        };

        return {
          product,
          quantity: Number(
            item.quantity ?? 1
          ),
        };
      });

    // -----------------------------------------------------
    // Hitung subtotal
    // -----------------------------------------------------

    const subtotal =
      items.reduce(
        (total, item) =>
          total +
          item.product.price *
            item.quantity,
        0
      );

    // -----------------------------------------------------
    // Buat object Order untuk React
    // -----------------------------------------------------

    const order: Order = {
      id: String(row.id),

      receiptNumber:
        String(row.invoice_number),

      items,

      subtotal,

      total: Number(
        row.total ?? 0
      ),

      status:
        mapOrderStatus(row.status),

      paymentMethod:
        mapPaymentMethod(row.method),

      amountPaid:
        row.amount_paid != null
          ? Number(row.amount_paid)
          : undefined,

      change:
        row.change_amount != null
          ? Number(row.change_amount)
          : undefined,

      createdAt:
        new Date(row.created_at),

      paidAt:
        row.paid_at
          ? new Date(row.paid_at)
          : undefined,

      cashierName: '',

      tableNumber: undefined,
    };

    orders.push(order);
  }

  console.log(
    `Berhasil membaca ${orders.length} order dari SQLite.`
  );

  return orders;
}

/**
 * =========================================================
 * STATUS UI → DATABASE
 * =========================================================
 */
function mapDatabaseStatus(
  status: OrderStatus
) {
  switch (status) {
    case 'lunas':
      return 'PAID';

    case 'batal':
      return 'CANCELLED';

    default:
      return 'UNPAID';
  }
}

/**
 * =========================================================
 * SIMPAN ORDER BARU
 * =========================================================
 */
export async function saveOrderToDatabase(
  order: Order
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  // -------------------------------------------------------
  // 1. Pastikan order belum ada
  // -------------------------------------------------------

  const existingOrder = await db.query(
    `
      SELECT id
      FROM orders
      WHERE invoice_number = ?
      LIMIT 1
    `,
    [order.receiptNumber]
  );

  if (
    existingOrder.values &&
    existingOrder.values.length > 0
  ) {
    console.log(
      'Order sudah ada:',
      order.receiptNumber
    );

    return;
  }

  // -------------------------------------------------------
  // 2. Simpan order
  // -------------------------------------------------------

  const result = await db.run(
    `
      INSERT INTO orders (
        invoice_number,
        created_at,
        status,
        total
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      order.receiptNumber,
      order.createdAt.toISOString(),
      mapDatabaseStatus(order.status),
      order.total,
    ]
  );

  if (!result.changes?.lastId) {
    throw new Error(
      'Gagal menyimpan order ke database.'
    );
  }

  const orderId = Number(
    result.changes.lastId
  );

  // -------------------------------------------------------
  // 3. Simpan semua item order
  // -------------------------------------------------------

  for (const item of order.items) {
    const subtotal =
      item.product.price *
      item.quantity;

    await db.run(
      `
        INSERT INTO order_items (
          order_id,
          menu_id,
          menu_name,
          quantity,
          price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        item.product.id,
        item.product.name,
        item.quantity,
        item.product.price,
        subtotal,
      ]
    );
  }

  console.log(
    'Order baru berhasil disimpan:',
    order.receiptNumber
  );
}