import { useState, useCallback, useEffect } from 'react';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Toast } from '@/components/ui/Toast';

import { Products } from '@/pages/Products';
import { Orders } from '@/pages/Orders';
import { Cashier } from '@/pages/Cashier';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';

import { initializeAndroidDatabase } from './services/database';
import { loadOrdersFromDatabase } from './services/orderService';
import { loadProductsFromDatabase } from './services/productService';
import { loadCategoriesFromDatabase } from './services/categoryService';
import { loadSettingsFromDatabase } from './services/settingsService';
import { runAutoBackup } from './services/autoBackupService';
import { loadEmployeesFromDatabase } from './services/employeeService';

import type {
  PageName,
  Product,
  Order,
  AppSettings,
  Category,
  ToastMessage,
} from '@/types';

import type { Employee } from './services/employeeService';

const defaultSettings: AppSettings = {
  businessName: 'Warung Nusantara',
  businesstagline: 'Cita Rasa Nusantara Terbaik',
  address: '',
  phone: '',
  cashierName: 'Kasir',
  taxPercent: 0,
  receiptFooter:
    'Terima kasih atas kunjungan Anda!\nSampai jumpa kembali.',
  autoBackup: false,
};

export default function App() {
  const [currentPage, setCurrentPage] =
    useState<PageName>('products');

  const [products, setProducts] =
    useState<Product[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [settings, setSettings] =
    useState<AppSettings>(defaultSettings);

  const [toasts, setToasts] =
    useState<ToastMessage[]>([]);

  const [categories, setCategories] = 
    useState<Category[]>([]);

  const [employees, setEmployees] = 
    useState<Employee[]>([]);

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = useCallback(
    (
      message: string,
      type: ToastMessage['type'] = 'success'
    ) => {
      const id = Date.now().toString();

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
        },
      ]);

      setTimeout(() => {
        setToasts((prev) =>
          prev.filter((toast) => toast.id !== id)
        );
      }, 3500);
    },
    []
  );

  // =========================================================
  // ORDER STATE
  // =========================================================

  const addOrder = useCallback(
    (order: Order) => {
      setOrders((prev) => [
        order,
        ...prev,
      ]);
    },
    []
  );

  const updateOrder = useCallback(
    (
      orderId: string,
      updates: Partial<Order>
    ) => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                ...updates,
              }
            : order
        )
      );
    },
    []
  );

  // =========================================================
  // RELOAD DATABASE
  // Digunakan setelah Restore
  // =========================================================

  const reloadDatabaseData =
    useCallback(async () => {
      try {
        console.log(
          'Memuat ulang data dari SQLite...'
        );

        const [
          savedOrders,
          savedCategories,
          savedProducts,
          savedSettings,
          loadedEmployees,
        ] = await Promise.all([
          loadOrdersFromDatabase(),
          loadCategoriesFromDatabase(),
          loadEmployeesFromDatabase(),
          loadProductsFromDatabase(),
          loadSettingsFromDatabase(),
        ]);


        setOrders(savedOrders);
        setProducts(savedProducts);
        setCategories(savedCategories);
        setEmployees(savedEmployees);
        if (savedSettings) {
          setSettings(savedSettings);
        } else {
          setSettings(defaultSettings);
        }

        console.log(
          'Data berhasil direload dari SQLite:',
          JSON.stringify(
            {
              products: savedProducts.length,
              orders: savedOrders.length,
              settings: Boolean(savedSettings),
            },
            null,
            2
          )
        );
      } catch (error) {
        console.error(
          'Gagal reload data dari SQLite:',
          error
        );

        throw error;
      }
    }, []);

  // =========================================================
  // INITIALIZE DATABASE
  // =========================================================

  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('[APP INIT] initializeApp() dimulai.');

        console.log(
          '[APP INIT] Sebelum initializeAndroidDatabase()'
        );

        await initializeAndroidDatabase();

        console.log(
          '[APP INIT] Setelah initializeAndroidDatabase()'
        );

        console.log(
          'Database Android siap.'
        );

        // -----------------------------------------------------
        // Categories
        // -----------------------------------------------------

        const savedCategories =
          await loadCategoriesFromDatabase();

        setCategories(savedCategories);

        console.log(
          'Kategori berhasil dimuat dari SQLite:',
          JSON.stringify(
            savedCategories,
            null,
            2
          )
        );

        // -----------------------------------------------------
        // Orders
        // -----------------------------------------------------

        const savedOrders =
          await loadOrdersFromDatabase();

        setOrders(savedOrders);

        console.log(
          'Order berhasil dimuat dari SQLite:',
          savedOrders.length
        );

        // -----------------------------------------------------
        // Products
        // -----------------------------------------------------

        const savedProducts =
          await loadProductsFromDatabase();

        setProducts(savedProducts);

        console.log(
          'Produk berhasil dimuat dari SQLite:',
          savedProducts.length
        );

        console.log(
          'Produk dari SQLite:',
          JSON.stringify(
            savedProducts.map(
              (product) => ({
                id: product.id,
                name: product.name,
                category:
                  product.category,
                price: product.price,
              })
            ),
            null,
            2
          )
        );

        // -----------------------------------------------------
        // Settings
        // -----------------------------------------------------

        const savedSettings =
          await loadSettingsFromDatabase();

        const loadedSettings =
          savedSettings ?? defaultSettings;

        setSettings(loadedSettings);

        if (savedSettings) {
          console.log(
            'Settings berhasil dimuat dari SQLite.'
          );
        } else {
          console.log(
            'Settings SQLite belum tersedia, menggunakan default settings.'
          );
        }

        // -----------------------------------------------------
        // Auto Backup
        // -----------------------------------------------------

        console.log(
          '[Auto Backup] Memeriksa pengaturan backup:',
          loadedSettings.autoBackup
        );

        console.log(
          '[Auto Backup] Akan menjalankan runAutoBackup...'
        );

        try {
          await runAutoBackup(loadedSettings);

          console.log(
            '[Auto Backup] runAutoBackup selesai.'
          );
        } catch (error) {
          console.error(
            '[Auto Backup] ERROR:',
            error
          );
        }

      } catch (error) {
        console.error(
          'Gagal menginisialisasi aplikasi:',
          error
        );

        showToast(
          'Gagal memuat database aplikasi.',
          'error'
        );
      }
    }

    initializeApp();
  }, [showToast]);

  // =========================================================
  // PAGE RENDERER
  // =========================================================

  const renderPage = () => {
    switch (currentPage) {
      case 'products':
        return (
          <Products
            products={products}
            categories={categories}
            setProducts={setProducts}
            showToast={showToast}
          />
        );

      case 'orders':
        return (
          <Orders
            products={products}
            categories={categories}
            addOrder={addOrder}
            showToast={showToast}
          />
        );

      case 'cashier':
        return (
          <Cashier
            orders={orders}
            updateOrder={updateOrder}
            showToast={showToast}
          />
        );

      case 'reports':
        return (
          <Reports
            orders={orders}
          />
        );

      case 'settings':
        return (
          <Settings
            settings={settings}
            categories={categories}
            employees={employees}
            setEmployees={setEmployees}
            setCategories={setCategories}
            setSettings={setSettings}
            showToast={showToast}
            reloadDatabaseData={
              reloadDatabaseData
            }
          />
        );

      default:
        return (
          <Products
            products={products}
            setProducts={setProducts}
            showToast={showToast}
            categories={categories}
          />
        );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 font-sans">
      <MainLayout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        settings={settings}
      >
        {renderPage()}
      </MainLayout>

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
          />
        ))}
      </div>
    </div>
  );
}