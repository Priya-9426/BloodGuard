import React, { useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { NotificationItem } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import {
  Bell,
  Radio,
  CheckCircle2,
  Info,
  Check,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveTab,
    requests,
    currentUser,
  } = useBloodGuard();

  const [filterCategory, setFilterCategory] = useState<
    "all" | "emergency" | "update" | "system"
  >("all");

  const filtered = notifications.filter((n) => {
    if (filterCategory === "all") return true;
    return n.type === filterCategory;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleAction = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.type === "emergency" && item.requestId) {
      // Find request
      const req = requests.find((r) => r.id === item.requestId);
      if (req) {
        setActiveTab(
          currentUser.role === "patient"
            ? "patient-dashboard"
            : currentUser.role === "donor"
              ? "donor-dashboard"
              : "admin-dashboard",
        );
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time push alerts, emergency broadcast dispatches, and system
            security screening reports.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            filterCategory === "all"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilterCategory("emergency")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            filterCategory === "emergency"
              ? "bg-red-600 text-white shadow-sm"
              : "text-red-700 hover:bg-red-50"
          }`}
        >
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Emergency Alerts</span>
        </button>

        <button
          onClick={() => setFilterCategory("update")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            filterCategory === "update"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Request Updates
        </button>

        <button
          onClick={() => setFilterCategory("system")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            filterCategory === "system"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          System & Security
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="There are no notifications matching your selected filter criteria."
          iconType="notification"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isEmergency = item.type === "emergency";

            return (
              <div
                key={item.id}
                onClick={() => handleAction(item)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
                  !item.isRead
                    ? isEmergency
                      ? "bg-red-50/60 border-red-200 shadow-sm ring-1 ring-red-500/10 hover:border-red-400"
                      : "bg-white border-slate-300 shadow-sm hover:border-slate-400"
                    : "bg-white/80 border-slate-200 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isEmergency
                          ? "bg-red-600 text-white shadow-sm"
                          : item.type === "update"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isEmergency ? (
                        <Radio className="w-5 h-5 animate-pulse" />
                      ) : item.type === "update" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-bold ${isEmergency ? "text-red-950" : "text-slate-900"}`}
                        >
                          {item.title}
                        </h3>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {item.message}
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium block pt-1">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>

                  {item.requestId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(item);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
