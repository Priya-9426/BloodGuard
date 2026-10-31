import React from 'react';
import { RequestStatus, UrgencyLevel } from '../../types';

interface StatusBadgeProps {
  status?: RequestStatus;
  urgency?: UrgencyLevel;
  type?: 'status' | 'urgency' | 'stock' | 'eligibility';
  stockLevel?: 'normal' | 'low' | 'critical';
  isEligible?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  urgency,
  type = 'status',
  stockLevel,
  isEligible,
}) => {
  if (type === 'urgency' && urgency) {
    const config = {
      CRITICAL: {
        bg: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20',
        dot: 'bg-red-600 animate-ping',
        label: '🚨 Critical Priority',
      },
      URGENT: {
        bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        dot: 'bg-amber-500',
        label: '⚡ Urgent Priority',
      },
      STANDARD: {
        bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        dot: 'bg-blue-500',
        label: 'Standard Priority',
      },
    }[urgency];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  if (type === 'stock' && stockLevel) {
    const config = {
      normal: {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: '🟢 Normal Stock',
      },
      low: {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: '🟡 Low Stock',
      },
      critical: {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-600 animate-pulse',
        label: '🔴 Critical Shortage',
      },
    }[stockLevel];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  if (type === 'eligibility') {
    return isEligible ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        🟢 Eligible for Alerts
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        🔴 Currently Ineligible
      </span>
    );
  }

  // Request Status
  if (!status) return null;

  const statusConfig = {
    screening: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500 animate-spin',
      label: 'Security Screening (AI)',
    },
    suspicious_review: {
      bg: 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/20',
      dot: 'bg-amber-600 animate-pulse',
      label: '⚠ Awaiting Admin Review',
    },
    broadcasting: {
      bg: 'bg-red-50 text-red-700 border-red-200 ring-2 ring-red-500/20',
      dot: 'bg-red-600 animate-ping',
      label: '📢 Broadcasting to Donors',
    },
    accepted: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-600',
      label: '🤝 Donor Connected',
    },
    fulfilled: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: '✓ Fulfilled & Closed',
    },
    rejected: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      label: '✕ Blocked / Cancelled',
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
      {statusConfig.label}
    </span>
  );
};
