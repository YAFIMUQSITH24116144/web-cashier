import { useState } from 'react';
import { saveSettingsToDatabase } from '@/services/settingsService';
import { backupDatabase, restoreDatabaseFromJson, } from '@/services/backupService';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import {
  saveCategoryToDatabase,
  deleteCategoryFromDatabase,
} from '@/services/categoryService';
import {
  saveEmployeeToDatabase,
  deleteEmployeeFromDatabase,
} from '@/services/employeeService';
import type { Employee } from '@/services/employeeService';
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
  Tags,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AppSettings, Category, ToastMessage } from '@/types';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<
    React.SetStateAction<AppSettings>
  >;

  categories: Category[];

  setCategories: React.Dispatch<
    React.SetStateAction<Category[]>
  >;

  employees: Employee[];

  setEmployees: React.Dispatch<
    React.SetStateAction<Employee[]>
  >;

  showToast: (
    message: string,
    type?: ToastMessage['type']
  ) => void;

  reloadDatabaseData: () => Promise<void>;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon size={17} className="text-primary" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {title}
          </h3>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground">
        {label}
      </label>

      {children}

      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputCls = `
  w-full
  rounded-lg
  border
  border-border
  bg-secondary
  px-3
  py-2.5
  text-sm
  text-foreground
  placeholder:text-muted-foreground
  outline-none
  transition-all
  duration-200
  focus:border-primary
  focus:ring-2
  focus:ring-primary/20
`;

