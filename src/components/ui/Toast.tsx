import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import type { ToastMessage } from '@/types';

interface ToastProps {
  toast: ToastMessage;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styleMap = {
  success: 'bg-white border-green-200 text-green-700',
  error: 'bg-white border-red-200 text-red-700',
  warning: 'bg-white border-orange-200 text-orange-700',
  info: 'bg-white border-indigo-200 text-indigo-700',
};

const iconStyleMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-orange-500',
  info: 'text-indigo-500',
};

export function Toast({ toast }: ToastProps) {
  const Icon = iconMap[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-slate-200/60 min-w-64 max-w-sm ${styleMap[toast.type]} animate-in slide-in-from-bottom-2 duration-200`}
    >
      <Icon size={16} className={`shrink-0 ${iconStyleMap[toast.type]}`} />
      <span className="text-sm font-medium text-slate-800">{toast.message}</span>
    </div>
  );
}
