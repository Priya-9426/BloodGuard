import React, { useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { EmergencyRequest } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";
import { CreateRequestModal } from "./CreateRequestModal";
import { EmptyState } from "../components/common/EmptyState";
import { DonorSearchSection } from "../components/common/DonorSearchSection";
import { formatDateTime } from "../utils/eligibility";
import { getDocumentUrl } from "../utils/api";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  Radio,
  Building2,
  FileText,
  Download,
  Search,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export const PatientDashboard: React.FC = () => {
  const { currentUser, requests, fulfillEmergencyRequest } = useBloodGuard();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const patientRequests = requests.filter(
    (r) => r.patientId === currentUser.id,
  );
  const displayRequests = patientRequests;

  const acceptedRequests = displayRequests.filter(
    (r) => r.status === "accepted",
  );

  const activeCount = displayRequests.filter(
    (r) => r.status === "broadcasting" || r.status === "accepted",
  ).length;
  const pendingCount = displayRequests.filter(
    (r) => r.status === "screening" || r.status === "suspicious_review",
  ).length;
  const fulfilledCount = displayRequests.filter(
    (r) => r.status === "fulfilled",
  ).length;

  const patientPublicId =
    currentUser.patientId || `PD${String(currentUser.phone).slice(-5)}`;

  // Download Patient History as CSV
  const handleDownloadCSV = () => {
    const headers = [
      "Request Number",
      "Blood Group",
      "Units",
      "Hospital",
      "City",
      "Status",
      "Accepted Donor Name",
      "Accepted Donor Public ID",
      "Created Date",
    ];
    const rows = displayRequests.map((r) => [
      `"${r.requestNumber || r.id}"`,
      `"${r.bloodGroup}"`,
      r.unitsRequired,
      `"${(r.hospitalName || "").replace(/"/g, '""')}"`,
      `"${r.city || "Salem"}"`,
      `"${r.status}"`,
      `"${(r.acceptedByDonorName || "None").replace(/"/g, '""')}"`,
      `"${r.acceptedByDonorPublicId || ""}"`,
      `"${r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : ""}"`,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bloodguard_patient_history_${patientPublicId}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Patient History as clean printable PDF (Section 13)
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = displayRequests
      .map(
        (r) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-weight:bold;">${r.requestNumber || r.id}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">${r.bloodGroup}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.unitsRequired}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.hospitalName}, ${r.city || "Salem"}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.status.toUpperCase()}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.acceptedByDonorName ? `${r.acceptedByDonorName} (${r.acceptedByDonorPhone || ""})` : "None"}</td>
        <td style="padding:8px;border:1px solid #ddd;font-size:11px;">${new Date(r.createdAt).toLocaleString("en-IN")}</td>
      </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Patient Request History — ${patientPublicId}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
          h1 { color: #dc2626; margin-bottom: 4px; font-size: 22px; }
          .header-meta { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
          th { background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>🩸 BloodGuard — Patient Emergency Request History</h1>
        <div class="header-meta">
          <strong>Patient Name:</strong> ${currentUser.name}<br>
          <strong>Patient ID:</strong> ${patientPublicId}<br>
          <strong>Contact:</strong> ${currentUser.phone}<br>
          <strong>Report Generated:</strong> ${new Date().toLocaleString("en-IN")}
        </div>
        <table>
          <thead>
            <tr>
              <th>Request Number</th>
              <th>Blood Group</th>
              <th>Units</th>
              <th>Hospital & City</th>
              <th>Status</th>
              <th>Accepted Donor</th>
              <th>Date Created</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="padding:16px;text-align:center;">No emergency requests logged.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          BloodGuard Platform • Generated from verified database records.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Patient ID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Good Day, {currentUser.name}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-red-100 text-red-700">
              ID: {patientPublicId}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Coordinate emergency blood broadcasts and connect directly with verified matching donors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-all shrink-0"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>{showSearch ? "Hide Donor Search" : "Search Donors"}</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Emergency Request</span>
          </button>
        </div>
      </div>

      {/* Embedded Donor Search Section (Section 5) */}
      {showSearch && <DonorSearchSection />}

      {/* SECTION: Accepted Requests - DONOR FOUND (Section 6, 8, 11) */}
      {acceptedRequests.length > 0 && (
        <div className="space-y-4">
          {acceptedRequests.map((req) => (
            <div
              key={req.id}
              className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-600 animate-ping" />
                  <h2 className="font-extrabold text-base text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ✅ DONOR CONFIRMED FOR {req.requestNumber || req.id}
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-xs">
                  Status: Accepted
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-xs">
                  <span className="text-emerald-800/70 font-semibold block text-[10px] uppercase">
                    Accepted Donor Name
                  </span>
                  <strong className="text-sm text-slate-900 mt-0.5 block">
                    {req.acceptedByDonorName || "Verified Donor"}
                  </strong>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {req.acceptedByDonorPublicId || "DN-Registered"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-xs">
                  <span className="text-emerald-800/70 font-semibold block text-[10px] uppercase">
                    Blood Group
                  </span>
                  <strong className="text-sm text-red-600 mt-0.5 block">
                    {req.bloodGroup}
                  </strong>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-xs">
                  <span className="text-emerald-800/70 font-semibold block text-[10px] uppercase">
                    Donor Phone Number
                  </span>
                  <strong className="text-sm font-mono text-slate-900 mt-0.5 block">
                    {req.acceptedByDonorPhone || "Available via Hospital"}
                  </strong>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-emerald-800/70 font-semibold block text-[10px] uppercase">
                      Actions
                    </span>
                    <strong className="text-xs text-slate-700 truncate block mt-0.5">
                      {req.hospitalName}
                    </strong>
                  </div>
                  <button
                    onClick={() => fulfillEmergencyRequest(req.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all shrink-0"
                  >
                    Mark Fulfilled
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Broadcasts
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1">
            {activeCount}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-500 animate-ping" />
            Live broadcast to donors
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Under AI Screening
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
            {pendingCount}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            Clinical security review
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fulfilled Donations
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
            {fulfilledCount}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Successfully transfused
          </p>
        </div>
      </div>

      {/* SECTION: Patient Request History (Section 13) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Patient Request History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequential request numbers, timestamps, donor connections, and authorized medical prescriptions.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {displayRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Request Number</th>
                  <th className="py-3 px-3">Blood Group</th>
                  <th className="py-3 px-3">Units</th>
                  <th className="py-3 px-3">Hospital & City</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Donor</th>
                  <th className="py-3 px-3">Prescription</th>
                  <th className="py-3 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                      {r.requestNumber || r.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[11px]">
                        {r.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {r.unitsRequired}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="font-semibold text-slate-800">
                        {r.hospitalName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.city || "Salem"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3">
                      {r.acceptedByDonorName ? (
                        <div>
                          <span className="font-bold text-emerald-700 block">
                            {r.acceptedByDonorName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 block">
                            {r.acceptedByDonorPhone || ""}
                          </span>
                        </div>
                      ) : r.status === "broadcasting" ? (
                        <span className="text-red-600 font-semibold">
                          Broadcasting...
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No emergency requests yet"
            description="When you create an emergency blood broadcast, it will appear here with live donor connection status."
            actionText="+ Create First Request"
            onAction={() => setIsCreateModalOpen(true)}
          />
        )}
      </div>

      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
