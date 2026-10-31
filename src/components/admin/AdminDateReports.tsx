import React, { useState, useEffect } from "react";
import { DateReportsData, BloodGroup } from "../../types";
import { getApiAdminDateReports, getAuthToken } from "../../utils/api";
import { formatDateTime } from "../../utils/eligibility";
import {
  Calendar,
  Filter,
  Download,
  FileText,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export const AdminDateReports: React.FC = () => {
  // Default to last 30 days
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [city, setCity] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");

  const [data, setData] = useState<DateReportsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"created" | "accepted" | "released" | "completed">("created");

  const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await getApiAdminDateReports({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        city: city || undefined,
        bloodGroup: bloodGroup || undefined,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load date reports", err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleResetFilters = () => {
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setCity("");
    setBloodGroup("");
    setTimeout(() => {
      fetchReports();
    }, 50);
  };

  const handleExportCSV = (type: "donors" | "patients" | "requests" | "blood-groups") => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (city) params.append("city", city);
    if (bloodGroup) params.append("bloodGroup", bloodGroup);
    const token = getAuthToken();
    if (token) params.append("token", token);
    window.open(`/api/admin/export/${type}?${params.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const m = data.metrics || {
      requestsCreated: 0,
      requestsAccepted: 0,
      requestsReleased: 0,
      donationsCompleted: 0,
      patientRegistrations: 0,
      donorRegistrations: 0,
    };

    const createdRows = (data.requestsCreated || [])
      .map(
        (r) => `
        <tr>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: bold;">${r.requestNumber || "REQ"}</td>
          <td style="padding: 6px 10px;">${r.patientName || "Patient"}</td>
          <td style="padding: 6px 10px;">${r.hospitalName || "Hospital"}</td>
          <td style="padding: 6px 10px; font-weight: bold; color: #dc2626;">${r.bloodGroup}</td>
          <td style="padding: 6px 10px; text-transform: uppercase;">${r.status}</td>
          <td style="padding: 6px 10px;">${new Date(r.createdAt).toLocaleString("en-IN")}</td>
        </tr>
      `
      )
      .join("");

    const acceptedRows = (data.requestsAccepted || [])
      .map(
        (r: any) => `
        <tr>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: bold;">${r.requestNumber || "REQ"}</td>
          <td style="padding: 6px 10px;">${r.hospitalName || "Hospital"}</td>
          <td style="padding: 6px 10px; font-weight: bold; color: #dc2626;">${r.bloodGroup}</td>
          <td style="padding: 6px 10px;">${r.acceptedByDonorId?.name || "Donor"} (${r.acceptedByDonorId?.donorId || "DN"})</td>
          <td style="padding: 6px 10px;">${r.acceptedAt ? new Date(r.acceptedAt).toLocaleString("en-IN") : "N/A"}</td>
        </tr>
      `
      )
      .join("");

    const releasedRows = (data.releasedEvents || [])
      .map(
        (r: any) => `
        <tr>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: bold;">${r.requestNumber || "REQ"}</td>
          <td style="padding: 6px 10px;">${r.hospitalName || "Hospital"}</td>
          <td style="padding: 6px 10px;">${r.donorName || "Donor"} (${r.donorPublicId || "DN"})</td>
          <td style="padding: 6px 10px; color: #b45309;">${r.releaseReason || "Released"}</td>
          <td style="padding: 6px 10px;">${r.releasedAt ? new Date(r.releasedAt).toLocaleString("en-IN") : "N/A"}</td>
        </tr>
      `
      )
      .join("");

    const completedRows = (data.completedDonations || [])
      .map(
        (r: any) => `
        <tr>
          <td style="padding: 6px 10px; font-family: monospace; font-weight: bold;">${r.requestNumber || "REQ"}</td>
          <td style="padding: 6px 10px;">${r.hospitalName || "Hospital"}</td>
          <td style="padding: 6px 10px; font-weight: bold; color: #16a34a;">${r.bloodGroup} (${r.unitsRequired} units)</td>
          <td style="padding: 6px 10px;">${r.acceptedByDonorId?.name || "Donor"}</td>
          <td style="padding: 6px 10px;">${r.updatedAt ? new Date(r.updatedAt).toLocaleString("en-IN") : "N/A"}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Date-Wise Activity Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1f2937; }
          .header { border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 22px; font-weight: 700; color: #dc2626; }
          .subtitle { font-size: 13px; color: #4b5563; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 24px; }
          .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
          .kpi-title { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
          .kpi-value { font-size: 20px; font-weight: bold; color: #111827; margin-top: 4px; }
          h3 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
          td { border-bottom: 1px solid #f3f4f6; }
          .footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">🩸 BloodGuard Healthcare Platform</div>
          <div class="subtitle">Official Date-Wise Activity Audit | Period: ${fromDate} to ${toDate} | Generated: ${new Date().toLocaleString("en-IN")}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-title">Requests Created</div><div class="kpi-value" style="color: #dc2626;">${m.requestsCreated}</div></div>
          <div class="kpi-card"><div class="kpi-title">Accepted (In Period)</div><div class="kpi-value" style="color: #2563eb;">${m.requestsAccepted}</div></div>
          <div class="kpi-card"><div class="kpi-title">Released / Reopened</div><div class="kpi-value" style="color: #d97706;">${m.requestsReleased}</div></div>
          <div class="kpi-card"><div class="kpi-title">Donations Fulfilled</div><div class="kpi-value" style="color: #16a34a;">${m.donationsCompleted}</div></div>
          <div class="kpi-card"><div class="kpi-title">New Patients</div><div class="kpi-value">${m.patientRegistrations}</div></div>
          <div class="kpi-card"><div class="kpi-title">New Donors</div><div class="kpi-value">${m.donorRegistrations}</div></div>
        </div>

        <h3>1. Requests Created in Period (${data.requestsCreated?.length || 0})</h3>
        <table>
          <thead><tr><th>Request ID</th><th>Patient</th><th>Hospital</th><th>Blood Group</th><th>Status</th><th>Created At</th></tr></thead>
          <tbody>${createdRows || '<tr><td colspan="6" style="padding:10px;text-align:center;">No requests created in period</td></tr>'}</tbody>
        </table>

        <h3>2. Requests Accepted in Period (${data.requestsAccepted?.length || 0})</h3>
        <table>
          <thead><tr><th>Request ID</th><th>Hospital</th><th>Blood Group</th><th>Accepted By Donor</th><th>Accepted At</th></tr></thead>
          <tbody>${acceptedRows || '<tr><td colspan="5" style="padding:10px;text-align:center;">No acceptances recorded in period</td></tr>'}</tbody>
        </table>

        <h3>3. Requests Released / Reopened in Period (${data.releasedEvents?.length || 0})</h3>
        <table>
          <thead><tr><th>Request ID</th><th>Hospital</th><th>Released Donor</th><th>Release Reason</th><th>Released At</th></tr></thead>
          <tbody>${releasedRows || '<tr><td colspan="5" style="padding:10px;text-align:center;">No release events in period</td></tr>'}</tbody>
        </table>

        <h3>4. Donations Completed in Period (${data.completedDonations?.length || 0})</h3>
        <table>
          <thead><tr><th>Request ID</th><th>Hospital</th><th>Blood Group & Units</th><th>Completed By Donor</th><th>Completed At</th></tr></thead>
          <tbody>${completedRows || '<tr><td colspan="5" style="padding:10px;text-align:center;">No completed donations in period</td></tr>'}</tbody>
        </table>

        <div class="footer">
          BloodGuard Administrative Audit Report — Confidential Medical Data
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const metrics = data?.metrics || {
    requestsCreated: 0,
    requestsAccepted: 0,
    requestsReleased: 0,
    donationsCompleted: 0,
    patientRegistrations: 0,
    donorRegistrations: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Form */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-red-600" />
              Date-Wise Activity Reports
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Audit emergency events by actual timestamps: creation, donor acceptance, release/reopening, and fulfilled donations.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={isLoading || !data}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Print Period PDF Report
          </button>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Salem, Chennai..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">All Blood Groups</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? "Filtering..." : "Apply Filters"}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* KPI Cards for Filtered Range */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Requests Created</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{metrics.requestsCreated}</p>
          <span className="text-[11px] text-gray-400">in period</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Requests Accepted</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.requestsAccepted}</p>
          <span className="text-[11px] text-gray-400">by acceptedAt</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Released / Reopened</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.requestsReleased}</p>
          <span className="text-[11px] text-gray-400">by releasedAt</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Donations Completed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.donationsCompleted}</p>
          <span className="text-[11px] text-gray-400">fulfilled</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">New Patients</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.patientRegistrations}</p>
          <span className="text-[11px] text-gray-400">registered</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">New Donors</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{metrics.donorRegistrations}</p>
          <span className="text-[11px] text-gray-400">registered</span>
        </div>
      </div>

      {/* Complete Export Center Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 rounded-xl border border-red-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-red-600" />
              Complete Export Center
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              One-click instant CSV exports with real database records and full audit traceability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handleExportCSV("donors")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 rounded-xl text-xs font-bold text-gray-800 hover:bg-red-50/50 hover:border-red-300 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export All Donors (CSV)
          </button>
          <button
            onClick={() => handleExportCSV("patients")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 rounded-xl text-xs font-bold text-gray-800 hover:bg-red-50/50 hover:border-red-300 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export All Patients (CSV)
          </button>
          <button
            onClick={() => handleExportCSV("requests")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 rounded-xl text-xs font-bold text-gray-800 hover:bg-red-50/50 hover:border-red-300 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export All Requests (CSV)
          </button>
          <button
            onClick={() => handleExportCSV("blood-groups")}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 rounded-xl text-xs font-bold text-gray-800 hover:bg-red-50/50 hover:border-red-300 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export Blood Groups (CSV)
          </button>
        </div>
      </div>

      {/* Activity Table with Sub-Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("created")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === "created"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Requests Created ({data?.requestsCreated?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("accepted")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === "accepted"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Accepted in Period ({data?.requestsAccepted?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("released")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === "released"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Released / Reopened ({data?.releasedEvents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === "completed"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Completed Donations ({data?.completedDonations?.length || 0})
          </button>
        </div>

        {/* Tab 1: Requests Created */}
        {activeTab === "created" && (
          <div className="overflow-x-auto">
            {!data?.requestsCreated || data.requestsCreated.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500">No emergency requests created in this date range.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                    <th className="p-3">Request Number</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Hospital & City</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">Units</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.requestsCreated.map((r: any) => (
                    <tr key={r._id} className="hover:bg-red-50/20 transition">
                      <td className="p-3 font-mono font-bold text-red-600">{r.requestNumber || "REQ"}</td>
                      <td className="p-3 font-medium text-gray-900">{r.patientName}</td>
                      <td className="p-3 text-gray-600">
                        {r.hospitalName}, {r.city}
                      </td>
                      <td className="p-3 font-bold text-gray-800">{r.bloodGroup}</td>
                      <td className="p-3 font-medium text-gray-700">{r.unitsRequired}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Requests Accepted */}
        {activeTab === "accepted" && (
          <div className="overflow-x-auto">
            {!data?.requestsAccepted || data.requestsAccepted.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500">No requests accepted in this date range.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                    <th className="p-3">Request Number</th>
                    <th className="p-3">Hospital</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">Accepted Donor</th>
                    <th className="p-3">Donor ID</th>
                    <th className="p-3">Accepted Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.requestsAccepted.map((r: any) => (
                    <tr key={r._id} className="hover:bg-blue-50/20 transition">
                      <td className="p-3 font-mono font-bold text-blue-600">{r.requestNumber || "REQ"}</td>
                      <td className="p-3 text-gray-800">{r.hospitalName}</td>
                      <td className="p-3 font-bold text-gray-900">{r.bloodGroup}</td>
                      <td className="p-3 font-medium text-gray-900">{r.acceptedByDonorId?.name || "Donor"}</td>
                      <td className="p-3 font-mono text-gray-600">{r.acceptedByDonorId?.donorId || "N/A"}</td>
                      <td className="p-3 text-blue-700 font-medium">{formatDateTime(r.acceptedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Released / Reopened */}
        {activeTab === "released" && (
          <div className="overflow-x-auto">
            {!data?.releasedEvents || data.releasedEvents.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500">No release/reopening events recorded in this date range.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                    <th className="p-3">Request Number</th>
                    <th className="p-3">Hospital</th>
                    <th className="p-3">Donor Name</th>
                    <th className="p-3">Donor Public ID</th>
                    <th className="p-3">Release Reason</th>
                    <th className="p-3">Accepted At</th>
                    <th className="p-3">Released At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.releasedEvents.map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-amber-50/20 transition">
                      <td className="p-3 font-mono font-bold text-gray-800">{e.requestNumber || "REQ"}</td>
                      <td className="p-3 text-gray-700">{e.hospitalName}</td>
                      <td className="p-3 font-medium text-gray-900">{e.donorName || "Donor"}</td>
                      <td className="p-3 font-mono text-gray-600">{e.donorPublicId || "N/A"}</td>
                      <td className="p-3 text-amber-800 font-medium">{e.releaseReason || "Donor released"}</td>
                      <td className="p-3 text-gray-500">{formatDateTime(e.acceptedAt)}</td>
                      <td className="p-3 text-amber-700 font-semibold">{formatDateTime(e.releasedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Completed Donations */}
        {activeTab === "completed" && (
          <div className="overflow-x-auto">
            {!data?.completedDonations || data.completedDonations.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500">No fulfilled donations in this date range.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                    <th className="p-3">Request Number</th>
                    <th className="p-3">Hospital</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">Units Donated</th>
                    <th className="p-3">Donor</th>
                    <th className="p-3">Fulfilled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.completedDonations.map((d: any) => (
                    <tr key={d._id} className="hover:bg-emerald-50/20 transition">
                      <td className="p-3 font-mono font-bold text-emerald-700">{d.requestNumber || "REQ"}</td>
                      <td className="p-3 text-gray-800">{d.hospitalName}</td>
                      <td className="p-3 font-bold text-gray-900">{d.bloodGroup}</td>
                      <td className="p-3 font-semibold text-gray-700">{d.unitsRequired}</td>
                      <td className="p-3 font-medium text-gray-900">{d.acceptedByDonorId?.name || "Donor"}</td>
                      <td className="p-3 text-emerald-700 font-medium">{formatDateTime(d.updatedAt || d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
