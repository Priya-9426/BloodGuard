import React from "react";
import { useBloodGuard } from "../../context/BloodGuardContext";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Bell,
  User as UserIcon,
  LogOut,
  Radio,
  HeartHandshake,
  CheckSquare,
  ShieldAlert,
  BarChart3,
  Search,
  RotateCcw,
  Users,
  UserCheck,
  Droplet,
  Building2,
  MapPin,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

interface SidebarMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  isPrimary?: boolean;
  isEmergency?: boolean;
  isWarning?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
}) => {
  const {
    currentUser,
    activeRole,
    switchActiveRole,
    unreadEmergencyCount,
    logout,
    requests,
  } = useBloodGuard();

  const flaggedCount = requests.filter(
    (r) => r.status === "suspicious_review",
  ).length;
  const activeEmergencyCount = requests.filter(
    (r) => r.status === "broadcasting",
  ).length;

  const isBoth =
    currentUser.roles?.includes("patient") &&
    currentUser.roles?.includes("donor");

  const patientItems: SidebarMenuItem[] = [
    { key: "patient-overview", label: "Dashboard", icon: LayoutDashboard },
    {
      key: "patient-create",
      label: "+ Create Request",
      icon: PlusCircle,
      isPrimary: true,
    },
    { key: "patient-requests", label: "Request History", icon: FileText },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadEmergencyCount,
    },
  ];

  const donorItems: SidebarMenuItem[] = [
    { key: "donor-overview", label: "Dashboard", icon: LayoutDashboard },
    {
      key: "donor-alerts",
      label: "Emergency Alerts",
      icon: Radio,
      badge: activeEmergencyCount,
      isEmergency: true,
    },
    {
      key: "donor-history",
      label: "My Donations",
      icon: HeartHandshake,
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadEmergencyCount,
    },
  ];

  const adminItems: SidebarMenuItem[] = [
    { key: "admin-overview", label: "Dashboard", icon: LayoutDashboard },
    { key: "admin-donors", label: "Donor Directory", icon: Users },
    { key: "admin-patients", label: "Patient Management", icon: UserCheck },
    { key: "admin-blood-groups", label: "Blood Group Reports", icon: Droplet },
    { key: "admin-reports", label: "Reports & Exports", icon: FileText },
    { key: "admin-hospitals", label: "Hospital Registry", icon: Building2 },
    { key: "admin-location-reports", label: "Location Reports", icon: MapPin },
    {
      key: "admin-fraud",
      label: "Fraud Review Center",
      icon: ShieldAlert,
      badge: flaggedCount,
      isWarning: true,
    },
    { key: "admin-sms", label: "Fast2SMS Portal", icon: Radio },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadEmergencyCount,
    },
  ];

  const getMenuItems = () => {
    if (activeRole === "patient") return patientItems;
    if (activeRole === "donor") return donorItems;
    if (activeRole === "admin") return adminItems;
    return [];
  };

  const menuItems = getMenuItems();

  const publicId =
    activeRole === "admin"
      ? currentUser.adminId || `AD${String(currentUser.phone).slice(-5)}`
      : activeRole === "patient"
        ? currentUser.patientId || `PD${String(currentUser.phone).slice(-5)}`
        : currentUser.donorId || `DN${String(currentUser.phone).slice(-5)}`;

  const idLabel =
    activeRole === "admin"
      ? "Admin ID"
      : activeRole === "patient"
        ? "Patient ID"
        : "Donor ID";

  return (
    <aside className="w-full lg:w-64 bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shrink-0 shadow-sm">
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white shadow-xs flex items-center justify-center text-slate-600 shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {currentUser.name}
              </h4>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                {idLabel}
              </span>
              <span className="text-[11px] font-mono font-bold text-red-600 block">
                {publicId}
              </span>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">
                Mode: {activeRole.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Quick Switch Button — only for Patient+Donor users, never for Admin */}
          {isBoth && activeRole !== "admin" && (
            <button
              onClick={() =>
                switchActiveRole(
                  activeRole === "patient" ? "donor" : "patient",
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>
                Switch to {activeRole === "patient" ? "🩸 Donor Mode" : "👤 Patient Mode"}
              </span>
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onSelectView(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.isPrimary
                    ? "bg-red-600 text-white font-bold hover:bg-red-700 shadow-md shadow-red-600/20"
                    : isActive
                      ? "bg-red-50 text-red-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      item.isPrimary
                        ? "text-white"
                        : isActive
                          ? "text-red-600"
                          : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      item.isEmergency
                        ? "bg-red-600 text-white animate-pulse"
                        : item.isWarning
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
