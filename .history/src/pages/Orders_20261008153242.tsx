import { useState } from 'react';
import { Search, Plus, Minus, X, ShoppingCart, CheckCircle2, Printer, ChevronRight, ImageOff } from 'lucide-react';
import { formatRupiah, generateReceiptNumber, generateId } from '@/utils/format';
import type {
  Product,
  Order,
  OrderItem,
  ToastMessage,
  Category,
  AppSettings,
} from '@/types';
import { saveOrderToDatabase } from '@/services/orderService';

interface OrdersProps {
  products: Product[];
  categories: Category[];
  addOrder: (order: Order) => void;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

export function Orders({ products, categories, addOrder, showToast }: OrdersProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);

  const availableProducts = products.filter((p) => p.available);
  const filtered = availableProducts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'all' || p.category === selectedCat;
    return matchSearch && matchCat;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartQty = (productId: string) => cart.find((i) => i.product.id === productId)?.quantity ?? 0;

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      showToast(
        'Keranjang masih kosong',
        'error'
      );
      return;
    }

    const order: Order = {
      id: generateId(),
      receiptNumber: generateReceiptNumber(),
      items: cart,
      subtotal,
      total: subtotal,
      status: 'menunggu',
      createdAt: new Date(),
      cashierName: 'Siti Rahma',
      tableNumber:
        tableNumber || undefined,
    };

    console.log(
      'ORDER BARU:',
      order
    );

    console.log(
      'INVOICE BARU:',
      order.receiptNumber
    );

    try {
      // Simpan ke SQLite terlebih dahulu
      await saveOrderToDatabase(order);

      // Jika database berhasil, baru update React state
      addOrder(order);

      setSavedOrder(order);
      setCart([]);
      setTableNumber('');

      showToast(
        `Pesanan ${order.receiptNumber} berhasil disimpan`
      );
    } catch (error) {
      console.error(
        'Gagal menyimpan order:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      showToast(
        `Gagal menyimpan pesanan: ${errorMessage}`,
        'error'
      );
    }
  };

  const handleNewOrder = () => {
    setSavedOrder(null);
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  // Success state
  if (savedOrder) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          className="
            w-full
            max-w-md
            rounded-xl
            border
            border-border
            bg-card
            p-8
            text-center
            shadow-lg
          "
        >
          {/* Success Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2
              size={32}
              className="text-primary"
            />
          </div>

          {/* Title */}
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Pesanan Berhasil Dibuat
          </h2>

          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Pesanan telah disimpan dan menunggu proses pembayaran oleh kasir.
          </p>

          {/* Order Information */}
          <div className="mb-6 rounded-lg border border-border bg-secondary p-4 text-left">
            
            {/* Invoice */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-medium text-muted-foreground">
                Nomor Nota
              </span>

              <span className="font-mono text-sm font-bold text-primary">
                {savedOrder.receiptNumber}
              </span>
            </div>

            {/* Table */}
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">
                Nomor Meja
              </span>

              <span className="text-sm font-semibold text-foreground">
                {savedOrder.tableNumber || '-'}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2 py-3">
              {savedOrder.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="text-xs text-muted-foreground">
                    {item.product.name} × {item.quantity}
                  </span>

                  <span className="shrink-0 font-mono text-xs font-medium text-foreground">
                    {formatRupiah(
                      item.product.price * item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">
                Total Pesanan
              </span>

              <span className="font-mono text-base font-bold text-primary">
                {formatRupiah(savedOrder.total)}
              </span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6 rounded-lg bg-primary/5 px-4 py-3 text-left">
            <p className="text-xs font-semibold text-foreground">
              Langkah berikutnya
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Silakan lanjutkan ke halaman{' '}
              <span className="font-semibold text-foreground">
                Kasir & Pembayaran
              </span>{' '}
              untuk memproses pembayaran pelanggan.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                showToast(
                  'Printer thermal belum terhubung',
                  'error'
                );
              }}
              className="
                flex-1
                flex
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-border
                bg-secondary
                px-4
                py-2.5
                text-sm
                font-medium
                text-foreground
                transition-colors
                hover:bg-accent
              "
            >
              <Printer size={14} />
              Cetak Nota
            </button>

            <button
              onClick={handleNewOrder}
              className="
                flex-1
                flex
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-primary
                px-4
                py-2.5
                text-sm
                font-medium
                text-primary-foreground
                transition-colors
                hover:bg-primary/90
              "
            >
              Pesanan Baru
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: product selection */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border bg-background">
        {/* Filter bar */}
        <div className="bg-card border-b border-border px-5 py-3.5 space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="
                w-full
                pl-8
                pr-4
                py-2
                text-sm
                bg-secondary
                border
                border-border
                rounded-md
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
                focus:ring-2
                focus:ring-primary/20
                focus:border-primary
                transition-all
                duration-200
              "
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCat('all')}
              className={`
                shrink-0
                rounded-lg
                px-3
                py-1.5
                text-xs
                font-medium
                transition-all
                ${
                  selectedCat === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              `}
            >
              Semua
            </button>

            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`
                  shrink-0
                  rounded-lg
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  transition-all
                  ${
                    selectedCat === c.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }
                `}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ShoppingCart size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Tidak ada menu tersedia</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filtered.map((product) => {
                const qty = cartQty(product.id);
                return (
                  <div
                    key={product.id}
                    className="
                      group
                      cursor-pointer
                      overflow-hidden
                      rounded-lg
                      border
                      border-border
                      bg-card

                      transition-all
                      duration-200

                      hover:-translate-y-1
                      hover:border-primary/40
                      hover:shadow-lg
                      hover:shadow-black/20
                    "
                    onClick={() => addToCart(product)}
                  >
                    <div className="relative h-24 overflow-hidden bg-secondary">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff size={22} className="text-muted-foreground/40" />
                        </div>
                      )}
                      {qty > 0 && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                          <span className="text-white text-[10px] font-bold">{qty}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="mb-0.5 text-[10px] font-medium text-primary">{catName(product.category)}</p>
                      <p className="mb-1.5 line-clamp-2 text-xs font-semibold leading-tight text-foreground">{product.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary font-mono-nums">{formatRupiah(product.price)}</span>
                        <div className="
                          flex
                          h-6
                          w-6
                          items-center
                          justify-center
                          rounded-md
                          bg-primary
                          transition-all
                          duration-200
                          group-hover:bg-primary/90
                          group-hover:scale-105
                        ">
                          <Plus
                            size={12}
                            className="text-primary-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: order summary */}
      <div className="flex w-[300px] shrink-0 flex-col bg-card lg:w-[320px] xl:w-[360px]">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Ringkasan Pesanan</h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="
                  text-xs
                  font-medium
                  text-red-400
                  transition-colors
                  hover:text-red-300
                "
              >
                Kosongkan
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Nomor Meja (opsional)
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="contoh: 3, atau Meja VIP"
              className="
                w-full
                rounded-md
                border
                border-border
                bg-secondary
                px-3
                py-2
                text-sm
                text-foreground
                placeholder:text-muted-foreground

                outline-none
                transition-all
                duration-200

                focus:border-primary
                focus:ring-2
                focus:ring-primary/20
              "
            />
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground/40">
              <ShoppingCart size={40} className="mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Keranjang kosong
              </p>

              <p className="mt-1 text-xs text-muted-foreground/60">
                Pilih menu di sebelah kiri
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="
                    flex
                    gap-3
                    px-5
                    py-3.5
                    transition-colors
                    duration-200
                    hover:bg-secondary/50
                  "
                >
                  {/* Product Image */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff
                          size={15}
                          className="text-muted-foreground/40"
                        />
                      </div>
                    )}
                  </div>

                  {/* Product Information */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-tight text-foreground">
                      {item.product.name}
                    </p>

                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {formatRupiah(item.product.price)}
                    </p>

                    {/* Quantity */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="
                          flex
                          h-6
                          w-6
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-border
                          bg-secondary
                          text-muted-foreground

                          transition-all
                          duration-200

                          hover:border-primary/40
                          hover:bg-primary/10
                          hover:text-primary
                        "
                      >
                        <Minus size={11} />
                      </button>

                      <span
                        className="
                          w-5
                          text-center
                          font-mono
                          text-sm
                          font-bold
                          text-foreground
                        "
                      >
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        className="
                          flex
                          h-6
                          w-6
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-border
                          bg-secondary
                          text-muted-foreground

                          transition-all
                          duration-200

                          hover:border-primary/40
                          hover:bg-primary/10
                          hover:text-primary
                        "
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Price + Delete */}
                  <div
                    className="
                      flex
                      w-24
                      shrink-0
                      flex-col
                      items-end
                      justify-between
                    "
                  >
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="
                        rounded-md
                        p-1
                        text-muted-foreground

                        transition-all
                        duration-200

                        hover:bg-red-500/10
                        hover:text-red-400
                      "
                      title="Hapus item"
                    >
                      <X size={13} />
                    </button>

                    <span
                      className="
                        whitespace-nowrap
                        font-mono
                        text-sm
                        font-bold
                        text-foreground
                      "
                    >
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & save */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} item)</span>
              <span className="text-muted-foreground">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="font-bold text-foreground">
                Total
              </span>
              <span className="font-mono text-base font-bold text-primary">
                {formatRupiah(subtotal)}
              </span>
            </div>
          </div>
          <button
            onClick={handleSaveOrder}
            disabled={cart.length === 0}
            className="
              w-full
              rounded-md
              bg-primary
              py-3
              text-sm
              font-bold
              text-primary-foreground

              transition-all
              duration-200

              hover:bg-primary/90
              hover:shadow-md
              hover:shadow-primary/20

              active:scale-[0.99]

              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Simpan & Buat Nota
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Status awal: Menunggu Pembayaran
          </p>
        </div>
      </div>
    </div>
  );
}
