export type PageName = 'products' | 'orders' | 'cashier' | 'reports' | 'settings';
export type OrderStatus = 'menunggu' | 'lunas' | 'batal';
export type PaymentMethod = 'tunai' | 'qris';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  available: boolean;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  receiptNumber: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  change?: number;
  createdAt: Date;
  paidAt?: Date;
  cashierName: string;
  tableNumber?: string;
}

export interface AppSettings {
  businessName: string;
  businessTagline: string;
  businessAddress: string;
  businessPhone: string;
  cashierName: string;
  taxRate: number;
  serviceCharge: number;
  receiptFooter: string;
  paperSize: '58mm' | '80mm';
  printerName: string;
  autoBackup: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
