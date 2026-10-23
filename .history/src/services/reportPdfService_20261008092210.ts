import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PdfReportRow {
  receiptNumber: string;
  date: string;
  item: number;
  total: number;
  paymentMethod: string;
  status: string;
}

export interface PdfReportData {
  periodLabel: string;
  paymentLabel: string;
  totalRevenue: number;
  totalTransactions: number;
  avgTransaction: number;
  rows: PdfReportRow[];
}

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatPdfText(
  text: string,
  maxLength: number
): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength - 3)}...`;
}

export async function generateSalesReportPdf(
  report: PdfReportData
): Promise<string> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Export PDF native hanya tersedia di Android.'
    );
  }

  const pdfDoc = await PDFDocument.create();

  const regularFont =
    await pdfDoc.embedFont(StandardFonts.Helvetica);

  const boldFont =
    await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([842, 595]);

  const { width, height } = page.getSize();

  let y = height - 40;

  const margin = 32;

  // =========================================================
  // HEADER
  // =========================================================

  page.drawText(
    'LAPORAN PENJUALAN',
    {
      x: margin,
      y,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    }
  );

  y -= 24;

  page.drawText(
    `Periode: ${report.periodLabel}`,
    {
      x: margin,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35),
    }
  );

  page.drawText(
    `Metode: ${report.paymentLabel}`,
    {
      x: 300,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35),
    }
  );

  y -= 30;

  // =========================================================
  // SUMMARY
  // =========================================================

  const summaryWidth = (width - margin * 2 - 20) / 3;

  const summaryItems = [
    {
      label: 'Total Pendapatan',
      value: formatRupiah(report.totalRevenue),
    },
    {
      label: 'Jumlah Transaksi',
      value: String(report.totalTransactions),
    },
    {
      label: 'Rata-rata Transaksi',
      value: formatRupiah(report.avgTransaction),
    },
  ];

  summaryItems.forEach((item, index) => {
    const x =
      margin + index * (summaryWidth + 10);

    page.drawRectangle({
      x,
      y: y - 52,
      width: summaryWidth,
      height: 52,
      borderWidth: 1,
      borderColor: rgb(0.82, 0.82, 0.82),
      color: rgb(0.97, 0.97, 0.97),
    });

    page.drawText(item.label, {
      x: x + 10,
      y: y - 18,
      size: 8,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(item.value, {
      x: x + 10,
      y: y - 38,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
  });

  y -= 75;

  // =========================================================
  // TABLE
  // =========================================================

  const columns = [
    {
      title: 'Nomor Nota',
      x: margin,
      width: 120,
    },
    {
      title: 'Tanggal',
      x: margin + 120,
      width: 155,
    },
    {
      title: 'Item',
      x: margin + 275,
      width: 55,
    },
    {
      title: 'Total',
      x: margin + 330,
      width: 125,
    },
    {
      title: 'Metode',
      x: margin + 455,
      width: 95,
    },
    {
      title: 'Status',
      x: margin + 550,
      width: 100,
    },
  ];

  const tableHeight = 22;

  // Header tabel
  page.drawRectangle({
    x: margin,
    y: y - tableHeight + 4,
    width: width - margin * 2,
    height: tableHeight,
    color: rgb(0.93, 0.94, 0.96),
  });

  columns.forEach((column) => {
    page.drawText(column.title, {
      x: column.x + 5,
      y: y - 11,
      size: 8,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  y -= tableHeight;

  // =========================================================
  // TABLE ROWS
  // =========================================================

  for (const row of report.rows) {
    if (y < 45) {
      page = pdfDoc.addPage([842, 595]);
      y = height - 40;

      page.drawText(
        'Laporan Penjualan - Lanjutan',
        {
          x: margin,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        }
      );

      y -= 25;

      page.drawRectangle({
        x: margin,
        y: y - tableHeight + 4,
        width: width - margin * 2,
        height: tableHeight,
        color: rgb(0.93, 0.94, 0.96),
      });

      columns.forEach((column) => {
        page.drawText(column.title, {
          x: column.x + 5,
          y: y - 11,
          size: 8,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
      });

      y -= tableHeight;
    }

    page.drawLine({
      start: {
        x: margin,
        y: y + 3,
      },
      end: {
        x: width - margin,
        y: y + 3,
      },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText(
      formatPdfText(row.receiptNumber, 18),
      {
        x: columns[0].x + 5,
        y: y - 11,
        size: 7.5,
        font: regularFont,
      }
    );

    page.drawText(
      formatPdfText(row.date, 24),
      {
        x: columns[1].x + 5,
        y: y - 11,
        size: 7.5,
        font: regularFont,
      }
    );

    page.drawText(String(row.item), {
      x: columns[2].x + 15,
      y: y - 11,
      size: 7.5,
      font: regularFont,
    });

    page.drawText(
      formatRupiah(row.total),
      {
        x: columns[3].x + 5,
        y: y - 11,
        size: 7.5,
        font: regularFont,
      }
    );

    page.drawText(
      row.paymentMethod.toUpperCase(),
      {
        x: columns[4].x + 5,
        y: y - 11,
        size: 7.5,
        font: regularFont,
      }
    );

    page.drawText(
      row.status.toUpperCase(),
      {
        x: columns[5].x + 5,
        y: y - 11,
        size: 7.5,
        font: regularFont,
      }
    );

    y -= tableHeight;
  }

  // =========================================================
  // FOOTER
  // =========================================================

  page.drawText(
    `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    {
      x: margin,
      y: 18,
      size: 7,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    }
  );

  const pdfBytes = await pdfDoc.save();

  let binary = '';

  for (let i = 0; i < pdfBytes.length; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }

  const base64 = btoa(binary);

  const fileName =
    `laporan-penjualan-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  return result.uri;
}