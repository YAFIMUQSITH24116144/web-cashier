import { backupDatabase } from './backupService';
import type { AppSettings } from '@/types';

const LAST_BACKUP_KEY = 'pos_resto_last_auto_backup';

export async function runAutoBackup(
  settings: AppSettings
): Promise<void> {
  // Backup otomatis tidak aktif
  if (!settings.autoBackup) {
    console.log(
      '[Auto Backup] Fitur backup otomatis tidak aktif.'
    );
    return;
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const lastBackup =
    localStorage.getItem(LAST_BACKUP_KEY);

  // Hari ini sudah pernah backup
  if (lastBackup === today) {
    console.log(
      '[Auto Backup] Backup hari ini sudah dilakukan.'
    );
    return;
  }

  try {
    console.log(
      '[Auto Backup] Memulai backup otomatis...'
    );

    const fileName =
      await backupDatabase();

    localStorage.setItem(
      LAST_BACKUP_KEY,
      today
    );

    console.log(
      `[Auto Backup] Backup berhasil: ${fileName}`
    );
  } catch (error) {
    console.error(
      '[Auto Backup] Backup gagal:',
      error
    );

    throw error;
  }
}