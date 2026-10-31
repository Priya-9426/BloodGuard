import React, { useState, useEffect } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { BloodGroup, EmergencyRequest } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";
import { Modal } from "../components/common/Modal";
import { EmptyState } from "../components/common/EmptyState";
import { formatDateTime } from "../utils/eligibility";
import {
  getDocumentUrl,
  getApiSmsStatus,
  getApiSmsLogs,
  sendApiTestSms,
  SmsLogItem,
} from "../utils/api";
import { AdminCharts } from "../components/admin/AdminCharts";
import { AdminDonorDirectory } from "../components/admin/AdminDonorDirectory";
import { AdminPatientManagement } from "../components/admin/AdminPatientManagement";
import { AdminBloodGroupReports } from "../components/admin/AdminBloodGroupReports";
import { AdminDateReports } from "../components/admin/AdminDateReports";
import { AdminHospitalManagement } from "../components/admin/AdminHospitalManagement";
import { AdminLocationReports } from "../components/admin/AdminLocationReports";
import {
  ShieldAlert,
  Users,
  UserCheck,
  Droplets,
  Radio,
  Check,
  X,
  FileText,
  Calendar,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Phone,
  Smartphone,
  Activity,
  BarChart2,
  CheckCircle2,
  Building2,
  MapPin,
} from "lucide-react";

type AdminSection =
  | "overview"
  | "donors"
  | "patients"
  | "blood-groups"
  | "reports"
  | "fraud"
  | "sms"
  | "hospitals"
  | "location-reports";

