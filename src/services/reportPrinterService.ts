import { Capacitor } from '@capacitor/core';

export async function printReportHtml(
  _html: string,
  _name = 'Laporan Penjualan'
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Cetak laporan native hanya tersedia di Android.'
    );
  }

  throw new Error(
    'Fitur cetak laporan native belum dikonfigurasi.'
  );
}

export async function printReportPdf(
  _path: string,
  _name = 'Laporan Penjualan'
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Cetak PDF native hanya tersedia di Android.'
    );
  }

  throw new Error(
    'Fitur cetak PDF native belum dikonfigurasi.'
  );
}