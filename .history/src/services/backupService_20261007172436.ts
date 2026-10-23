import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { getDatabase } from './database';

export async function backupDatabase(): Promise<string> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('Backup database hanya tersedia di Android.');
  }

  const db = await getDatabase();

  const categories = await db.query(`
    SELECT *
    FROM categories
    ORDER BY id
  `);

  const menus = await db.query(`
    SELECT *
    FROM menus
    ORDER BY id
  `);

  const orders = await db.query(`
    SELECT *
    FROM orders
    ORDER BY id
  `);

  const orderItems = await db.query(`
    SELECT *
    FROM order_items
    ORDER BY id
  `);

  const payments = await db.query(`
    SELECT *
    FROM payments
    ORDER BY id
  `);

  const settings = await db.query(`
    SELECT *
    FROM settings
    WHERE id = 1
  `);

  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),

    categories: categories.values ?? [],
    menus: menus.values ?? [],
    orders: orders.values ?? [],
    orderItems: orderItems.values ?? [],
    payments: payments.values ?? [],
    settings: settings.values ?? [],
  };

  const fileName = `web-cashier-backup-${formatBackupDate(
    new Date()
  )}.json`;

  const json = JSON.stringify(backup, null, 2);

  await Filesystem.writeFile({
    path: `backups/${fileName}`,
    data: json,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  console.log(
    'Backup database berhasil:',
    fileName
  );

  return fileName;
}

function formatBackupDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const hour = String(
    date.getHours()
  ).padStart(2, '0');

  const minute = String(
    date.getMinutes()
  ).padStart(2, '0');

  const second = String(
    date.getSeconds()
  ).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

export async function restoreDatabase(
  filePath: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('Restore database hanya tersedia di Android.');
  }

  const db = await getDatabase();

  const file = await Filesystem.readFile({
    path: filePath,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });

  const backup = JSON.parse(
    file.data as string
  );

  if (!backup || backup.version !== 1) {
    throw new Error(
      'Format file backup tidak dikenali.'
    );
  }

  if (
    !Array.isArray(backup.categories) ||
    !Array.isArray(backup.menus) ||
    !Array.isArray(backup.orders) ||
    !Array.isArray(backup.orderItems) ||
    !Array.isArray(backup.payments) ||
    !Array.isArray(backup.settings)
  ) {
    throw new Error(
      'Data backup tidak lengkap.'
    );
  }

  await db.execute('PRAGMA foreign_keys = OFF;');

  try {
    await db.execute('BEGIN TRANSACTION;');

    await db.execute(`
      DELETE FROM payments;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM menus;
      DELETE FROM categories;
      DELETE FROM settings;
    `);

    for (const category of backup.categories) {
      await db.run(
        `
          INSERT INTO categories (
            id,
            name,
            created_at
          )
          VALUES (?, ?, ?)
        `,
        [
          category.id,
          category.name,
          category.created_at,
        ],
        true
      );
    }

    for (const menu of backup.menus) {
      await db.run(
        `
          INSERT INTO menus (
            id,
            category_id,
            name,
            price,
            image_path,
            is_available,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          menu.id,
          menu.category_id,
          menu.name,
          menu.price,
          menu.image_path,
          menu.is_available,
          menu.created_at,
          menu.updated_at,
        ],
        true
      );
    }

    for (const order of backup.orders) {
      await db.run(
        `
          INSERT INTO orders (
            id,
            invoice_number,
            created_at,
            status,
            subtotal,
            total,
            cashier_name,
            table_number
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          order.id,
          order.invoice_number,
          order.created_at,
          order.status,
          order.subtotal,
          order.total,
          order.cashier_name,
          order.table_number,
        ],
        true
      );
    }

    for (const item of backup.orderItems) {
      await db.run(
        `
          INSERT INTO order_items (
            id,
            order_id,
            menu_id,
            menu_name,
            quantity,
            price,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          item.order_id,
          item.menu_id,
          item.menu_name,
          item.quantity,
          item.price,
          item.subtotal,
        ],
        true
      );
    }

    for (const payment of backup.payments) {
      await db.run(
        `
          INSERT INTO payments (
            id,
            order_id,
            amount_paid,
            change_amount,
            method,
            paid_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          payment.id,
          payment.order_id,
          payment.amount_paid,
          payment.change_amount,
          payment.method,
          payment.paid_at,
        ],
        true
      );
    }

    for (const setting of backup.settings) {
      await db.run(
        `
          INSERT INTO settings (
            id,
            business_name,
            tagline,
            address,
            phone,
            tax_percent,
            receipt_footer,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          setting.id,
          setting.business_name,
          setting.tagline,
          setting.address,
          setting.phone,
          setting.tax_percent,
          setting.receipt_footer,
          setting.updated_at,
        ],
        true
      );
    }

    await db.execute('COMMIT;');

    console.log(
      'Restore database berhasil.'
    );
  } catch (error) {
    await db.execute('ROLLBACK;');

    console.error(
      'Restore database gagal:',
      error
    );

    throw error;
  } finally {
    await db.execute('PRAGMA foreign_keys = ON;');
  }
}

export async function restoreDatabaseFromJson(
  jsonData: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Restore database hanya tersedia di Android.'
    );
  }

  const db = await getDatabase();

  let backup: any;

  try {
    backup = JSON.parse(jsonData);
  } catch {
    throw new Error(
      'File backup bukan JSON yang valid.'
    );
  }

  if (!backup || backup.version !== 1) {
    throw new Error(
      'Versi backup tidak didukung.'
    );
  }

  if (
    !Array.isArray(backup.categories) ||
    !Array.isArray(backup.menus) ||
    !Array.isArray(backup.orders) ||
    !Array.isArray(backup.orderItems) ||
    !Array.isArray(backup.payments) ||
    !Array.isArray(backup.settings)
  ) {
    throw new Error(
      'Struktur file backup tidak lengkap.'
    );
  }

  await db.execute(
    'PRAGMA foreign_keys = OFF;'
  );

  try {
    await db.execute(
      'BEGIN TRANSACTION;'
    );

    await db.execute(`
      DELETE FROM payments;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM menus;
      DELETE FROM categories;
      DELETE FROM settings;
    `);

    for (const category of backup.categories) {
      await db.run(
        `
          INSERT INTO categories (
            id,
            name,
            created_at
          )
          VALUES (?, ?, ?)
        `,
        [
          category.id,
          category.name,
          category.created_at,
        ],
        true
      );
    }

    for (const menu of backup.menus) {
      await db.run(
        `
          INSERT INTO menus (
            id,
            category_id,
            name,
            price,
            image_path,
            is_available,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          menu.id,
          menu.category_id,
          menu.name,
          menu.price,
          menu.image_path,
          menu.is_available,
          menu.created_at,
          menu.updated_at,
        ],
        true
      );
    }

    for (const order of backup.orders) {
      await db.run(
        `
          INSERT INTO orders (
            id,
            invoice_number,
            created_at,
            status,
            subtotal,
            total,
            cashier_name,
            table_number
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          order.id,
          order.invoice_number,
          order.created_at,
          order.status,
          order.subtotal,
          order.total,
          order.cashier_name,
          order.table_number,
        ],
        true
      );
    }

    for (const item of backup.orderItems) {
      await db.run(
        `
          INSERT INTO order_items (
            id,
            order_id,
            menu_id,
            menu_name,
            quantity,
            price,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          item.order_id,
          item.menu_id,
          item.menu_name,
          item.quantity,
          item.price,
          item.subtotal,
        ],
        true
      );
    }

    for (const payment of backup.payments) {
      await db.run(
        `
          INSERT INTO payments (
            id,
            order_id,
            amount_paid,
            change_amount,
            method,
            paid_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          payment.id,
          payment.order_id,
          payment.amount_paid,
          payment.change_amount,
          payment.method,
          payment.paid_at,
        ],
        true
      );
    }

    for (const setting of backup.settings) {
      await db.run(
        `
          INSERT INTO settings (
            id,
            business_name,
            tagline,
            address,
            phone,
            tax_percent,
            receipt_footer,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          setting.id,
          setting.business_name,
          setting.tagline,
          setting.address,
          setting.phone,
          setting.tax_percent,
          setting.receipt_footer,
          setting.updated_at,
        ],
        true
      );
    }

    await db.execute(
      'COMMIT;'
    );

    console.log(
      'Restore database berhasil.'
    );
  } catch (error) {
    await db.execute(
      'ROLLBACK;'
    );

    console.error(
      'Restore database gagal:',
      error
    );

    throw error;
  } finally {
    await db.execute(
      'PRAGMA foreign_keys = ON;'
    );
  }
}