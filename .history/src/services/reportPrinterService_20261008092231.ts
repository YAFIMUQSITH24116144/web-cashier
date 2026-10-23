import { Capacitor } from '@capacitor/core';
import { Printer } from '@capgo/capacitor-printer';

export async function printReportHtml(
  html: string,
  name = 'Laporan Penjualan'
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Cetak native hanya tersedia di Android.'
    );
  }

  await Printer.printHtml({
    name,
    html,
  });
}

export async function printReportPdf(
  path: string,
  name = 'Laporan Penjualan'
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Cetak PDF native hanya tersedia di Android.'
    );
  }

  await Printer.printPdf({
    name,
    path,
  });
}