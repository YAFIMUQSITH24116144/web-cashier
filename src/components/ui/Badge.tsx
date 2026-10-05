import type { OrderStatus } from '@/types';

interface BadgeProps {
  status: OrderStatus;
}

const config: Record<OrderStatus, { label: string; className: string }> = {
  menunggu: {
    label: 'Menunggu',
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  lunas: {
    label: 'Lunas',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  batal: {
    label: 'Dibatalkan',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
};

export function StatusBadge({ status }: BadgeProps) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'lunas' ? 'bg-green-500' : status === 'menunggu' ? 'bg-orange-500' : 'bg-red-500'}`} />
      {label}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantMap: Record<NonNullable<GenericBadgeProps['variant']>, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-orange-50 text-orange-700 border border-orange-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

export function Badge({ children, variant = 'default' }: GenericBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantMap[variant]}`}>
      {children}
    </span>
  );
}
