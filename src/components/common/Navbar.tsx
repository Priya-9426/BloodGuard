import React, { useState } from "react";
import { useBloodGuard } from "../../context/BloodGuardContext";
import {
  Shield,
  Droplet,
  Bell,
  PhoneCall,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeRole,
    activeTab,
    setActiveTab,
    switchActiveRole,
    unreadEmergencyCount,
    logout,
    isApiAuthenticated,
  } = useBloodGuard();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = [
    { key: "landing", label: "Home" },
    { key: "how-it-works", label: "How It Works" },
    { key: "about", label: "About" },
  ];

  const handleNavClick = (tabKey: string) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
  };

  const getDashboardTabKey = () => {
    if (activeRole === "patient") return "patient-dashboard";
    if (activeRole === "donor") return "donor-dashboard";
    if (activeRole === "admin") return "admin-dashboard";
    return "landing";
  };

  const isBothRoles =
    currentUser.roles?.includes("patient") &&
    currentUser.roles?.includes("donor");

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand Identity */}
          <div
            onClick={() => handleNavClick("landing")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-white/90" />
              <Droplet className="w-3.5 h-3.5 text-white absolute fill-white -mt-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  Blood<span className="text-red-600">Guard</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700 tracking-wide uppercase">
                  Emergency Support
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wide">
                Secure AI Anomaly Screening & Fast2SMS Real-Time Broadcast
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === link.key
                    ? "text-red-700 bg-red-50/80 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Action Area */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* 24/7 Hotline Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-semibold">
              <PhoneCall className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>
                Emergency Helpline:{" "}
                <strong className="text-slate-900">9361111750</strong>
              </span>
            </div>

            {/* If Logged In */}
            {isApiAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Both-role Switcher Button (Section 2) */}
                {isBothRoles && (
                  <button
                    onClick={() =>
                      switchActiveRole(
                        activeRole === "patient" ? "donor" : "patient",
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs transition-colors shadow-xs"
                    title="Switch between Patient and Donor mode without logging out"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                    <span>
                      Mode: {activeRole === "patient" ? "👤 Patient" : "🩸 Donor"}
                    </span>
                  </button>
                )}

                {/* Dashboard Button */}
                <button
                  onClick={() => handleNavClick(getDashboardTabKey())}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleNavClick("login")}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavClick("register")}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all"
                >
                  Join BloodGuard
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key)}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {isApiAuthenticated ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {isBothRoles && (
                <button
                  onClick={() => {
                    switchActiveRole(
                      activeRole === "patient" ? "donor" : "patient",
                    );
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-red-700 bg-red-50 flex items-center justify-between"
                >
                  <span>Active Role: {activeRole.toUpperCase()}</span>
                  <span className="text-xs text-red-500">Tap to Switch</span>
                </button>
              )}
              <button
                onClick={() => handleNavClick(getDashboardTabKey())}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-900 bg-slate-100"
              >
                Go to Dashboard
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-rose-600"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
              <button
                onClick={() => handleNavClick("login")}
                className="w-full py-2 text-center text-xs font-bold text-slate-700 border border-slate-200 rounded-xl"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavClick("register")}
                className="w-full py-2 text-center text-xs font-bold text-white bg-red-600 rounded-xl"
              >
                Join BloodGuard
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
