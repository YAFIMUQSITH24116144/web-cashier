import { Capacitor } from '@capacitor/core';
import type { Order } from '@/types';
import { getDatabase } from './database';

function formatSQLiteDate(date: Date) {
  return date.toISOString();
}

function mapOrderStatus(status: Order['status']) {
  switch (status) {
    case 'menunggu':
      return 'UNPAID';

    case 'lunas':
      return 'PAID';

    case 'batal':
      return 'CANCELLED';

    default:
      return 'UNPAID';
  }
}

export async function savePaymentToDatabase(
  order: Order
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  try {
    await db.beginTransaction();

    // 1. Simpan order
    await db.run(
      `
        INSERT OR IGNORE INTO orders (
          invoice_number,
          created_at,
          status,
          total
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        order.receiptNumber,
        formatSQLiteDate(order.createdAt),
        mapOrderStatus(order.status),
        order.total,
      ],
      true
    );

    // 2. Ambil ID SQLite berdasarkan nomor invoice
    const orderResult = await db.query(
      `
        SELECT id
        FROM orders
        WHERE invoice_number = ?
        LIMIT 1
      `,
      [order.receiptNumber]
    );

    if (
      !orderResult.values ||
      orderResult.values.length === 0
    ) {
      throw new Error(
        'Order tidak ditemukan setelah disimpan.'
      );
    }

    const orderId = orderResult.values[0].id;

    // 3. Update status dan total
    await db.run(
      `
        UPDATE orders
        SET status = ?, total = ?
        WHERE id = ?
      `,
      [
        mapOrderStatus(order.status),
        order.total,
        orderId,
      ],
      true
    );

    // 4. Simpan item-item order
    for (const item of order.items) {
      const subtotal =
        item.product.price * item.quantity;

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
        ],
        true
      );
    }

    // 5. Simpan pembayaran
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
          order.amountPaid ?? order.total,
          order.change ?? 0,
          order.paymentMethod ?? 'tunai',
          formatSQLiteDate(
            order.paidAt ?? new Date()
          ),
        ],
        true
      );
    }

    // 6. Semua berhasil
    await db.commitTransaction();

    console.log(
      'Pembayaran berhasil disimpan:',
      order.receiptNumber
    );
  } catch (error) {
    try {
      await db.rollbackTransaction();
    } catch (rollbackError) {
      console.error(
        'Rollback gagal:',
        rollbackError
      );
    }

    console.error(
      'Gagal menyimpan pembayaran:',
      error
    );

    throw error;
  }
}