interface AdminDashboardProps {
  defaultSection?:
    | "overview"
    | "fraud"
    | "reports"
    | "analytics"
    | "donors"
    | "patients"
    | "blood-groups"
    | "sms"
    | "hospitals"
    | "location-reports";
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  defaultSection = "overview",
}) => {
  const {
    currentUser,
    requests,
    users,
    approveFlaggedRequest,
    rejectFlaggedRequest,
  } = useBloodGuard();

  const normalizeSection = (section: string): AdminSection => {
    if (section === "analytics") return "overview";
    if (
      [
        "overview",
        "donors",
        "patients",
        "blood-groups",
        "reports",
        "fraud",
        "sms",
        "hospitals",
        "location-reports",
      ].includes(section)
    ) {
      return section as AdminSection;
    }
    return "overview";
  };

  const [activeSubTab, setActiveSubTab] = useState<AdminSection>(
    normalizeSection(defaultSection)
  );

  useEffect(() => {
    setActiveSubTab(normalizeSection(defaultSection));
  }, [defaultSection]);

  const [selectedFraudItem, setSelectedFraudItem] =
    useState<EmergencyRequest | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");

  const flaggedRequests = requests.filter(
    (r) => r.status === "suspicious_review"
  );
  const activeBroadcasts = requests.filter(
    (r) => r.status === "broadcasting"
  );
  const fulfilledRequests = requests.filter(
    (r) => r.status === "fulfilled"
  );
  const reopenedRequests = requests.filter(
    (r) => r.acceptanceHistory && r.acceptanceHistory.length > 0
  );

  const patientOnlyUsers = users.filter(
    (u) => u.roles?.includes("patient") && !u.roles?.includes("donor")
  ).length;
  const donorOnlyUsers = users.filter(
    (u) => u.roles?.includes("donor") && !u.roles?.includes("patient")
  ).length;
  const bothRoleUsers = users.filter(
    (u) => u.roles?.includes("patient") && u.roles?.includes("donor")
  ).length;

  const handleApprove = (reqId: string) => {
    approveFlaggedRequest(
      reqId,
      reviewNote || "Approved by Medical Officer after clinical document verification."
    );
    setSelectedFraudItem(null);
    setReviewNote("");
  };

  const handleReject = (reqId: string) => {
    rejectFlaggedRequest(
      reqId,
      reviewNote || "Rejected by Medical Officer after manual review."
    );
    setSelectedFraudItem(null);
    setReviewNote("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Administrative Command Center
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
              {currentUser.adminId || ("AD" + (currentUser.phone ? currentUser.phone.slice(-5) : "11750"))}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
              Medical Officer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervise emergency broadcasts, evaluate suspicious requests, and generate clinical compliance reports.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "overview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-red-600" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveSubTab("donors")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "donors"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-red-600" />
            <span>Donors</span>
          </button>

          <button
            onClick={() => setActiveSubTab("patients")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "patients"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-red-600" />
            <span>Patients</span>
          </button>

          <button
            onClick={() => setActiveSubTab("blood-groups")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "blood-groups"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-red-600" />
            <span>Blood Groups</span>
          </button>

          <button
            onClick={() => setActiveSubTab("reports")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "reports"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            <span>Date Reports & Exports</span>
          </button>

          <button
            onClick={() => setActiveSubTab("fraud")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "fraud"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Fraud Review</span>
            {flaggedRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {flaggedRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("sms")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "sms"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>SMS Portal</span>
          </button>

          <button
            onClick={() => setActiveSubTab("hospitals")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "hospitals"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-red-600" />
            <span>Hospitals</span>
          </button>

          <button
            onClick={() => setActiveSubTab("location-reports")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "location-reports"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Location Reports</span>
          </button>
        </div>
      </div>

      {/* 1. OVERVIEW TAB: KPI Cards + Restored Visual Charts + Recent Requests */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Registered Users
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {users.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {patientOnlyUsers} Patients • {donorOnlyUsers} Donors • {bothRoleUsers} Both
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Broadcasts
              </span>
              <h3 className="text-2xl font-extrabold text-red-600 mt-1">
                {activeBroadcasts.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Simultaneous Fast2SMS alerts live
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Suspicious Flagged
              </span>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                {flaggedRequests.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Awaiting clinical approval
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fulfilled Requests
              </span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                {fulfilledRequests.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {reopenedRequests.length} Reopened & handled
              </p>
            </div>
          </div>

          {/* Restored Original Visual Charts (Recharts Donut and Bar Charts) */}
          <AdminCharts requests={requests} users={users} />

          {/* Recent Broadcasts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Recent Emergency Requests
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Request Number</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Blood</th>
                    <th className="py-2.5 px-3">Hospital & City</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Donor</th>
                    <th className="py-2.5 px-3">Prescription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {r.requestNumber || r.id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {r.patientName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                          {r.bloodGroup}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {r.hospitalName}, {r.city || "Salem"}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2.5 px-3">
                        {r.acceptedByDonorName || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {r.documentPath ? (
                          <a
                            href={getDocumentUrl(r.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline text-[11px]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. DONOR DIRECTORY & PROFILES */}
      {activeSubTab === "donors" && <AdminDonorDirectory />}

      {/* 3. PATIENT MANAGEMENT & REQUEST HISTORY */}
      {activeSubTab === "patients" && <AdminPatientManagement />}

      {/* 4. BLOOD GROUP REPORTS */}
      {activeSubTab === "blood-groups" && <AdminBloodGroupReports />}

      {/* 5. DATE-WISE REPORTS & COMPLETE EXPORT CENTER */}
      {activeSubTab === "reports" && <AdminDateReports />}

      {/* 6. FRAUD REVIEW TAB */}
      {activeSubTab === "fraud" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Medical Officer Review Protocol:</span>{" "}
              Isolation Forest screens bulk requests (&gt;4 units), repeated velocity, and off-hour submissions. Flagged requests are withheld from broadcast until approved with verified clinical prescription documents.
            </div>
          </div>

          {flaggedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flaggedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono font-extrabold text-xs text-slate-900 block">
                        {req.requestNumber || req.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(req.createdAt)}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                      Anomaly Score: {req.anomalyScore}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p>
                      <strong>Patient:</strong> {req.patientName} (ID: {req.patientPublicId || "N/A"})
                    </p>
                    <p>
                      <strong>Demand:</strong> {req.unitsRequired} Units of{" "}
                      <span className="text-red-600 font-bold">{req.bloodGroup}</span>
                    </p>
                    <p>
                      <strong>Hospital:</strong> {req.hospitalName}, {req.city || "Salem"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {req.contactPhone}
                    </p>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Screening Flags Triggered:
                      </span>
                      <ul className="space-y-1">
                        {req.fraudIndicators.map((ind, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md"
                          >
                            ⚠️ {ind}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {req.documentPath && (
                      <div className="pt-2">
                        <a
                          href={getDocumentUrl(req.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline text-xs"
                        >
                          <ExternalLink className="w-4 h-4" /> Preview Hospital Prescription
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Approve & Broadcast
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No suspicious requests pending review"
              description="All emergency blood broadcasts are operating normally under standard AI verification."
            />
          )}
        </div>
      )}

      {/* 7. SMS PORTAL & LOGS TAB */}
      {activeSubTab === "sms" && <SmsPortalSection />}

      {/* 8. Hospital Management Tab */}
      {activeSubTab === "hospitals" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" />
              Hospital Master Registry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify pending hospitals, review custom submissions, and manage the hospital database.
            </p>
          </div>
          <AdminHospitalManagement />
        </div>
      )}

      {/* 9. Location Reports Tab */}
      {activeSubTab === "location-reports" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <AdminLocationReports />
        </div>
      )}
    </div>
  );
};

const SmsPortalSection: React.FC = () => {
  const [smsStatus, setSmsStatus] = useState<any>(null);
  const [logs, setLogs] = useState<SmsLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Test SMS State
  const [testPhone, setTestPhone] = useState<string>("9361111750");
  const [testMessage, setTestMessage] = useState<string>(
    "BloodGuard Test Alert: Fast2SMS portal is verified and working live."
  );
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    requestId?: string;
  } | null>(null);

  // Filter State
  const [filterRecipient, setFilterRecipient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        getApiSmsStatus(),
        getApiSmsLogs(100),
      ]);
      setSmsStatus(statusRes);
      setLogs(logsRes.logs || []);
      setTotalLogs(logsRes.total || (logsRes.logs || []).length);
    } catch (err: any) {
      console.error("Failed to load SMS portal data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Auto-refresh logs every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendApiTestSms(testPhone.trim(), testMessage.trim());
      if (res.result?.success) {
        setTestResult({
          success: true,
          message: `SMS delivered successfully!`,
          requestId: res.result.requestId,
        });
      } else {
        setTestResult({
          success: false,
          message: res.result?.error || res.note || "Failed to deliver SMS.",
        });
      }
      loadData();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while sending SMS.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterRecipient !== "all" && log.recipientType !== filterRecipient) {
      return false;
    }
    if (filterStatus !== "all" && log.status !== filterStatus) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast2SMS Gateway Status */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-rose-50 to-white border border-red-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <h2 className="text-lg font-extrabold text-slate-900">
              Fast2SMS Automated Emergency Gateway
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              LIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Real-time SMS notification center. BloodGuard automatically delivers emergency alerts to eligible donors, acceptance confirmation to patients, and security audit notices to Admin.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadData();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all self-start md:self-center"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-slate-500 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          <span>{refreshing ? "Refreshing..." : "Refresh Portal"}</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gateway Provider
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">
            Fast2SMS (bulkV2)
          </div>
          <p className="text-xs text-emerald-700 font-semibold mt-0.5">
            {smsStatus?.configured
              ? "API Key Active & Operational"
              : "Checking gateway status..."}
          </p>
          <span className="text-[10px] text-slate-400 block mt-2">
            Route: Quick SMS (q) • Direct Indian Telecom
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Admin Alert Phone
            </span>
            <Phone className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">
            +91 {smsStatus?.adminPhone || "9361111750"}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Designated Admin Emergency Number
          </p>
          <span className="text-[10px] text-slate-400 block mt-2">
            Receives all audit notices & fraud alerts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total SMS Dispatched
            </span>
            <MessageSquare className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">
            {totalLogs} Outbound Logs
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {logs.filter((l) => l.status === "sent").length} Confirmed Delivered
          </p>
          <span className="text-[10px] text-slate-400 block mt-2">
            Tracked in MongoDB SmsLog archive
          </span>
        </div>
      </div>

      {/* AUTOMATIC SMS WORKFLOW SUMMARY INFO */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Active Automatic SMS Triggers</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-red-600 block mb-0.5">
              1. Patient Creates Request
            </span>
            <p className="text-slate-600">
              System finds ALL eligible matching donors (ABO/Rh match + available + 56-day rule) and automatically sends emergency SMS alert to their phones.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-emerald-600 block mb-0.5">
              2. Donor Accepts Request
            </span>
            <p className="text-slate-600">
              System locks request atomically, increments donor total donations, and automatically sends SMS to the patient with donor's name, phone, and blood group.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-amber-600 block mb-0.5">
              3. Admin Security Alerts
            </span>
            <p className="text-slate-600">
              Real-time audit SMS sent to Admin ({smsStatus?.adminPhone || "9361111750"}) for every emergency request, acceptance confirmation, and AI fraud flag.
            </p>
          </div>
        </div>
      </div>

      {/* LIVE TEST SMS CONSOLE */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-700" />
              <span>Live Fast2SMS Test Console</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Test instant real-time SMS delivery to any 10-digit Indian mobile number.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400">Quick Fill:</span>
            <button
              type="button"
              onClick={() => setTestPhone("9361111750")}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              Admin (9361111750)
            </button>
          </div>
        </div>

        <form onSubmit={handleSendTest} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Mobile (Indian 10-digit)
              </label>
              <input
                type="text"
                placeholder="e.g. 9361111750"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMS Message Text
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              ⚡ Sent via Fast2SMS API with live delivery confirmation.
            </span>
            <button
              type="submit"
              disabled={sendingTest || !testPhone.trim()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              {sendingTest ? "Sending..." : "Send Test SMS Now"}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-medium ${
              testResult.success
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* RECENT FAST2SMS DISPATCH LOGS */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recent Fast2SMS Outbound Logs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing last {filteredLogs.length} dispatched messages from database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRecipient}
              onChange={(e) => setFilterRecipient(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">All Recipients</option>
              <option value="donor">Donors</option>
              <option value="patient">Patients</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Recipient Type</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Message Snippet</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.slice(0, 15).map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-semibold text-slate-900 capitalize">
                    {log.recipientType}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600">
                    {log.phone}
                  </td>
                  <td className="py-2 px-3 max-w-xs truncate text-slate-600">
                    {log.message}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {formatDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
