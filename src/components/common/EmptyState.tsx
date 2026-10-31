import React from 'react';
import { ShieldCheck, HeartCrack, BellOff, SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconType?: 'request' | 'alert' | 'fraud' | 'notification';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  iconType = 'request',
}) => {
  const IconComponent = {
    request: HeartCrack,
    alert: BellOff,
    fraud: ShieldCheck,
    notification: SearchX,
  }[iconType];

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 border border-red-100 shadow-sm">
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-500/20"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
