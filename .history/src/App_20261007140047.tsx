import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Toast } from '@/components/ui/Toast';
import { Products } from '@/pages/Products';
import { Orders } from '@/pages/Orders';
import { Cashier } from '@/pages/Cashier';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { initialProducts, initialOrders, defaultSettings } from '@/data/mockData';
import { initializeAndroidDatabase } from './services/database';
import { loadOrdersFromDatabase } from './services/orderService';
import { loadProductsFromDatabase } from './services/productService';
import { loadCategoriesFromDatabase } from './services/categoryService';
import {
  loadSettingsFromDatabase,
} from './services/settingsService';
import type { PageName, Product, Order, AppSettings, ToastMessage } from '@/types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageName>('products');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'products':
        return <Products products={products} setProducts={setProducts} showToast={showToast} />;
      case 'orders':
        return <Orders products={products} addOrder={addOrder} showToast={showToast} />;
      case 'cashier':
        return <Cashier orders={orders} updateOrder={updateOrder} showToast={showToast} />;
      case 'reports':
        return <Reports orders={orders} />;
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} showToast={showToast} />;
    }
  };

  useEffect(() => {
    async function initializeApp() {
      try {
        await initializeAndroidDatabase();

        console.log(
          'Database Android siap.'
        );

        const savedOrders =
          await loadOrdersFromDatabase();

        if (savedOrders.length > 0) {
          setOrders(savedOrders);

          console.log(
            'Order berhasil dimuat dari SQLite:',
            savedOrders.length
          );
        }

        const savedProducts = await loadProductsFromDatabase();

        if (savedProducts.length > 0) {
          setProducts(savedProducts);
          console.log(
            'Produk berhasil dimuat dari SQLite:',
            savedProducts.length
          );
        } 

        const savedSettings =
          await loadSettingsFromDatabase();

        if (savedSettings) {
          setSettings(savedSettings);

          console.log(
            'Settings berhasil dimuat dari SQLite.'
          );
        }
      } catch (error) {
        console.error(
          'Gagal menginisialisasi aplikasi:',
          error
        );
      }
    }

    initializeApp();
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 font-sans">
      <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </MainLayout>

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
