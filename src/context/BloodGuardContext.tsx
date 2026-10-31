import React, { createContext, useContext, useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  BloodGroup,
  EmergencyRequest,
  NotificationItem,
  User,
  UserRole,
} from "../types";
import {
  cancelApiRequest,
  clearAuthToken,
  createApiRequest,
  fulfillApiRequest,
  getApiRequests,
  getApiUsers,
  getAuthToken,
  getStoredActiveRole,
  loginWithApi,
  registerWithApi,
  releaseApiRequest,
  respondToApiRequest,
  restoreApiUser,
  reviewApiRequest,
  setApiAvailability,
  setApiLastDonationDate,
  setStoredActiveRole,
} from "../utils/api";

interface ToastState {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "emergency" | "info";
  timestamp: number;
}

interface BloodGuardContextType {
  currentUser: User;
  activeRole: UserRole;
  isApiAuthenticated: boolean;
  users: User[];
  activeTab: string;
  requests: EmergencyRequest[];
  notifications: NotificationItem[];
  unreadEmergencyCount: number;
  toast: ToastState | null;
  isRoleSelectionModalOpen: boolean;

  // Navigation & Authentication
  setActiveTab: (tab: string) => void;
  switchActiveRole: (role: "patient" | "donor") => void;
  setIsRoleSelectionModalOpen: (open: boolean) => void;
  logout: () => void;
  signIn: (email: string, password: string) => Promise<User>;
  registerAccount: (data: Record<string, unknown>) => Promise<User>;

  // Core Actions
  createEmergencyRequest: (data: {
    patientName: string;
    contactPhone: string;
    bloodGroup: BloodGroup;
    unitsRequired: number;
    urgency: "CRITICAL" | "URGENT" | "STANDARD";
    hospitalName: string;
    city?: string;
    state?: string;
    district?: string;
    hospitalId?: string;
    hospitalType?: string;
    additionalNotes?: string;
    document?: File | null;
  }) => Promise<EmergencyRequest | null>;

  acceptEmergencyRequest: (requestId: string) => Promise<void>;
  declineEmergencyRequest: (requestId: string) => Promise<void>;
  releaseEmergencyRequest: (requestId: string, reason: string) => Promise<void>;
  fulfillEmergencyRequest: (requestId: string) => Promise<void>;
  cancelEmergencyRequest: (requestId: string) => void;

  // Admin Fraud Actions
  approveFlaggedRequest: (requestId: string, note?: string) => void;
  rejectFlaggedRequest: (requestId: string, reason?: string) => void;

  // Donor Actions
  toggleAvailability: (donorId?: string) => void;
  updateLastDonationDate: (date: string) => void;

  // Notification Actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Feedback & Reset
  showToast: (message: string, type?: ToastState["type"]) => void;
  dismissToast: () => void;
  refreshRequests: () => Promise<void>;
}

const BloodGuardContext = createContext<BloodGuardContextType | undefined>(
  undefined,
);

const GUEST_USER: User = {
  id: "",
  name: "Guest",
  email: "",
  phone: "",
  role: "guest",
  roles: ["guest"],
};

