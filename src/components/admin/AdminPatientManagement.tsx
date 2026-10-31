import React, { useState, useEffect } from "react";
import { PatientManagementItem, PatientHistoryData } from "../../types";
import { getApiAdminPatients, getApiAdminPatientHistory, getAuthToken } from "../../utils/api";
import { Modal } from "../common/Modal";
import { formatDateTime } from "../../utils/eligibility";
import {
  UserCheck,
  Search,
  Download,
  Eye,
  FileText,
  Clock,
  Building2,
  CheckCircle2,
  RotateCcw,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";

export const AdminPatientManagement: React.FC = () => {
  const [patientIdQuery, setPatientIdQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [patients, setPatients] = useState<PatientManagementItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected patient for detailed history modal
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<PatientHistoryData | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const fetchPatients = async (targetPage = 1) => {
    setIsLoading(true);
    try {
      const data = await getApiAdminPatients({
        patientId: patientIdQuery || undefined,
        search: searchQuery || undefined,
        city: city || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: targetPage,
        limit: 15,
      });
      setPatients(data.patients || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      console.error(err);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(1);
  };

  const handleOpenHistory = async (id: string) => {
    setSelectedPatientId(id);
    setIsLoadingHistory(true);
    try {
      const data = await getApiAdminPatientHistory(id);
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to load patient history", err);
      setHistoryData(null);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleExportCSV = () => {
    const id = historyData?.patient?._id || historyData?.patient?.id;
    if (!id) return;
    const token = getAuthToken();
    const params = new URLSearchParams({ id: String(id) });
    if (token) params.append("token", token);
    window.open(`/api/admin/export/patient-history?${params.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    if (!historyData?.patient) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const p = historyData.patient;
    const stats = historyData.stats || { totalRequests: 0, openRequests: 0, acceptedRequests: 0, fulfilledRequests: 0, cancelledRequests: 0, reopenedRequests: 0 };
    const reqs = historyData.requests || [];

    const rowsHtml = reqs
      .map(
        (r) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;font-family:monospace;font-weight:bold;">${r.requestNumber || r.id}</td>
        <td style="padding:6px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">${r.bloodGroup}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.unitsRequired}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.hospitalName}, ${r.city || "Salem"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-transform:uppercase;font-weight:bold;">${r.status}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.acceptedByDonorName || "—"}</td>
        <td style="padding:6px;border:1px solid #ddd;font-size:11px;">${new Date(r.createdAt).toLocaleString("en-IN")}</td>
      </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Patient Request History — ${p.patientId || p.name}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
          h1 { color: #dc2626; margin-bottom: 4px; font-size: 22px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; line-height: 1.6; font-size: 13px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; background: #fff; }
          .kpi-val { font-size: 18px; font-weight: bold; color: #dc2626; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 14px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>🩸 BloodGuard — Patient Clinical Request History Audit</h1>
        <div class="meta-box">
          <strong>Patient ID:</strong> ${p.patientId || "N/A"} &nbsp;|&nbsp;
          <strong>Name:</strong> ${p.name} &nbsp;|&nbsp;
          <strong>Phone:</strong> ${p.phone} &nbsp;|&nbsp;
          <strong>Email:</strong> ${p.email} &nbsp;|&nbsp;
          <strong>City:</strong> ${p.city || "Salem"}<br>
          <strong>Registered Date:</strong> ${new Date(p.createdAt || Date.now()).toLocaleDateString("en-IN")} &nbsp;|&nbsp;
          <strong>Report Generated:</strong> ${new Date().toLocaleString("en-IN")}
        </div>
        <div class="kpi-grid">
          <div class="kpi-card"><div>Total Requests</div><div class="kpi-val">${stats.totalRequests || 0}</div></div>
          <div class="kpi-card"><div>Active Broadcast</div><div class="kpi-val">${stats.openRequests || 0}</div></div>
          <div class="kpi-card"><div>Accepted</div><div class="kpi-val">${stats.acceptedRequests || 0}</div></div>
          <div class="kpi-card"><div>Fulfilled</div><div class="kpi-val">${stats.fulfilledRequests || 0}</div></div>
          <div class="kpi-card"><div>Cancelled</div><div class="kpi-val">${stats.cancelledRequests || 0}</div></div>
          <div class="kpi-card"><div>Reopened</div><div class="kpi-val">${stats.reopenedRequests || 0}</div></div>
        </div>
        <h3>All Emergency Broadcast Requests</h3>
        <table>
          <thead>
            <tr>
              <th>Request Number</th>
              <th>Blood</th>
              <th>Units</th>
              <th>Hospital & City</th>
              <th>Status</th>
              <th>Accepted Donor</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="padding:16px;text-align:center;">No emergency requests on record.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          BloodGuard Administrative Record • Clinical Verification • Zero Automated Algorithmic Deprioritization
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            Patient Management & Request Histories
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search patient records by Patient ID, inspect complete authorized request histories, and export clinical audit reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const token = getAuthToken();
              const params = token ? `?token=${token}` : "";
              window.open(`/api/admin/export/patients${params}`, "_blank");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export All Patients (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearch} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Patient ID</label>
            <input
              type="text"
              placeholder="e.g. PD11750"
              value={patientIdQuery}
              onChange={(e) => setPatientIdQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Search Name / Phone</label>
            <input
              type="text"
              placeholder="Name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">City</label>
            <input
              type="text"
              placeholder="Salem"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isLoading ? "Searching..." : "Search Patients"}
            </button>
          </div>
        </div>
      </form>

      {/* Patients Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Found {total} patient accounts</span>
          <span>Page {page} of {pages}</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Patient ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Total Requests</th>
                <th className="py-2.5 px-3">Active</th>
                <th className="py-2.5 px-3">Fulfilled</th>
                <th className="py-2.5 px-3">Reopened</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No patients found matching criteria.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                      {p.patientId || `PD${String(p.phone).slice(-5)}`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.phone}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.city || "Salem"}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">{p.totalRequests || 0}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                        {p.openRequests || 0} Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {p.fulfilledRequests || 0} Fulfilled
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-amber-700">{p.reopenedRequests || 0}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleOpenHistory(p._id || p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchPatients(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => fetchPatients(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* INDIVIDUAL PATIENT HISTORY MODAL (Section 5) */}
      {selectedPatientId && (
        <Modal
          isOpen={Boolean(selectedPatientId)}
          onClose={() => setSelectedPatientId(null)}
          title={`Patient Emergency Request History — ${historyData?.patient?.name || "Loading..."}`}
          maxWidth="max-w-4xl"
        >
          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading patient emergency requests and clinical records...
            </div>
          ) : historyData?.patient ? (
            <div className="space-y-5">
              {/* Patient Info Header Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient ID</span>
                  <span className="font-mono font-extrabold text-red-600 text-sm">
                    {historyData.patient.patientId || `PD${String(historyData.patient.phone).slice(-5)}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Name</span>
                  <span className="font-bold text-slate-900 text-sm">{historyData.patient.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-mono text-slate-700">{historyData.patient.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">City</span>
                  <span className="text-slate-700">{historyData.patient.city || "Salem"}</span>
                </div>
              </div>

              {/* 5 KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Requests</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {historyData.stats?.totalRequests || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Broadcasting</span>
                  <div className="text-base font-extrabold text-red-600 mt-0.5">
                    {historyData.stats?.openRequests || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Accepted</span>
                  <div className="text-base font-extrabold text-blue-600 mt-0.5">
                    {historyData.stats?.acceptedRequests || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Fulfilled</span>
                  <div className="text-base font-extrabold text-emerald-600 mt-0.5">
                    {historyData.stats?.fulfilledRequests || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Reopened</span>
                  <div className="text-base font-extrabold text-amber-600 mt-0.5">
                    {historyData.stats?.reopenedRequests || 0}
                  </div>
                </div>
              </div>

              {/* Requests History Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Complete Clinical Request Log
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Request Number</th>
                        <th className="py-2.5 px-3">Blood Group</th>
                        <th className="py-2.5 px-3">Units</th>
                        <th className="py-2.5 px-3">Hospital & City</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Accepted Donor</th>
                        <th className="py-2.5 px-3">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyData.requests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No emergency requests found for this patient.
                          </td>
                        </tr>
                      ) : (
                        historyData.requests.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                              {r.requestNumber || r.id}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[11px]">
                                {r.bloodGroup}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">{r.unitsRequired}</td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {r.hospitalName}, {r.city || "Salem"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  r.status === "fulfilled"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "accepted"
                                    ? "bg-blue-100 text-blue-800"
                                    : r.status === "broadcasting"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {r.acceptedByDonorName ? (
                                <span className="font-semibold text-slate-800">
                                  {r.acceptedByDonorName} ({r.acceptedByDonorPublicId || "Donor"})
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {formatDateTime(r.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-[11px] text-slate-400">
                  Individual patient records are confidential and restricted to authorized administrative review.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-red-600">Failed to load patient history.</div>
          )}
        </Modal>
      )}
    </div>
  );
};
