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