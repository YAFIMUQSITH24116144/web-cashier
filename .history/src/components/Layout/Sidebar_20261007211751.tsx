import {
  UtensilsCrossed,
  ClipboardList,
  CreditCard,
  BarChart3,
  Settings,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import type { PageName, AppSettings } from '@/types';

interface NavItem {
  id: PageName;
  label: string;
  icon: typeof UtensilsCrossed;
}

const navItems: NavItem[] = [
  { id: 'products', label: 'Produk & Menu', icon: UtensilsCrossed },
  { id: 'orders', label: 'Pesanan', icon: ClipboardList },
  { id: 'cashier', label: 'Kasir & Pembayaran', icon: CreditCard },
  { id: 'reports', label: 'Laporan Penjualan', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

interface SidebarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  settings: AppSettings;
}

export function Sidebar({ currentPage, onNavigate, settings }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-card border-r border-border">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">

          {/* Logo Icon */}
          <div
            className="
              flex h-8 w-8 shrink-0 items-center justify-center
              rounded-md
              bg-primary
              text-primary-foreground
              transition-all duration-200
              hover:scale-105
              hover:shadow-md
              hover:shadow-primary/20
            "
          >
            <UtensilsCrossed size={16} />
          </div>

          {/* Logo Text */}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight tracking-wide text-foreground">
              {settings.businessName}
            </p>

            <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
              {settings.businessTagline}
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">

        {/* Menu Utama */}
        <p
          className="
            px-3
            pb-2
            pt-1
            text-[10px]
            font-semibold
            uppercase
            tracking-widest
            text-muted-foreground
          "
        >
          Menu Utama
        </p>

        <div className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;

            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`
                  group
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-md
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-medium
                  transition-all
                  duration-200

                  ${
                    active
                      ? `
                        bg-primary/10
                        text-primary
                        border
                        border-primary/20
                      `
                      : `
                        border
                        border-transparent
                        text-muted-foreground
                        hover:bg-secondary
                        hover:text-foreground
                        hover:border-border
                      `
                  }
                `}
              >
                {/* Icon */}
                <Icon
                  size={16}
                  className={`
                    shrink-0
                    transition-all
                    duration-200

                    ${
                      active
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-primary'
                    }
                  `}
                />

                {/* Label */}
                <span className="flex-1">
                  {label}
                </span>

                {/* Active Arrow */}
                {active && (
                  <ChevronRight
                    size={13}
                    className="
                      text-primary
                      transition-transform
                      duration-200
                      group-hover:translate-x-0.5
                    "
                  />
                )}
              </button>
            );
          })}
        </div>

      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-border px-4 py-4">

        {/* Offline Status */}
        <div
          className="
            flex
            items-center
            gap-2
            rounded-md
            p-2
            transition-colors
            duration-200
            hover:bg-secondary
          "
        >
          {/* Status Icon */}
          <div
            className="
              flex
              h-6
              w-6
              items-center
              justify-center
              rounded-full
              bg-primary/10
            "
          >
            <WifiOff
              size={11}
              className="text-primary"
            />
          </div>

          {/* Status Text */}
          <div>
            <p className="text-[11px] font-medium text-primary">
              Mode Offline
            </p>

            <p className="text-[10px] text-muted-foreground">
              Database lokal aktif
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-[10px] text-muted-foreground">
          Versi 1.0.0 · © 2026
        </p>

      </div>

    </aside>
  );
}