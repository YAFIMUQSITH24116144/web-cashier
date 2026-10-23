import Database from 'better-sqlite3';
import path from 'path';

let db;

export function initDatabase() {
  const dbPath = path.join(
    app.getPath('userData'),
    'kasir.db'
  );

  console.log('Database:', dbPath);

  db = new Database(dbPath);

  // Mengaktifkan foreign key
  db.pragma('foreign_keys = ON');

  // Membuat tabel database
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
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

      total INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      order_id INTEGER NOT NULL,
      menu_id INTEGER,

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

      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Membuat data setting awal
  const setting = db
    .prepare('SELECT id FROM settings WHERE id = 1')
    .get();

  if (!setting) {
    db.prepare(`
      INSERT INTO settings (
        id,
        business_name,
        tagline,
        address,
        phone,
        tax_percent,
        receipt_footer
      )
      VALUES (
        1,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `).run(
      'Warung Nusantara',
      'Cita Rasa Nusantara Terbaik',
      '',
      '',
      0,
      'Terima kasih atas kunjungan Anda!\nSampai jumpa kembali.'
    );
  }

  console.log('SQLite database berhasil diinisialisasi.');

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error(
      'Database belum diinisialisasi. Jalankan initDatabase() terlebih dahulu.'
    );
  }

  return db;
}