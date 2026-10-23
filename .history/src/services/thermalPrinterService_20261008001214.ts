import { Capacitor } from '@capacitor/core';
import { BluetoothPrinter } from '@fedejm/capacitor-esc-pos-printer';

export interface ThermalPrinterDevice {
  name: string;
  address: string;
}

export async function getBluetoothPrinters(): Promise<ThermalPrinterDevice[]> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  try {
    const result = await BluetoothPrinter.getBluetoothPrinterDevices();

    return (result.devices ?? []).map((device: any) => ({
      name: device.name ?? 'Unknown Printer',
      address: device.address,
    }));
  } catch (error) {
    console.error('Gagal mengambil printer Bluetooth:', error);
    throw error;
  }
}

export async function enableBluetooth(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    await BluetoothPrinter.requestBluetoothEnable();
  } catch (error) {
    console.error('Gagal mengaktifkan Bluetooth:', error);
    throw error;
  }
}

export async function connectThermalPrinter(
  address: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const printer = new BluetoothPrinter({
      address,
    });

    await printer.connect();
  } catch (error) {
    console.error('Gagal menghubungkan printer:', error);
    throw error;
  }
}