export function Settings({
  settings,
  setSettings,
  categories,
  setCategories,
  employees,
  setEmployees,
  showToast,
  reloadDatabaseData,
}: SettingsProps) {
  const [form, setForm] = useState(settings);
  const [newCategory, setNewCategory] = useState('');
  const [newEmployee, setNewEmployee] = useState('');
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

  const handleAddCategory = async () => {
    const name = newCategory.trim();

    if (!name) {
      showToast(
        'Nama kategori wajib diisi',
        'error'
      );
      return;
    }

    const exists = categories.some(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      showToast(
        'Kategori sudah ada',
        'error'
      );
      return;
    }

    const category: Category = {
      id: `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Date.now()}`,
      name,
    };

    try {
      await saveCategoryToDatabase(category);

      setCategories((prev) =>
        [...prev, category].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewCategory('');

      showToast(
        'Kategori berhasil ditambahkan',
        'success'
      );
    } catch (error) {
      console.error(
        'Gagal menambahkan kategori:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Kategori gagal ditambahkan: ${message}`,
        'error'
      );
    }
  };

  const handleDeleteCategory = async (
    category: Category
  ) => {
    const confirmed = window.confirm(
      `Hapus kategori "${category.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCategoryFromDatabase(category.id);

      setCategories((prev) =>
        prev.filter(
          (item) => item.id !== category.id
        )
      );

      showToast(
        'Kategori berhasil dihapus',
        'success'
      );
    } catch (error) {
      console.error(
        'Gagal menghapus kategori:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Kategori gagal dihapus: ${message}`,
        'error'
      );
    }
  };

  const handleAddEmployee = async () => {
    const name = newEmployee.trim();

    if (!name) {
      showToast('Nama pegawai wajib diisi', 'error');
      return;
    }

    const exists = employees.some(
      (employee) =>
        employee.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      showToast('Pegawai sudah ada', 'error');
      return;
    }

    const employee: Employee = {
      id: `employee-${Date.now()}`,
      name,
    };

    try {
      await saveEmployeeToDatabase(employee);

      setEmployees((prev) =>
        [...prev, employee].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewEmployee('');

      showToast('Pegawai berhasil ditambahkan', 'success');
    } catch (error) {
      console.error(
        'Gagal menambahkan pegawai:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Pegawai gagal ditambahkan: ${message}`,
        'error'
      );
    }
  };

  const handleDeleteEmployee = async (
    employee: Employee
  ) => {
    const confirmed = window.confirm(
      `Hapus pegawai "${employee.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEmployeeFromDatabase(employee.id);

      setEmployees((prev) =>
        prev.filter(
          (item) => item.id !== employee.id
        )
      );

      // Jika pegawai yang dihapus sedang dipilih,
      // kembalikan pilihan ke kosong.
      if (form.cashierName === employee.name) {
        setForm((prev) => ({
          ...prev,
          cashierName: '',
        }));
      }

      showToast(
        'Pegawai berhasil dihapus',
        'success'
      );
    } catch (error) {
      console.error(
        'Gagal menghapus pegawai:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Pegawai gagal dihapus: ${message}`,
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
    <div className="min-h-full bg-background p-5 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
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

        <Section
          icon={Building2}
          title="Pegawai Kasir"
        >
          <div className="space-y-5">

            {/* Kasir yang sedang bertugas */}
            <Field
              label="Kasir yang Sedang Bertugas"
              hint="Nama ini akan digunakan pada transaksi dan nota."
            >
              <select
                value={form.cashierName}
                onChange={(e) =>
                  update('cashierName', e.target.value)
                }
                className={inputCls}
              >
                <option value="">
                  Pilih kasir
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.name}
                  >
                    {employee.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Tambah pegawai */}
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">
                Tambah Pegawai
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEmployee}
                  onChange={(e) =>
                    setNewEmployee(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleAddEmployee();
                    }
                  }}
                  placeholder="Nama pegawai"
                  className={inputCls}
                />

                <button
                  type="button"
                  onClick={() =>
                    void handleAddEmployee()
                  }
                  className="
                    flex shrink-0 items-center gap-2
                    rounded-lg bg-primary px-4 py-2.5
                    text-sm font-semibold
                    text-primary-foreground
                    transition-all
                    hover:bg-primary/90
                    hover:shadow-md
                    active:scale-[0.98]
                  "
                >
                  <Plus size={14} />
                  Tambah
                </button>
              </div>
            </div>

            {/* Daftar pegawai */}
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">
                Daftar Pegawai
              </p>

              <div className="overflow-hidden rounded-lg border border-border">
                {employees.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-slate-400">
                      Belum ada pegawai.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="
                          flex items-center justify-between
                          px-4 py-3
                          transition-colors
                          hover:bg-secondary/60
                        "
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {employee.name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteEmployee(employee)
                          }
                          className="
                            rounded-lg p-2
                            text-muted-foreground
                            transition-colors
                            hover:bg-red-500/10
                            hover:text-red-400
                          "
                          title="Hapus pegawai"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </Section>

        {/* Category management */}
        <Section
          icon={Tags}
          title="Manajemen Kategori"
        >
          <div className="space-y-4">

            {/* Add category */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleAddCategory();
                  }
                }}
                placeholder="Contoh: Makanan, Minuman, Snack"
                className={inputCls}
              />

              <button
                type="button"
                onClick={() => void handleAddCategory()}
                className="
                  flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-lg
                  bg-primary
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-primary-foreground
                  transition-all
                  hover:bg-primary/90
                  hover:shadow-md
                  active:scale-[0.98]
                "
              >
                <Plus size={14} />
                Tambah
              </button>
            </div>

            {/* Category list */}
            <div className="overflow-hidden rounded-lg border border-border">

              {categories.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-slate-400">
                    Belum ada kategori.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="
                        flex
                        items-center
                        justify-between
                        px-4
                        py-3
                        transition-colors
                        hover:bg-secondary/60
                      "
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {category.name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteCategory(category)
                        }
                        className="
                          rounded-lg
                          p-2
                          text-muted-foreground
                          transition-colors
                          hover:bg-red-500/10
                          hover:text-red-400
                        "
                        title="Hapus kategori"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>

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
                className={inputCls}
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
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                form.autoBackup
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-amber-500/20 bg-amber-500/10'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  form.autoBackup
                    ? 'bg-emerald-500/15'
                    : 'bg-amber-500/15'
                }`}
              >
                <Database
                  size={15}
                  className={
                    form.autoBackup
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    form.autoBackup
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {form.autoBackup
                    ? 'SQLite Database & Auto Backup Aktif'
                    : 'SQLite Database Aktif — Auto Backup Mati'}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.autoBackup
                    ? 'Data tersimpan secara lokal dan backup otomatis akan dibuat saat aplikasi dibuka.'
                    : 'Data tersimpan secara lokal, tetapi backup otomatis sedang dinonaktifkan.'}
                </p>
              </div>

              <div
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  form.autoBackup
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    form.autoBackup
                      ? 'animate-pulse bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />

                {form.autoBackup ? 'Backup Aktif' : 'Backup Mati'}
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <RefreshCw size={14} className="text-slate-400" />
              <label className="text-sm text-slate-700 flex-1">Backup otomatis setiap hari</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.autoBackup}
                aria-label="Backup otomatis"
                onClick={() => update('autoBackup', !form.autoBackup)}
                className={`
                  relative
                  h-6
                  w-11
                  shrink-0
                  rounded-full
                  border
                  transition-all
                  duration-200
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/30
                  ${
                    form.autoBackup
                      ? 'border-primary bg-primary'
                      : 'border-border bg-secondary'
                  }
                `}
              >
                <span
                  className={`
                    absolute
                    left-0.5
                    top-0.5
                    h-5
                    w-5
                    rounded-full
                    bg-white
                    shadow-sm
                    transition-transform
                    duration-200
                    ${
                      form.autoBackup
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }
                  `}
                />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleBackup}
                disabled={dbStatus !== 'idle'}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-primary
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-primary-foreground
                  transition-all
                  hover:bg-primary/90
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {dbStatus === 'backup' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}

                {dbStatus === 'backup'
                  ? 'Memproses...'
                  : 'Backup Data'}
              </button>

              <button
                onClick={handleRestore}
                disabled={dbStatus !== 'idle'}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-border
                  bg-secondary
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-foreground
                  transition-all
                  hover:bg-accent
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {dbStatus === 'restore' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}

                {dbStatus === 'restore'
                  ? 'Memulihkan...'
                  : 'Pulihkan Data'}
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
                <p className="font-medium text-slate-400 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Save */}
        <div className="flex justify-end gap-3 border-t border-border pt-5 pb-2">
          <button
            onClick={() => setForm(settings)}
            className="
              rounded-lg
              border
              border-border
              bg-secondary
              px-5
              py-2.5
              text-sm
              font-semibold
              text-foreground
              transition-all
              hover:bg-accent
            "
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="
              flex
              items-center
              gap-2
              rounded-lg
              bg-primary
              px-5
              py-2.5
              text-sm
              font-semibold
              text-primary-foreground
              transition-all
              hover:bg-primary/90
              hover:shadow-md
              active:scale-[0.98]
            "
          >
            <Save size={14} />
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