export const BloodGuardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [activeRole, setActiveRole] = useState<UserRole>("guest");
  const [isApiAuthenticated, setIsApiAuthenticated] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>("landing");
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isRoleSelectionModalOpen, setIsRoleSelectionModalOpen] =
    useState<boolean>(false);

  const determineDefaultRole = (user: User): UserRole => {
    const roles = user.roles || [user.role];
    if (roles.includes("admin")) return "admin";
    const stored = getStoredActiveRole();
    if (stored && roles.includes(stored)) return stored;
    if (roles.includes("patient") && roles.includes("donor")) return "patient";
    if (roles.includes("donor")) return "donor";
    if (roles.includes("patient")) return "patient";
    return "guest";
  };

  const determineDefaultTab = (role: UserRole): string => {
    if (role === "admin") return "admin-dashboard";
    if (role === "donor") return "donor-dashboard";
    if (role === "patient") return "patient-dashboard";
    return "landing";
  };

  const refreshRequests = async () => {
    if (!getAuthToken()) return;
    try {
      const data = await getApiRequests();
      setRequests(data);
    } catch (_) {}
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await restoreApiUser();
        if (user) {
          setCurrentUser(user);
          setIsApiAuthenticated(true);
          const initialRole = determineDefaultRole(user);
          setActiveRole(initialRole);
          setStoredActiveRole(initialRole);
          setActiveTab(determineDefaultTab(initialRole));

          const reqs = await getApiRequests().catch(() => []);
          setRequests(reqs);

          if (user.roles?.includes("admin")) {
            const allUsers = await getApiUsers().catch(() => []);
            setUsers(allUsers);
          }
        }
      } catch (_) {
        setCurrentUser(GUEST_USER);
        setActiveRole("guest");
        setIsApiAuthenticated(false);
      }
    };

    restoreSession();
  }, []);

  const showToast = (
    message: string,
    type: ToastState["type"] = "info",
  ) => {
    setToast({
      id: String(Date.now()),
      message,
      type,
      timestamp: Date.now(),
    });
  };

  const dismissToast = () => setToast(null);

  const switchActiveRole = (newRole: "patient" | "donor") => {
    if (!currentUser.roles?.includes(newRole)) {
      showToast(`You do not have the ${newRole} role registered.`, "error");
      return;
    }
    setActiveRole(newRole);
    setStoredActiveRole(newRole);
    setActiveTab(determineDefaultTab(newRole));
    showToast(`Switched to ${newRole === "patient" ? "👤 Patient" : "🩸 Donor"} mode.`, "info");
    refreshRequests();
  };

  const signIn = async (email: string, pass: string): Promise<User> => {
    const user = await loginWithApi({ email, password: pass });
    setCurrentUser(user);
    setIsApiAuthenticated(true);

    const roles = user.roles || [user.role];
    const isBoth = roles.includes("patient") && roles.includes("donor");

    if (roles.includes("admin")) {
      setActiveRole("admin");
      setStoredActiveRole("admin");
      setActiveTab("admin-dashboard");
    } else if (isBoth) {
      // Both-role user: trigger role selection modal/screen
      const initialRole = "patient";
      setActiveRole(initialRole);
      setStoredActiveRole(initialRole);
      setActiveTab("patient-dashboard");
      setIsRoleSelectionModalOpen(true);
    } else if (roles.includes("donor")) {
      setActiveRole("donor");
      setStoredActiveRole("donor");
      setActiveTab("donor-dashboard");
    } else {
      setActiveRole("patient");
      setStoredActiveRole("patient");
      setActiveTab("patient-dashboard");
    }

    const reqs = await getApiRequests().catch(() => []);
    setRequests(reqs);

    if (roles.includes("admin")) {
      const allUsers = await getApiUsers().catch(() => []);
      setUsers(allUsers);
    }

    showToast(`Welcome back, ${user.name}!`, "success");
    return user;
  };

  const registerAccount = async (
    data: Record<string, unknown>,
  ): Promise<User> => {
    const user = await registerWithApi(data);
    setCurrentUser(user);
    setIsApiAuthenticated(true);

    const roles = user.roles || [user.role];
    const isBoth = roles.includes("patient") && roles.includes("donor");

    if (isBoth) {
      setActiveRole("patient");
      setStoredActiveRole("patient");
      setActiveTab("patient-dashboard");
      setIsRoleSelectionModalOpen(true);
    } else if (roles.includes("donor")) {
      setActiveRole("donor");
      setStoredActiveRole("donor");
      setActiveTab("donor-dashboard");
    } else {
      setActiveRole("patient");
      setStoredActiveRole("patient");
      setActiveTab("patient-dashboard");
    }

    refreshRequests();
    return user;
  };

  const logout = () => {
    clearAuthToken();
    setCurrentUser(GUEST_USER);
    setActiveRole("guest");
    setIsApiAuthenticated(false);
    setActiveTab("landing");
    showToast("Signed out successfully.", "info");
  };

  const createEmergencyRequest = async (data: {
    patientName: string;
    contactPhone: string;
    bloodGroup: BloodGroup;
    unitsRequired: number;
    urgency: "CRITICAL" | "URGENT" | "STANDARD";
    hospitalName: string;
    city?: string;
    state?: string;
    district?: string;
    hospitalId?: string;
    hospitalType?: string;
    additionalNotes?: string;
    document?: File | null;
  }): Promise<EmergencyRequest | null> => {
    const formData = new FormData();
    formData.append("patientName", data.patientName);
    formData.append("contactPhone", data.contactPhone);
    formData.append("bloodGroup", data.bloodGroup);
    formData.append("unitsRequired", String(data.unitsRequired));
    formData.append("urgency", data.urgency);
    formData.append("hospitalName", data.hospitalName);
    formData.append("city", data.city || "Salem");
    if (data.state) formData.append("state", data.state);
    if (data.district) formData.append("district", data.district);
    if (data.hospitalType) formData.append("hospitalType", data.hospitalType);
    if (data.hospitalId) formData.append("hospitalId", data.hospitalId);
    if (data.additionalNotes)
      formData.append("additionalNotes", data.additionalNotes);
    if (data.document) formData.append("document", data.document);

    try {
      const created = await createApiRequest(formData);
      setRequests((prev) => [created, ...prev]);

      const reqNo = created.requestNumber || created.id;
      if (created.isFlagged) {
        showToast(
          `Request ${reqNo} flagged for clinical security review (Score: ${created.anomalyScore}).`,
          "warning",
        );
      } else {
        showToast(
          `Emergency broadcast ${reqNo} sent to eligible ${created.bloodGroup} donors!`,
          "emergency",
        );
      }
      return created;
    } catch (err) {
      showToast((err as Error).message, "error");
      return null;
    }
  };

  const acceptEmergencyRequest = async (requestId: string) => {
    try {
      const updated = await respondToApiRequest(requestId, "accept");
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast(
        "Request accepted! Patient and hospital have been notified.",
        "success",
      );
    } catch (err) {
      showToast((err as Error).message, "error");
      refreshRequests();
    }
  };

  const declineEmergencyRequest = async (requestId: string) => {
    try {
      const updated = await respondToApiRequest(requestId, "decline");
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      showToast("Response recorded. Thank you.", "info");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const releaseEmergencyRequest = async (
    requestId: string,
    reason: string,
  ) => {
    try {
      const updated = await releaseApiRequest(requestId, reason);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      showToast(
        "Request released and reopened for broadcast to other eligible donors.",
        "warning",
      );
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const fulfillEmergencyRequest = async (requestId: string) => {
    try {
      const updated = await fulfillApiRequest(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      showToast("Request marked as fulfilled. Donation completed!", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const cancelEmergencyRequest = async (requestId: string) => {
    try {
      const updated = await cancelApiRequest(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      showToast("Emergency request cancelled.", "info");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const approveFlaggedRequest = async (requestId: string, note?: string) => {
    try {
      const res = await reviewApiRequest(requestId, "approve", note);
      if ("id" in res) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? (res as EmergencyRequest) : r)),
        );
      }
      showToast("Request approved and broadcast to donors.", "success");
      refreshRequests();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const rejectFlaggedRequest = async (requestId: string, reason?: string) => {
    try {
      await reviewApiRequest(requestId, "reject", reason);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)),
      );
      showToast("Request rejected.", "info");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const toggleAvailability = async () => {
    const nextVal = !currentUser.isAvailable;
    try {
      await setApiAvailability(nextVal);
      setCurrentUser((prev) => ({ ...prev, isAvailable: nextVal }));
      showToast(
        `Donation availability set to ${nextVal ? "AVAILABLE" : "UNAVAILABLE"}.`,
        "info",
      );
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const updateLastDonationDate = async (date: string) => {
    try {
      await setApiLastDonationDate(date);
      setCurrentUser((prev) => ({ ...prev, lastDonationDate: date }));
      showToast("Last donation date updated. 56-day rule recalculated.", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadEmergencyCount = notifications.filter(
    (n) => !n.isRead && n.type === "emergency",
  ).length;

  return (
    <BloodGuardContext.Provider
      value={{
        currentUser,
        activeRole,
        isApiAuthenticated,
        users,
        activeTab,
        requests,
        notifications,
        unreadEmergencyCount,
        toast,
        isRoleSelectionModalOpen,
        setActiveTab,
        switchActiveRole,
        setIsRoleSelectionModalOpen,
        logout,
        signIn,
        registerAccount,
        createEmergencyRequest,
        acceptEmergencyRequest,
        declineEmergencyRequest,
        releaseEmergencyRequest,
        fulfillEmergencyRequest,
        cancelEmergencyRequest,
        approveFlaggedRequest,
        rejectFlaggedRequest,
        toggleAvailability,
        updateLastDonationDate,
        markNotificationRead,
        markAllNotificationsRead,
        showToast,
        dismissToast,
        refreshRequests,
      }}
    >
      {children}
    </BloodGuardContext.Provider>
  );
};

export const useBloodGuard = () => {
  const context = useContext(BloodGuardContext);
  if (!context) {
    throw new Error("useBloodGuard must be used within a BloodGuardProvider");
  }
  return context;
};
