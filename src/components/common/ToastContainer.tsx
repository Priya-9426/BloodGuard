import React from 'react';
import { useBloodGuard } from '../../context/BloodGuardContext';
import { CheckCircle, AlertTriangle, XCircle, Info, Radio, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toast, dismissToast } = useBloodGuard();

  if (!toast) return null;

  const styleMap = {
    success: {
      bg: 'bg-emerald-900/95 text-white border-emerald-700',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    emergency: {
      bg: 'bg-red-950/95 text-white border-red-700 shadow-emergency animate-pulse-subtle',
      icon: <Radio className="w-5 h-5 text-red-400 shrink-0 animate-ping" />,
    },
    warning: {
      bg: 'bg-amber-950/95 text-white border-amber-700',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-950/95 text-white border-rose-700',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    info: {
      bg: 'bg-slate-900/95 text-white border-slate-700',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    },
  }[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slide-up">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${styleMap.bg}`}>
        {styleMap.icon}
        <div className="flex-1 text-sm font-medium leading-snug">
          {toast.message}
        </div>
        <button
          onClick={dismissToast}
          className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
