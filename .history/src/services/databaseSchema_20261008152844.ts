import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export async function initializeDatabase(
  db: SQLiteDBConnection
) {
  await db.execute(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      image_path TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'UNPAID'
        CHECK (
          status IN (
            'UNPAID',
            'PAID',
            'CANCELLED'
          )
        ),
      subtotal INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      cashier_name TEXT NOT NULL DEFAULT '',
      table_number TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      order_id INTEGER NOT NULL,
      menu_id TEXT,

      menu_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0,

      FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

      FOREIGN KEY (menu_id)
        REFERENCES menus(id)
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      order_id INTEGER NOT NULL UNIQUE,

      amount_paid INTEGER NOT NULL DEFAULT 0,
      change_amount INTEGER NOT NULL DEFAULT 0,

      method TEXT NOT NULL
        CHECK (
          method IN (
            'tunai',
            'qris'
          )
        ),

      paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),

      business_name TEXT NOT NULL DEFAULT 'Warung Nusantara',
      tagline TEXT NOT NULL DEFAULT 'Cita Rasa Nusantara Terbaik',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',

      tax_percent REAL NOT NULL DEFAULT 0,

      receipt_footer TEXT NOT NULL DEFAULT
        'Terima kasih atas kunjungan Anda!\\nSampai jumpa kembali.',

      cashier_name TEXT NOT NULL DEFAULT 'Kasir',

      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await addColumnIfNotExists(
    db,
    'orders',
    'subtotal',
    'INTEGER NOT NULL DEFAULT 0'
  );

  await addColumnIfNotExists(
    db,
    'orders',
    'cashier_name',
    "TEXT NOT NULL DEFAULT ''"
  );

  await addColumnIfNotExists(
    db,
    'orders',
    'table_number',
    'TEXT'
  );

  // =========================================================
  // MIGRATION ORDERS
  // =========================================================

  async function addColumnIfNotExists(
    db: SQLiteDBConnection,
    tableName: string,
    columnName: string,
    columnDefinition: string
  ) {
    const result = await db.query(`PRAGMA table_info(${tableName})`);
    const columns = result.values ?? [];

    const exists = columns.some(
      (column) => column.name === columnName
    );

    if (!exists) {
      await db.execute(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${columnDefinition}
      `);

      console.log(
        `Kolom ${columnName} berhasil ditambahkan ke ${tableName}.`
      );
    }
  }

  // =========================================================
  // SEED SETTINGS
  // =========================================================

  const setting = await db.query(
    `
      SELECT id
      FROM settings
      WHERE id = 1
    `
  );

  if (
    !setting.values ||
    setting.values.length === 0
  ) {
    await db.run(
      `
        INSERT INTO settings (
          id,
          business_name,
          tagline,
          address,
          phone,
          tax_percent,
          receipt_footer
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        1,
        'Warung Nusantara',
        'Cita Rasa Nusantara Terbaik',
        '',
        '',
        0,
        'Terima kasih atas kunjungan Anda!\nSampai jumpa kembali.',
      ],
      true
    );
  }

  console.log(
    'Android SQLite database berhasil diinisialisasi.'
  );
}