import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Toast } from '@/components/ui/Toast';
import { Products } from '@/pages/Products';
import { Orders } from '@/pages/Orders';
import { Cashier } from '@/pages/Cashier';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { initialProducts, initialOrders, defaultSettings } from '@/data/mockData';
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
