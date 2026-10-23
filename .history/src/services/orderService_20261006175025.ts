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
  // Hanya gunakan service ini pada Android
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  try {
    await db.beginTransaction();

    /*
     * Pastikan order sudah ada.
     *
     * INSERT OR IGNORE digunakan karena order mungkin
     * sebelumnya sudah tersimpan.
     */
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

    /*
     * Ambil ID order berdasarkan nomor invoice.
     */
    const orderResult = await db.query(
      `
        SELECT id
        FROM orders
        WHERE invoice_number = ?
        LIMIT 1
      `,
      [order.receiptNumber]
    );

    if (!orderResult.values || orderResult.values.length === 0) {
      throw new Error(
        'Order tidak ditemukan setelah disimpan ke database.'
      );
    }

    const orderId = orderResult.values[0].id;

    /*
     * Update status dan total order.
     */
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

    /*
     * Simpan item order.
     *
     * Hanya insert jika item belum ada.
     */
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
          SELECT ?, id, ?, ?, ?, ?
          FROM menus
          WHERE id = ?
          LIMIT 1
        `,
        [
          orderId,
          item.product.name,
          item.quantity,
          item.product.price,
          subtotal,
          Number(item.product.id),
        ],
        true
      );
    }

    /*
     * Simpan pembayaran.
     *
     * Karena payments.order_id UNIQUE,
     * satu order hanya boleh memiliki satu pembayaran.
     */
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

    await db.commitTransaction();

    console.log(
      'Pembayaran berhasil disimpan ke SQLite:',
      order.receiptNumber
    );
  } catch (error) {
    try {
      await db.rollbackTransaction();
    } catch (rollbackError) {
      console.error(
        'Gagal melakukan rollback:',
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