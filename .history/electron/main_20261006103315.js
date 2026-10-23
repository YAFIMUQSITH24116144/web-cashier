import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ipcMain.handle('categories:get-all', () => {
  const db = initDatabase();

  return db
    .prepare('SELECT * FROM categories ORDER BY name ASC')
    .all();
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:8443');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('====================================');
  console.log('Electron berhasil dijalankan');
  console.log('====================================');

  console.log('User Data:', app.getPath('userData'));

  try {
    const db = initDatabase();

    console.log('====================================');
    console.log('DATABASE SQLITE BERHASIL');
    console.log('Lokasi:', db.name);
    console.log('====================================');
  } catch (error) {
    console.error('====================================');
    console.error('DATABASE SQLITE GAGAL');
    console.error(error);
    console.error('====================================');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});