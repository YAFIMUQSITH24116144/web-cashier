import { Bell, User, ChevronRight } from 'lucide-react';
import { formatDate } from '@/utils/format';
import type { PageName } from '@/types';

const pageConfig: Record<PageName, { title: string; description: string }> = {
  products: {
    title: 'Produk & Menu',
    description: 'Kelola daftar produk dan menu',
  },
  orders: {
    title: 'Pesanan Baru',
    description: 'Buat pesanan dan cetak nota',
  },
  cashier: {
    title: 'Kasir & Pembayaran',
    description: 'Proses pembayaran dan konfirmasi transaksi',
  },
  reports: {
    title: 'Laporan Penjualan',
    description: 'Analisis dan export data penjualan',
  },
  settings: {
    title: 'Pengaturan',
    description: 'Konfigurasi aplikasi dan bisnis',
  },
};

interface HeaderProps {
  currentPage: PageName;
}

export function Header({ currentPage }: HeaderProps) {
  const { title, description } = pageConfig[currentPage];
  const today = formatDate(new Date());

  return (
    <header
      className="
        h-16
        shrink-0
        flex
        items-center
        justify-between
        px-6
        bg-card
        border-b
        border-border
      "
    >
      {/* Left Section */}
      <div>
        {/* Breadcrumb */}
        <div
          className="
            flex
            items-center
            gap-1.5
            mb-0.5
            text-xs
            text-muted-foreground
          "
        >
          <span>PoS Resto</span>

          <ChevronRight
            size={10}
            className="text-muted-foreground/70"
          />

          <span className="font-medium text-foreground">
            {title}
          </span>
        </div>

        {/* Page Description */}
        <h1
          className="
            text-base
            font-semibold
            leading-tight
            text-foreground
          "
        >
          {description}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">

        {/* Date */}
        <span
          className="
            hidden
            text-xs
            text-muted-foreground
            lg:block
          "
        >
          {today}
        </span>

        {/* Notification */}
        <button
          type="button"
          aria-label="Notifikasi"
          className="
            relative
            rounded-md
            p-2
            text-muted-foreground

            transition-all
            duration-200

            hover:bg-secondary
            hover:text-foreground
          "
        >
          <Bell size={16} />

          {/* Notification Indicator */}
          <span
            className="
              absolute
              right-1.5
              top-1.5
              h-1.5
              w-1.5
              rounded-full
              bg-primary
            "
          />
        </button>

        {/* User */}
        <div
          className="
            flex
            items-center
            gap-2.5
            border-l
            border-border
            pl-3
          "
        >
          {/* Avatar */}
          <div
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-full
              bg-primary/10

              transition-all
              duration-200

              hover:bg-primary/20
            "
          >
            <User
              size={14}
              className="text-primary"
            />
          </div>

          {/* User Info */}
          <div className="hidden md:block">
            <p
              className="
                text-xs
                font-semibold
                leading-tight
                text-foreground
              "
            >
              Siti Rahma
            </p>

            <p
              className="
                text-[10px]
                leading-tight
                text-muted-foreground
              "
            >
              Kasir
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}