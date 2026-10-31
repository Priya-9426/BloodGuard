import React, { useState } from "react";
import { BloodGuardProvider, useBloodGuard } from "./context/BloodGuardContext";
import { Navbar } from "./components/common/Navbar";
import { Sidebar } from "./components/common/Sidebar";
import { ToastContainer } from "./components/common/ToastContainer";
import { RoleSelectionModal } from "./components/common/RoleSelectionModal";

// Pages
import { LandingPage } from "./pages/LandingPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { PatientDashboard } from "./pages/PatientDashboard";
import { DonorDashboard } from "./pages/DonorDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { NotificationsPage } from "./pages/NotificationsPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { AboutPage } from "./pages/AboutPage";
import { CreateRequestModal } from "./pages/CreateRequestModal";

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useBloodGuard();
  const [sidebarView, setSidebarView] = useState<string>("overview");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Determine if active view is a dashboard layout
  const isDashboardView = [
    "patient-dashboard",
    "donor-dashboard",
    "admin-dashboard",
  ].includes(activeTab);

  const handleSidebarSelect = (viewKey: string) => {
    setSidebarView(viewKey);

    // Patient
    if (viewKey === "patient-create") {
      setIsCreateModalOpen(true);
    } else if (
      viewKey === "patient-overview" ||
      viewKey === "patient-requests"
    ) {
      setActiveTab("patient-dashboard");
    }

    // Donor
    else if (
      viewKey === "donor-overview" ||
      viewKey === "donor-alerts" ||
      viewKey === "donor-history"
    ) {
      setActiveTab("donor-dashboard");
    }

    // Admin
    else if (viewKey.startsWith("admin-")) {
      setActiveTab("admin-dashboard");
    }

    // Global
    else if (viewKey === "notifications") {
      setActiveTab("notifications");
    }
  };

  const renderCurrentView = () => {
    switch (activeTab) {
      case "landing":
        return <LandingPage />;
      case "login":
        return <LoginPage />;
      case "register":
        return <RegisterPage />;
      case "how-it-works":
        return <HowItWorksPage />;
      case "about":
        return <AboutPage />;
      case "notifications":
        return <NotificationsPage />;
      case "patient-dashboard":
        return <PatientDashboard />;
      case "donor-dashboard":
        return <DonorDashboard />;
      case "admin-dashboard":
        return (
          <AdminDashboard
            defaultSection={
              sidebarView === "admin-fraud"
                ? "fraud"
                : sidebarView === "admin-reports"
                  ? "reports"
                  : sidebarView === "admin-donors"
                    ? "donors"
                    : sidebarView === "admin-patients"
                      ? "patients"
                      : sidebarView === "admin-blood-groups"
                        ? "blood-groups"
                        : sidebarView === "admin-sms"
                          ? "sms"
                          : sidebarView === "admin-hospitals"
                            ? "hospitals"
                            : sidebarView === "admin-location-reports"
                              ? "location-reports"
                              : "overview"
            }
          />
        );
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Main Glass Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {isDashboardView ? (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <Sidebar
              currentView={sidebarView}
              onSelectView={handleSidebarSelect}
            />

            {/* Dashboard Content Pane */}
            <div className="flex-1 min-w-0">{renderCurrentView()}</div>
          </div>
        ) : (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderCurrentView()}
          </div>
        )}
      </main>

      {/* Global Toast System */}
      <ToastContainer />

      {/* Global Role Selection Modal for Both-Role accounts */}
      <RoleSelectionModal />

      {/* Global Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <BloodGuardProvider>
      <AppContent />
    </BloodGuardProvider>
  );
}

export default App;
