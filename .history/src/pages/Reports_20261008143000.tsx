import { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Directory,
  Encoding,
  Filesystem,
} from '@capacitor/filesystem';
import { generateSalesReportPdf } from '@/services/reportPdfService';
import { printReportHtml } from '@/services/reportPrinterService';
import {
  TrendingUp,
  Receipt,
  BarChart2,
  Download,
  Printer,
  Calendar,
  Award,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import {
  formatRupiah,
  formatDateTime,
  formatDateShort,
} from '@/utils/format';

import type { Order, PaymentMethod } from '@/types';

interface ReportsProps {
  orders: Order[];
}

type PeriodKey = '7d' | '30d' | 'custom';

type ReportRow = {
  receiptNumber: string;
  date: string;
  item: number;
  total: number;
  paymentMethod: string;
  status: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysBack(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function escapeCsv(value: string | number): string {
  const text = String(value);

  if (
    text.includes(';') ||
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function Reports({ orders }: ReportsProps) {
  const today = useMemo(() => new Date(), []);

  const [period, setPeriod] = useState<PeriodKey>('7d');

  const [paymentFilter, setPaymentFilter] = useState<
    PaymentMethod | 'semua'
  >('semua');

  const [dateFrom, setDateFrom] = useState(
    formatDateForInput(daysBack(6))
  );

  const [dateTo, setDateTo] = useState(
    formatDateForInput(today)
  );

  /*
   * ============================================================
   * PERIODE LAPORAN
   * ============================================================
   */

  const periodStart = useMemo(() => {
    if (period === '7d') {
      return startOfDay(daysBack(6));
    }

    if (period === '30d') {
      return startOfDay(daysBack(29));
    }

    if (dateFrom) {
      return startOfDay(new Date(`${dateFrom}T00:00:00`));
    }

    return startOfDay(daysBack(6));
  }, [period, dateFrom]);

  const periodEnd = useMemo(() => {
    if (period === '7d' || period === '30d') {
      return endOfDay(new Date());
    }

    if (dateTo) {
      return endOfDay(new Date(`${dateTo}T23:59:59`));
    }

    return endOfDay(new Date());
  }, [period, dateTo]);

  /*
   * ============================================================
   * VALIDASI TANGGAL
   * ============================================================
   */

  const invalidDateRange =
    period === 'custom' &&
    dateFrom &&
    dateTo &&
    new Date(`${dateFrom}T00:00:00`).getTime() >
      new Date(`${dateTo}T23:59:59`).getTime();

  /*
   * ============================================================
   * FILTER TRANSAKSI
   * Hanya transaksi LUNAS yang masuk laporan pendapatan.
   * ============================================================
   */

  const filteredOrders = useMemo(() => {
    if (invalidDateRange) {
      return [];
    }

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);

      const inRange =
        orderDate >= periodStart &&
        orderDate <= periodEnd;

      const isPaid = order.status === 'lunas';

      const matchPayment =
        paymentFilter === 'semua' ||
        order.paymentMethod === paymentFilter;

      return inRange && isPaid && matchPayment;
    });
  }, [
    orders,
    periodStart,
    periodEnd,
    paymentFilter,
    invalidDateRange,
  ]);

  /*
   * ============================================================
   * STATISTIK
   * ============================================================
   */

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce(
      (total, order) => total + order.total,
      0
    );
  }, [filteredOrders]);

  const totalTransactions = filteredOrders.length;

  const avgTransaction =
    totalTransactions > 0
      ? Math.round(totalRevenue / totalTransactions)
      : 0;

  /*
   * ============================================================
   * JUMLAH HARI UNTUK GRAFIK
   * ============================================================
   */

  const chartDays = useMemo(() => {
    if (invalidDateRange) {
      return [];
    }

    const result: Date[] = [];

    const current = new Date(periodStart);

    while (current <= periodEnd) {
      result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [periodStart, periodEnd, invalidDateRange]);

  /*
   * ============================================================
   * DATA GRAFIK PENDAPATAN
   * ============================================================
   */

  const chartData = useMemo(() => {
    return chartDays.map((date) => {
      const dayOrders = filteredOrders.filter((order) =>
        isSameDay(new Date(order.createdAt), date)
      );

      return {
        date: date.toISOString(),
        name: formatDateShort(date),
        pendapatan: dayOrders.reduce(
          (total, order) => total + order.total,
          0
        ),
        transaksi: dayOrders.length,
      };
    });
  }, [chartDays, filteredOrders]);

  /*
   * ============================================================
   * PRODUK TERLARIS
   * ============================================================
   */

  const productTotals = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        qty: number;
        revenue: number;
      }
    >();

    for (const order of filteredOrders) {
      for (const item of order.items) {
        const productId = String(item.product.id);

        const existing = map.get(productId);

        if (existing) {
          existing.qty += item.quantity;
          existing.revenue +=
            item.product.price * item.quantity;
        } else {
          map.set(productId, {
            id: productId,
            name: item.product.name,
            qty: item.quantity,
            revenue:
              item.product.price * item.quantity,
          });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [filteredOrders]);

  /*
   * ============================================================
   * RIWAYAT TRANSAKSI
   * ============================================================
   */

  const recentFiltered = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }, [filteredOrders]);

  const reportRows = useMemo<ReportRow[]>(() => {
    return recentFiltered.map((order) => ({
      receiptNumber: order.receiptNumber,
      date: formatDateTime(new Date(order.createdAt)),
      item: order.items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
      total: order.total,
      paymentMethod: order.paymentMethod ?? '-',
      status: order.status,
    }));
  }, [recentFiltered]);

  /*
   * ============================================================
   * EXPORT EXCEL / CSV
   * ============================================================
   */

  const handleExportExcel = () => {
    if (reportRows.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor.');
      return;
    }

    const header = [
      'Nomor Nota',
      'Tanggal',
      'Jumlah Item',
      'Total',
      'Metode Pembayaran',
      'Status',
    ];

    const csvRows = reportRows.map((row) => [
      escapeCsv(row.receiptNumber),
      escapeCsv(row.date),
      escapeCsv(row.item),
      escapeCsv(row.total),
      escapeCsv(row.paymentMethod.toUpperCase()),
      escapeCsv(row.status),
    ]);

    const csvContent = [
      header.join(';'),
      ...csvRows.map((row) => row.join(';')),
    ].join('\n');

    const blob = new Blob(
      [`\uFEFF${csvContent}`],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = `laporan-penjualan-${formatDateForInput(
      new Date()
    )}.csv`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /*
   * ============================================================
   * CETAK / PDF
   * ============================================================
   */

  const openPrintableReport = () => {
    if (reportRows.length === 0) {
      alert('Tidak ada data transaksi untuk dicetak.');
      return;
    }

    const rowsHtml = reportRows
      .map(
        (row) => `
          <tr>
            <td>${row.receiptNumber}</td>
            <td>${row.date}</td>
            <td style="text-align:center">${row.item}</td>
            <td style="text-align:right">Rp ${row.total.toLocaleString('id-ID')}</td>
            <td style="text-transform:uppercase">${row.paymentMethod}</td>
            <td>${row.status}</td>
          </tr>
        `
      )
      .join('');

    const reportWindow = window.open(
      '',
      '_blank',
      'width=1000,height=700'
    );

    if (!reportWindow) {
      alert(
        'Popup diblokir browser. Izinkan popup untuk mencetak laporan.'
      );
      return;
    }

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />

          <title>Laporan Penjualan</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: white;
            }

            .header {
              margin-bottom: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
            }

            .title {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 6px;
            }

            .subtitle {
              color: #6b7280;
              font-size: 13px;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }

            .summary-card {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 14px;
            }

            .summary-label {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 5px;
            }

            .summary-value {
              font-size: 18px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              background: #f3f4f6;
              text-align: left;
              font-weight: 700;
            }

            th,
            td {
              border: 1px solid #d1d5db;
              padding: 8px;
            }

            .footer {
              margin-top: 24px;
              font-size: 11px;
              color: #6b7280;
              text-align: right;
            }

            @media print {
              body {
                padding: 12mm;
              }

              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="title">
              Laporan Penjualan
            </div>

            <div class="subtitle">
              Periode: ${periodLabel}
              &nbsp; · &nbsp;
              Metode: ${
                paymentFilter === 'semua'
                  ? 'Semua Metode'
                  : paymentFilter.toUpperCase()
              }
            </div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">
                Total Pendapatan
              </div>

              <div class="summary-value">
                Rp ${totalRevenue.toLocaleString('id-ID')}
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-label">
                Jumlah Transaksi
              </div>

              <div class="summary-value">
                ${totalTransactions}
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-label">
                Rata-rata Transaksi
              </div>

              <div class="summary-value">
                Rp ${avgTransaction.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nomor Nota</th>
                <th>Tanggal</th>
                <th>Item</th>
                <th>Total</th>
                <th>Metode</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Dicetak pada ${formatDateTime(new Date())}
          </div>
        </body>
      </html>
    `);

    reportWindow.document.close();

    reportWindow.focus();

    setTimeout(() => {
      reportWindow.print();
    }, 300);
  };

  const buildReportHtml = () => {
    const rowsHtml = reportRows
      .map(
        (row) => `
          <tr>
            <td>${row.receiptNumber}</td>
            <td>${row.date}</td>
            <td style="text-align:center">${row.item}</td>
            <td style="text-align:right">
              ${formatRupiah(row.total)}
            </td>
            <td>${row.paymentMethod.toUpperCase()}</td>
            <td>${row.status.toUpperCase()}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>

      <html lang="id">

        <head>

          <meta charset="UTF-8" />

          <style>

            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111827;
              background: white;
            }

            h1 {
              margin: 0 0 5px;
              font-size: 22px;
            }

            .subtitle {
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 20px;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }

            .summary-card {
              border: 1px solid #d1d5db;
              padding: 12px;
              border-radius: 8px;
            }

            .summary-label {
              color: #6b7280;
              font-size: 10px;
            }

            .summary-value {
              margin-top: 5px;
              font-size: 16px;
              font-weight: bold;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
            }

            th,
            td {
              border: 1px solid #d1d5db;
              padding: 7px;
              text-align: left;
            }

            .footer {
              margin-top: 20px;
              color: #6b7280;
              font-size: 9px;
              text-align: right;
            }

          </style>

        </head>

        <body>

          <h1>Laporan Penjualan</h1>

          <div class="subtitle">
            Periode: ${periodLabel}
            &nbsp; | &nbsp;
            Metode: ${
              paymentFilter === 'semua'
                ? 'Semua Metode'
                : paymentFilter.toUpperCase()
            }
          </div>

          <div class="summary">

            <div class="summary-card">
              <div class="summary-label">
                Total Pendapatan
              </div>

              <div class="summary-value">
                ${formatRupiah(totalRevenue)}
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-label">
                Jumlah Transaksi
              </div>

              <div class="summary-value">
                ${totalTransactions}
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-label">
                Rata-rata Transaksi
              </div>

              <div class="summary-value">
                ${formatRupiah(avgTransaction)}
              </div>
            </div>

          </div>

          <table>

            <thead>

              <tr>
                <th>Nomor Nota</th>
                <th>Tanggal</th>
                <th>Item</th>
                <th>Total</th>
                <th>Metode</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>

          </table>

          <div class="footer">
            Dicetak pada:
            ${new Date().toLocaleString('id-ID')}
          </div>

        </body>

      </html>
    `;
  };

  const handlePrint = async () => {
    if (reportRows.length === 0) {
      alert('Tidak ada data transaksi untuk dicetak.');
      return;
    }

    try {
      if (Capacitor.getPlatform() !== 'android') {
        alert('Fitur cetak native hanya tersedia di Android.');
        return;
      }

      await printReportHtml(
        buildReportHtml(),
        `Laporan Penjualan - ${periodLabel}`
      );
    } catch (error) {
      console.error('Gagal membuka printer:', error);

      alert(
        'Gagal membuka layanan cetak Android.'
      );
    }
  };

  const handleExportPdf = async () => {
    if (reportRows.length === 0) {
      alert('Tidak ada data transaksi untuk dibuat PDF.');
      return;
    }

    try {
      if (Capacitor.getPlatform() !== 'android') {
        alert('Export PDF native hanya tersedia di Android.');
        return;
      }

      const uri = await generateSalesReportPdf({
        periodLabel,
        paymentLabel:
          paymentFilter === 'semua'
            ? 'Semua Metode'
            : paymentFilter.toUpperCase(),
        totalRevenue,
        totalTransactions,
        avgTransaction,
        rows: reportRows,
      });

      alert(
        `PDF berhasil dibuat.\n\nLokasi:\n${uri}`
      );
    } catch (error) {
      console.error(
        'Gagal membuat PDF:',
        error
      );

      alert(
        'Gagal membuat laporan PDF.'
      );
    }
  };

  /*
   * ============================================================
   * LABEL PERIODE
   * ============================================================
   */

  const periodLabel = useMemo(() => {
    if (period === '7d') {
      return '7 hari terakhir';
    }

    if (period === '30d') {
      return '30 hari terakhir';
    }

    if (dateFrom && dateTo) {
      return `${dateFrom} s.d. ${dateTo}`;
    }

    return 'Periode kustom';
  }, [period, dateFrom, dateTo]);

  return (
    <div className="min-h-full bg-background p-6 text-foreground">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Laporan Penjualan
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              Pantau pendapatan, transaksi, dan performa penjualan
            </p>
          </div>

          <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
            {periodLabel}
          </div>
        </div>

        {/* ======================================================
            FILTER
        ====================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex flex-wrap items-center gap-2">

            {/* Periode */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">

              {(['7d', '30d', 'custom'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`
                    rounded-md
                    px-3.5
                    py-2
                    text-xs
                    font-medium
                    transition-all
                    duration-200

                    ${
                      period === item
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }
                  `}
                >
                  {item === '7d'
                    ? '7 Hari'
                    : item === '30d'
                      ? '30 Hari'
                      : 'Kustom'}
                </button>
              ))}

            </div>

            {/* Custom date */}
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">

                <Calendar
                  size={15}
                  className="text-muted-foreground"
                />

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(event.target.value)
                  }
                  className="
                    rounded-md
                    border
                    border-border
                    bg-card
                    px-2.5
                    py-2
                    text-xs
                    text-foreground
                    outline-none
                    transition-all
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/20
                  "
                />

                <span className="text-xs text-muted-foreground">
                  s.d.
                </span>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(event.target.value)
                  }
                  className="
                    rounded-md
                    border
                    border-border
                    bg-card
                    px-2.5
                    py-2
                    text-xs
                    text-foreground
                    outline-none
                    transition-all
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/20
                  "
                />

              </div>
            )}

          </div>

          {/* Metode + Export */}
          <div className="flex flex-wrap items-center gap-2">

            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">

              {(['semua', 'tunai', 'qris'] as const).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      setPaymentFilter(method)
                    }
                    className={`
                      rounded-md
                      px-3
                      py-1.5
                      text-xs
                      font-medium
                      transition-all
                      duration-200

                      ${
                        paymentFilter === method
                          ? 'bg-secondary text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }
                    `}
                  >
                    {method === 'semua'
                      ? 'Semua Metode'
                      : method.toUpperCase()}
                  </button>
                )
              )}

            </div>

            <div className="flex flex-wrap items-center gap-2">

              {/* Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="
                  flex items-center gap-2
                  rounded-lg
                  border border-emerald-500/30
                  bg-emerald-500/10
                  px-3 py-2
                  text-xs font-semibold
                  text-emerald-400
                  transition-all
                  hover:bg-emerald-500/20
                "
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>

              {/* PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="
                  flex items-center gap-2
                  rounded-lg
                  border border-red-500/30
                  bg-red-500/10
                  px-3 py-2
                  text-xs font-semibold
                  text-red-400
                  transition-all
                  hover:bg-red-500/20
                "
              >
                <FileText size={14} />
                PDF
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="
                  flex items-center gap-2
                  rounded-lg
                  border border-border
                  bg-card
                  px-3 py-2
                  text-xs font-semibold
                  text-foreground
                  transition-all
                  hover:bg-secondary
                "
              >
                <Printer size={14} />
                Cetak
              </button>

            </div>
          </div>
        </div>

        {/* ======================================================
            INVALID DATE
        ====================================================== */}

        {invalidDateRange && (
          <div
            className="
              rounded-lg
              border
              border-red-500/30
              bg-red-500/10
              px-4
              py-3
              text-sm
              text-red-400
            "
          >
            Tanggal mulai tidak boleh lebih besar dari tanggal
            selesai.
          </div>
        )}

        {/* ======================================================
            INFO PERIODE
        ====================================================== */}

        {!invalidDateRange && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Menampilkan data untuk{' '}
              <span className="font-medium text-foreground">
                {periodLabel}
              </span>
              {' · '}
              hanya transaksi lunas
            </p>

            <p className="text-xs text-muted-foreground">
              {filteredOrders.length} transaksi
            </p>
          </div>
        )}

        {/* ======================================================
            STATISTICS
            ====================================================== */}

        <div className="grid grid-cols-3 gap-4">

          {/* Total Pendapatan */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Pendapatan
                </p>

                <p className="mt-2 truncate text-xl font-bold text-foreground">
                  {formatRupiah(totalRevenue)}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Dari transaksi lunas
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                <TrendingUp
                  size={18}
                  className="text-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Jumlah Transaksi */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Jumlah Transaksi
                </p>

                <p className="mt-2 text-xl font-bold text-foreground">
                  {totalTransactions}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Transaksi berhasil
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Receipt
                  size={18}
                  className="text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Rata-rata Transaksi */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Rata-rata Transaksi
                </p>

                <p className="mt-2 truncate text-xl font-bold text-foreground">
                  {formatRupiah(avgTransaction)}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Nilai rata-rata per transaksi
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                <BarChart2
                  size={18}
                  className="text-sky-400"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================
            CHARTS
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

          {/* Grafik pendapatan */}
          <div
            className="
              rounded-xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
              xl:col-span-2
            "
          >

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Grafik Pendapatan Harian
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  Pendapatan berdasarkan transaksi lunas
                </p>
              </div>

              <span
                className="
                  rounded-md
                  border
                  border-border
                  bg-secondary
                  px-2.5
                  py-1
                  text-[11px]
                  text-muted-foreground
                "
              >
                {periodLabel}
              </span>

            </div>

            {chartData.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Tidak ada data pada periode ini
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    bottom: 0,
                    left: 0,
                  }}
                >

                  <defs>
                    <linearGradient
                      id="rptGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.25}
                      />

                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.12)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    interval={
                      chartData.length > 15
                        ? Math.ceil(chartData.length / 8)
                        : 0
                    }
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      `${(Number(value) / 1000).toFixed(0)}k`
                    }
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatRupiah(Number(value)),
                      'Pendapatan',
                    ]}
                    labelFormatter={(label) =>
                      `Tanggal: ${label}`
                    }
                    contentStyle={{
                      borderRadius: 8,
                      border:
                        '1px solid rgba(148,163,184,0.2)',
                      backgroundColor: '#171c23',
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    labelStyle={{
                      color: '#94a3b8',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="pendapatan"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#rptGrad)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: '#6366f1',
                    }}
                  />

                </AreaChart>
              </ResponsiveContainer>
            )}

          </div>

          {/* Produk terlaris */}
          <div
            className="
              rounded-xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
            "
          >

            <div className="mb-4 flex items-center gap-2">

              <div
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-md
                  bg-amber-500/10
                "
              >
                <Award
                  size={15}
                  className="text-amber-400"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Produk Terlaris
                </h3>

                <p className="text-xs text-muted-foreground">
                  Berdasarkan jumlah terjual
                </p>
              </div>

            </div>

            {productTotals.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  Tidak ada data
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={productTotals.map((product) => ({
                    name: product.name,
                    qty: product.qty,
                  }))}
                  layout="vertical"
                  margin={{
                    top: 0,
                    right: 8,
                    bottom: 0,
                    left: 0,
                  }}
                >

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />

                  <Tooltip
                    formatter={(value) => [
                      value,
                      'Terjual',
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border:
                        '1px solid rgba(148,163,184,0.2)',
                      backgroundColor: '#171c23',
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                  />

                  <Bar
                    dataKey="qty"
                    fill="#6366f1"
                    radius={[0, 5, 5, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        {/* ======================================================
            RIWAYAT TRANSAKSI
        ====================================================== */}

        <div
          className="
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-card
            shadow-sm
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-border
              px-5
              py-4
            "
          >

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Riwayat Transaksi
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Transaksi yang berhasil dibayar
              </p>
            </div>

            <span
              className="
                rounded-md
                bg-secondary
                px-2.5
                py-1
                text-xs
                text-muted-foreground
              "
            >
              {recentFiltered.length} transaksi lunas
            </span>

          </div>

          {recentFiltered.length === 0 ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="text-center">

                <Receipt
                  size={36}
                  className="mx-auto mb-3 text-muted-foreground opacity-30"
                />

                <p className="text-sm text-muted-foreground">
                  Tidak ada transaksi pada periode ini
                </p>

              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b border-border">

                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Nomor Nota
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Tanggal
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-center
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Item
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-right
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Total
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Metode
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-left
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-muted-foreground
                      "
                    >
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-border">

                  {recentFiltered.map((order) => (
                    <tr
                      key={order.id}
                      className="
                        transition-colors
                        hover:bg-secondary/50
                      "
                    >

                      <td className="px-5 py-3.5">

                        <span
                          className="
                            font-mono-nums
                            text-xs
                            font-bold
                            text-primary
                          "
                        >
                          {order.receiptNumber}
                        </span>

                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {formatDateTime(
                          new Date(order.createdAt)
                        )}
                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-center
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {order.items.reduce(
                          (total, item) =>
                            total + item.quantity,
                          0
                        )}
                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-right
                          font-mono-nums
                          text-xs
                          font-bold
                          text-foreground
                        "
                      >
                        {formatRupiah(order.total)}
                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-xs
                          uppercase
                          text-muted-foreground
                        "
                      >
                        {order.paymentMethod ?? '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge
                          status={order.status}
                        />
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}