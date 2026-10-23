import { useState } from 'react';
import { saveSettingsToDatabase } from '@/services/settingsService';
import { backupDatabase, restoreDatabaseFromJson, } from '@/services/backupService';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import {
  Building2,
  Printer,
  Database,
  Info,
  Save,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { AppSettings, ToastMessage } from '@/types';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<
    React.SetStateAction<AppSettings>
  >;

  categories: Category[];

  setCategories: React.Dispatch<
    React.SetStateAction<Category[]>
  >;

  showToast: (
    message: string,
    type?: ToastMessage['type']
  ) => void;

  reloadDatabaseData: () => Promise<void>;
}

function Section({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon size={16} className="text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all';

export function Settings({
  settings,
  setSettings,
  showToast,
  reloadDatabaseData,
}: SettingsProps) {
  const [form, setForm] = useState(settings);
  const [dbStatus, setDbStatus] = useState<'idle' | 'backup' | 'restore'>('idle');

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await saveSettingsToDatabase(form);

      setSettings(form);

      showToast(
        'Pengaturan berhasil disimpan'
      );
    } catch (error) {
      console.error(
        'Gagal menyimpan pengaturan:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Database error: ${message}`,
        'error'
      );
    }
  };

  const handleBackup = async () => {
    if (dbStatus !== 'idle') {
      return;
    }

    setDbStatus('backup');

    try {
      const fileName = await backupDatabase();

      showToast(
        `Backup berhasil: ${fileName}`,
        'success'
      );
    } catch (error) {
      console.error(
        'Backup gagal:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Backup database gagal: ${message}`,
        'error'
      );
    } finally {
      setDbStatus('idle');
    }
  };

  const handleRestore = async () => {
    if (dbStatus !== 'idle') {
      return;
    }

    setDbStatus('restore');

    try {
      const result = await FilePicker.pickFiles({
        types: ['application/json'],
        multiple: false,
        readData: true,
      });

      if (!result.files.length) {
        return;
      }

      const file = result.files[0];

      if (!file.data) {
        throw new Error(
          'Data file backup tidak dapat dibaca.'
        );
      }

      // FilePicker mengembalikan Base64.
      // Decode terlebih dahulu menjadi UTF-8.
      const binaryString = atob(file.data);

      const bytes = Uint8Array.from(
        binaryString,
        (char) => char.charCodeAt(0)
      );

      const jsonData = new TextDecoder(
        'utf-8'
      ).decode(bytes);

      // Restore isi backup ke SQLite
      await restoreDatabaseFromJson(
        jsonData
      );

      // Reload seluruh data SQLite ke React
      await reloadDatabaseData();

      showToast(
        'Database berhasil direstore.',
        'success'
      );
    } catch (error) {
      console.error(
        'Restore gagal:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Restore database gagal: ${message}`,
        'error'
      );
    } finally {
      setDbStatus('idle');
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Business info */}
      <Section icon={Building2} title="Informasi Bisnis">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nama Bisnis">
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Tagline">
            <input
              type="text"
              value={form.businessTagline}
              onChange={(e) => update('businessTagline', e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Alamat">
              <textarea
                value={form.businessAddress}
                onChange={(e) => update('businessAddress', e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
          <Field label="Nomor Telepon">
            <input
              type="text"
              value={form.businessPhone}
              onChange={(e) => update('businessPhone', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Tarif Pajak (%)">
            <input
              type="number"
              min={0}
              max={100}
              value={form.taxRate}
              onChange={(e) => update('taxRate', parseFloat(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Receipt settings */}
      <Section icon={CheckCircle2} title="Pengaturan Nota">
        <div className="space-y-4">
          <Field label="Pesan Penutup di Nota" hint="Teks ini akan muncul di bagian bawah setiap struk">
            <textarea
              value={form.receiptFooter}
              onChange={(e) => update('receiptFooter', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Biaya Layanan (%)">
            <input
              type="number"
              min={0}
              max={100}
              value={form.serviceCharge}
              onChange={(e) => update('serviceCharge', parseFloat(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Printer settings */}
      <Section icon={Printer} title="Konfigurasi Printer">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nama Printer">
            <input
              type="text"
              value={form.printerName}
              onChange={(e) => update('printerName', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Ukuran Kertas" hint="Sesuaikan dengan thermal printer yang digunakan">
            <select
              value={form.paperSize}
              onChange={(e) => update('paperSize', e.target.value as AppSettings['paperSize'])}
              className={`${inputCls} bg-white`}
            >
              <option value="58mm">58 mm (Mini)</option>
              <option value="80mm">80 mm (Standar)</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Database */}
      <Section icon={Database} title="Manajemen Database Lokal">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">SQLite Database Aktif</p>
              <p className="text-xs text-green-600">Berjalan secara lokal · Tidak memerlukan koneksi internet</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <RefreshCw size={14} className="text-slate-400" />
            <label className="text-sm text-slate-700 flex-1">Backup otomatis setiap hari</label>
            <button
              type="button"
              onClick={() => update('autoBackup', !form.autoBackup)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.autoBackup ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.autoBackup ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBackup}
              disabled={dbStatus !== 'idle'}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {dbStatus === 'backup' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {dbStatus === 'backup' ? 'Memproses...' : 'Backup Database'}
            </button>
            <button
              onClick={handleRestore}
              disabled={dbStatus !== 'idle'}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {dbStatus === 'restore' ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              {dbStatus === 'restore' ? 'Memulihkan...' : 'Pulihkan Database'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Catatan: Pulihkan hanya dari file backup yang valid. Proses ini akan menimpa data saat ini.
          </p>
        </div>
      </Section>

      {/* App info */}
      <Section icon={Info} title="Informasi Aplikasi">
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          {[
            ['Nama Aplikasi', 'PoS Resto'],
            ['Versi', '1.0.0'],
            ['Platform', 'Android Capacitor'],
            ['Database', 'SQLite 3.x'],
            ['Frontend', 'React 19 + Tailwind CSS v4'],
            ['Mode Operasi', 'Offline (Lokal)'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-medium text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-2">
        <button
          onClick={() => setForm(settings)}
          className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Save size={14} />
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}
