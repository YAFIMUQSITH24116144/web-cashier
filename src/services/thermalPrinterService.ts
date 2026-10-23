import { Capacitor } from '@capacitor/core';
import {
  EscPosPrinter,
  BluetoothPrinter,
} from '@fedejm/capacitor-esc-pos-printer';

export interface ThermalPrinterDevice {
  name: string;
  address: string;
  bondState: number;
  type: number;
}

let activePrinter: BluetoothPrinter | null = null;

export async function enableBluetooth(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return false;
  }

  const result = await EscPosPrinter.requestBluetoothEnable();

  return result.value;
}

export async function getBluetoothPrinters(): Promise<
  ThermalPrinterDevice[]
> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  const result =
    await EscPosPrinter.getBluetoothPrinterDevices();

  return result.devices.map((device) => ({
    name: device.name || device.alias || 'Bluetooth Printer',
    address: device.address,
    bondState: device.bondState,
    type: device.type,
  }));
}

export async function connectThermalPrinter(
  address: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error(
      'Printer thermal hanya tersedia di Android.'
    );
  }

  // Jika ada koneksi sebelumnya, bersihkan terlebih dahulu.
  if (activePrinter) {
    try {
      await activePrinter.disconnect();
      await activePrinter.dispose();
    } catch {
      // Abaikan error saat membersihkan koneksi lama.
    }

    activePrinter = null;
  }

  const printer = new BluetoothPrinter(address);

  await printer.link();
  await printer.connect();

  activePrinter = printer;
}

export async function disconnectThermalPrinter(): Promise<void> {
  if (!activePrinter) {
    return;
  }

  try {
    await activePrinter.disconnect();
  } finally {
    await activePrinter.dispose();
    activePrinter = null;
  }
}

export async function printRaw(
  data: number[]
): Promise<void> {
  if (!activePrinter) {
    throw new Error(
      'Printer belum terhubung.'
    );
  }

  await activePrinter.send(data);
}