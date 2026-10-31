import React, { useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { EmergencyRequest } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";
import {
  calculateDonorEligibility,
  formatDate,
  formatDateTime,
} from "../utils/eligibility";
import { Modal } from "../components/common/Modal";
import { EmptyState } from "../components/common/EmptyState";
import { getDocumentUrl } from "../utils/api";
import {
  Radio,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Building2,
  Phone,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export const DonorDashboard: React.FC = () => {
  const {
    currentUser,
    requests,
    toggleAvailability,
    acceptEmergencyRequest,
    declineEmergencyRequest,
    releaseEmergencyRequest,
    updateLastDonationDate,
  } = useBloodGuard();

  const [selectedAlert, setSelectedAlert] = useState<EmergencyRequest | null>(
    null,
  );
  const [showDonationDateModal, setShowDonationDateModal] = useState(false);
  const [newDonationDate, setNewDonationDate] = useState(
    currentUser.lastDonationDate || "",
  );

  // Release Request Modal (Section 10)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseTargetRequest, setReleaseTargetRequest] =
    useState<EmergencyRequest | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);

  const donorPublicId =
    currentUser.donorId || `DN${String(currentUser.phone).slice(-5)}`;

  // Calculate dynamic eligibility (56-day rule)
  const eligibility = calculateDonorEligibility(currentUser);

  // Filter emergency alerts matching donor's blood group
  const activeAlerts = requests.filter(
    (r) =>
      (r.status === "broadcasting" || r.status === "accepted") &&
      r.bloodGroup === currentUser.bloodGroup &&
      !r.declinedByDonorIds?.includes(currentUser.id) &&
      !r.releasedDonorIds?.includes(currentUser.id) &&
      eligibility.isEligible,
  );

  // Accepted or fulfilled requests by this donor
  const myDonationHistory = requests.filter(
    (r) => r.acceptedByDonorId === currentUser.id,
  );

  const handleAccept = (req: EmergencyRequest) => {
    acceptEmergencyRequest(req.id);
    setSelectedAlert(null);
  };

  const handleDecline = (req: EmergencyRequest) => {
    declineEmergencyRequest(req.id);
    setSelectedAlert(null);
  };

  const handleOpenRelease = (req: EmergencyRequest) => {
    setReleaseTargetRequest(req);
    setReleaseReason("");
    setReleaseModalOpen(true);
  };

  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseTargetRequest) return;
    setIsReleasing(true);
    try {
      await releaseEmergencyRequest(
        releaseTargetRequest.id,
        releaseReason || "Unable to donate at scheduled hospital.",
      );
      setReleaseModalOpen(false);
      setReleaseTargetRequest(null);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleUpdateDate = (e: React.FormEvent) => {
    e.preventDefault();
    updateLastDonationDate(newDonationDate);
    setShowDonationDateModal(false);
  };

  // Download Donor History as CSV
  const handleDownloadCSV = () => {
    const headers = [
      "Donor Reference",
      "Patient Request Number",
      "Blood Group",
      "Hospital",
      "City",
      "Patient Name",
      "Status",
      "Accepted At",
    ];
    const rows = myDonationHistory.map((r, i) => [
      `"${r.acceptanceReference || r.donorReference || `${donorPublicId}-ACC-${String(i + 1).padStart(3, "0")}`}"`,
      `"${r.requestNumber || r.id}"`,
      `"${r.bloodGroup}"`,
      `"${(r.hospitalName || "").replace(/"/g, '""')}"`,
      `"${r.city || "Salem"}"`,
      `"${(r.patientName || "").replace(/"/g, '""')}"`,
      `"${r.status === "fulfilled" ? "COMPLETED DONATION" : "ACCEPTED"}"`,
      `"${r.acceptedAt ? new Date(r.acceptedAt).toLocaleString("en-IN") : "N/A"}"`,
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
      `bloodguard_donor_history_${donorPublicId}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Donor History as clean printable PDF (Section 14)
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = myDonationHistory
      .map(
        (r) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-family:monospace;font-weight:bold;">${r.requestNumber || r.id}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">${r.bloodGroup}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.hospitalName}, ${r.city || "Salem"}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.patientName}</td>
        <td style="padding:8px;border:1px solid #ddd;">${r.status === "fulfilled" ? "COMPLETED DONATION" : "ACCEPTED"}</td>
        <td style="padding:8px;border:1px solid #ddd;font-size:11px;">${r.acceptedAt ? new Date(r.acceptedAt).toLocaleString("en-IN") : "N/A"}</td>
      </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Donor History — ${donorPublicId}</title>
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
        <h1>🩸 BloodGuard — Verified Donor History</h1>
        <div class="header-meta">
          <strong>Donor Name:</strong> ${currentUser.name}<br>
          <strong>Donor Public ID:</strong> ${donorPublicId}<br>
          <strong>Blood Group:</strong> ${currentUser.bloodGroup || "O+"}<br>
          <strong>Total Completed Donations:</strong> ${currentUser.totalDonations || 0}<br>
          <strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}
        </div>
        <table>
          <thead>
            <tr>
              <th>Request Number</th>
              <th>Blood Group</th>
              <th>Hospital & City</th>
              <th>Patient</th>
              <th>Status</th>
              <th>Accepted Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding:16px;text-align:center;">No donation records logged.</td></tr>'}
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
      {/* Top Header & Large Donation Availability Toggle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-red-100 text-red-700">
              ID: {donorPublicId} • {currentUser.bloodGroup || "O+"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Emergency broadcasts matching your blood group are delivered via Fast2SMS and live dashboard alerts.
          </p>
        </div>

        {/* Availability Control Card */}
        <div className="flex items-center gap-4 p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Donation Availability
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${currentUser.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
              />
              <span
                className={`text-sm font-extrabold ${currentUser.isAvailable ? "text-emerald-700" : "text-rose-700"}`}
              >
                {currentUser.isAvailable ? "🟢 AVAILABLE" : "🔴 UNAVAILABLE"}
              </span>
            </div>
          </div>

          <button
            onClick={() => toggleAvailability()}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
              currentUser.isAvailable
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {currentUser.isAvailable ? "Turn Off" : "Turn On"}
          </button>
        </div>
      </div>

      {/* SECTION: 56-Day Clinical Eligibility Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          eligibility.isEligible
            ? "bg-emerald-50/70 border-emerald-200"
            : "bg-amber-50/70 border-amber-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                eligibility.isEligible
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {eligibility.isEligible ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {eligibility.isEligible
                  ? "Clinically Eligible to Donate Whole Blood"
                  : "Clinical Refractory Waiting Period Active"}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {eligibility.isEligible
                  ? "You satisfy the clinical 56-day whole blood donation rule and can respond to emergency alerts."
                  : eligibility.ineligibilityReason}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDonationDateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Update Last Donation Date</span>
          </button>
        </div>
      </div>

      {/* SECTION: Live Emergency Alerts Matching Donor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-red-600 animate-ping" />
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Live Matching Blood Alerts ({currentUser.bloodGroup || "O+"})
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {activeAlerts.length} Active
          </span>
        </div>

        {activeAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map((req) => {
              const isAcceptedByMe = req.acceptedByDonorId === currentUser.id;
              const isAcceptedByOther =
                req.status === "accepted" && !isAcceptedByMe;

              return (
                <div
                  key={req.id}
                  className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                    isAcceptedByMe
                      ? "bg-emerald-50/50 border-emerald-400 shadow-sm"
                      : isAcceptedByOther
                        ? "bg-slate-50 border-slate-300 opacity-80"
                        : "bg-white border-red-200 hover:border-red-400 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {req.donorReference && (
                          <span className="font-mono font-extrabold text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {req.donorReference}
                          </span>
                        )}
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {req.requestNumber || req.id}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(req.createdAt)}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-extrabold text-xs">
                      {req.bloodGroup} • {req.unitsRequired} Unit{req.unitsRequired > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {req.hospitalName}, {req.city || "Salem"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Patient Contact: {req.contactPhone}</span>
                    </div>
                    {req.documentPath && (
                      <div className="pt-1">
                        <a
                          href={getDocumentUrl(req.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline text-[11px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Prescription
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100">
                    {isAcceptedByMe ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Accepted by You
                        </span>
                        {/* Section 10: Unable to Donate / Release */}
                        <button
                          onClick={() => handleOpenRelease(req)}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Unable to Donate / Release</span>
                        </button>
                      </div>
                    ) : isAcceptedByOther ? (
                      <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-semibold text-center">
                        ✅ Already Accepted by Another Donor
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(req)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          Accept Emergency Request
                        </button>
                        <button
                          onClick={() => handleDecline(req)}
                          className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No active emergency alerts"
            description="All blood requirements matching your blood group are currently fulfilled. Keep your availability active to receive simultaneous alerts."
          />
        )}
      </div>

      {/* SECTION: My Donations & Response History (Section 14) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-red-600" />
              My Donation History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified record of accepted emergencies and completed clinical transfusions.
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

        {myDonationHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Donor Reference</th>
                  <th className="py-3 px-3">Request Number</th>
                  <th className="py-3 px-3">Blood Group</th>
                  <th className="py-3 px-3">Hospital & City</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Accepted At</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myDonationHistory.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-red-600">
                      {r.acceptanceReference || r.donorReference || `${donorPublicId}-ACC-${String(i + 1).padStart(3, "0")}`}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {r.requestNumber || r.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                        {r.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.hospitalName}, {r.city || "Salem"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {r.patientName}
                    </td>
                    <td className="py-3 px-3">
                      {r.status === "fulfilled" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Completed Donation
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                          Accepted
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {r.acceptedAt ? formatDateTime(r.acceptedAt) : "N/A"}
                    </td>
                    <td className="py-3 px-3">
                      {r.status === "accepted" && (
                        <button
                          onClick={() => handleOpenRelease(r)}
                          className="text-amber-700 hover:text-amber-800 font-bold text-[11px] underline"
                        >
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No donations recorded yet"
            description="When you accept emergency requests and complete blood donations, your verified history will be maintained here."
          />
        )}
      </div>

      {/* Modal: Update Last Donation Date */}
      <Modal
        isOpen={showDonationDateModal}
        onClose={() => setShowDonationDateModal(false)}
        title="Update Last Whole Blood Donation Date"
        subtitle="Ensures medical compliance with the clinical 56-day refractory interval."
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateDate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Last Donation Date
            </label>
            <input
              type="date"
              value={newDonationDate}
              onChange={(e) => setNewDonationDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDonationDateModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              Save Date
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Unable to Donate / Release Request (Section 10) */}
      <Modal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Unable to Donate / Release Request"
        subtitle="Releasing this request will atomically reopen it and immediately broadcast to other eligible matching donors."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRelease} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Notice:</strong> Please confirm if you are unable to reach the hospital or fulfill this donation. The request will immediately be re-notified to other eligible donors to prevent treatment delays.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Release (Required)
            </label>
            <textarea
              rows={3}
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="e.g. Sudden medical unfitness, unable to reach hospital in time, transportation issue..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReleaseModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Keep Acceptance
            </button>
            <button
              type="submit"
              disabled={isReleasing}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
            >
              {isReleasing ? "Releasing..." : "Confirm Release & Reopen"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
