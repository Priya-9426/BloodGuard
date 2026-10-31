import React, { useState, useEffect } from "react";
import { BloodGroup, DonorProfileData } from "../../types";
import { getApiAdminDonors, getApiAdminDonorProfile, getAuthToken } from "../../utils/api";
import { Modal } from "../common/Modal";
import { formatDateTime } from "../../utils/eligibility";
import {
  Users,
  Download,
  Eye,
} from "lucide-react";

export const AdminDonorDirectory: React.FC = () => {
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [donorIdQuery, setDonorIdQuery] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [availability, setAvailability] = useState<string>("all");
  const [eligibleOnly, setEligibleOnly] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [donors, setDonors] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected donor for detailed profile modal
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<DonorProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<"received" | "accepted" | "released" | "completed">("received");

  const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const fetchDonors = async (targetPage = 1) => {
    setIsLoading(true);
    try {
      const data = await getApiAdminDonors({
        bloodGroup: bloodGroup || undefined,
        donorId: donorIdQuery || undefined,
        search: searchQuery || undefined,
        city: city || undefined,
        availability: availability === "all" ? undefined : availability,
        eligibleOnly: eligibleOnly ? "true" : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: targetPage,
        limit: 15,
      });
      setDonors(data.donors || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      console.error(err);
      setDonors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDonors(1);
  };

  const handleOpenProfile = async (id: string) => {
    setSelectedDonorId(id);
    setIsLoadingProfile(true);
    setProfileTab("received");
    try {
      const data = await getApiAdminDonorProfile(id);
      setProfileData(data);
    } catch (err) {
      console.error("Failed to load donor profile", err);
      setProfileData(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleExportProfileCSV = () => {
    const id = profileData?.donor?._id || profileData?.donor?.id;
    if (!id) return;
    const token = getAuthToken();
    const params = new URLSearchParams({ id: String(id) });
    if (token) params.append("token", token);
    window.open(`/api/admin/export/donor-profile?${params.toString()}`, "_blank");
  };

  const handleDownloadProfilePDF = () => {
    if (!profileData?.donor) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const d = profileData.donor;
    const stats = profileData.stats || { totalReceived: 0, totalAccepted: 0, totalDeclined: 0, totalReleased: 0, totalCompleted: 0 };
    const received = profileData.receivedRequests || [];

    const rowsHtml = received
      .map(
        (r) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;font-family:monospace;font-weight:bold;">${r.donorReference || "-"}</td>
        <td style="padding:6px;border:1px solid #ddd;font-family:monospace;">${r.patientRequestNumber || "-"}</td>
        <td style="padding:6px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">${r.requestId?.bloodGroup || d.bloodGroup}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.requestId?.hospitalName || "Hospital"}</td>
        <td style="padding:6px;border:1px solid #ddd;text-transform:uppercase;font-weight:bold;">${r.status}</td>
        <td style="padding:6px;border:1px solid #ddd;font-family:monospace;">${r.acceptanceReference || "—"}</td>
        <td style="padding:6px;border:1px solid #ddd;font-size:11px;">${new Date(r.receivedAt).toLocaleDateString("en-IN")}</td>
      </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Donor Clinical Profile — ${d.donorId || d.name}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
          h1 { color: #dc2626; margin-bottom: 4px; font-size: 22px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; line-height: 1.6; font-size: 13px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; background: #fff; }
          .kpi-val { font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 14px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>🩸 BloodGuard — Official Donor Profile & Verification Audit</h1>
        <div class="meta-box">
          <strong>Donor ID:</strong> ${d.donorId || "N/A"} &nbsp;|&nbsp;
          <strong>Name:</strong> ${d.name} &nbsp;|&nbsp;
          <strong>Blood Group:</strong> ${d.bloodGroup} &nbsp;|&nbsp;
          <strong>Phone:</strong> ${d.phone} &nbsp;|&nbsp;
          <strong>City:</strong> ${d.city || "Salem"}<br>
          <strong>Status:</strong> ${d.isAvailable ? "Available" : "Unavailable"} &nbsp;|&nbsp;
          <strong>Clinical 56-Day Rule:</strong> ${d.isEligible ? "ELIGIBLE" : "INELIGIBLE"} &nbsp;|&nbsp;
          <strong>Total Transfusions:</strong> ${d.totalDonations || 0}<br>
          <strong>Report Generated:</strong> ${new Date().toLocaleString("en-IN")}
        </div>
        <div class="kpi-grid">
          <div class="kpi-card"><div>Received Requests</div><div class="kpi-val">${stats.totalReceived || 0}</div></div>
          <div class="kpi-card"><div>Accepted</div><div class="kpi-val">${stats.totalAccepted || 0}</div></div>
          <div class="kpi-card"><div>Declined</div><div class="kpi-val">${stats.totalDeclined || 0}</div></div>
          <div class="kpi-card"><div>Released</div><div class="kpi-val">${stats.totalReleased || 0}</div></div>
          <div class="kpi-card"><div>Fulfilled</div><div class="kpi-val">${stats.totalCompleted || 0}</div></div>
        </div>
        <h3>Received Emergency Requests History</h3>
        <table>
          <thead>
            <tr>
              <th>Donor Reference</th>
              <th>Patient Request ID</th>
              <th>Blood</th>
              <th>Hospital</th>
              <th>Status</th>
              <th>Acceptance ID</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="padding:16px;text-align:center;">No received emergency records found.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          BloodGuard Clinical Framework • Verified Administrative Audit Record • Fast2SMS Integrated
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
            <Users className="w-5 h-5 text-red-600" />
            Verified Donor Directory & Profiles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, inspect individual profiles, verify 56-day refractory eligibility, and review complete received-request histories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const token = getAuthToken();
              const params = token ? `?token=${token}` : "";
              window.open(`/api/admin/export/donors${params}`, "_blank");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export All Donors (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearch} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">All Blood Groups</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Donor ID</label>
            <input
              type="text"
              placeholder="e.g. DN11750"
              value={donorIdQuery}
              onChange={(e) => setDonorIdQuery(e.target.value)}
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">All Donors</option>
              <option value="true">Available Only</option>
              <option value="false">Unavailable</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">From Reg Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">To Reg Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span>56-Day Eligible Only</span>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="ml-auto px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </form>

      {/* Donors Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Found {total} donor records</span>
          <span>Page {page} of {pages}</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Donor ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Blood Group</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3">56-Day Rule</th>
                <th className="py-2.5 px-3">Donations</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No donors found matching criteria.
                  </td>
                </tr>
              ) : (
                donors.map((d) => (
                  <tr key={d._id || d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                      {d.donorId || `DN${String(d.phone).slice(-5)}`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[11px]">
                        {d.bloodGroup}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{d.phone}</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.city || "Salem"}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {d.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.isEligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {d.isEligible ? "Eligible" : "Refractory (56d)"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{d.totalDonations || 0}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleOpenProfile(d._id || d.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>View Profile</span>
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
              onClick={() => fetchDonors(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => fetchDonors(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* INDIVIDUAL DONOR PROFILE MODAL (Section 3) */}
      {selectedDonorId && (
        <Modal
          isOpen={Boolean(selectedDonorId)}
          onClose={() => setSelectedDonorId(null)}
          title={`Donor Clinical Profile — ${profileData?.donor?.name || "Loading..."}`}
          maxWidth="max-w-4xl"
        >
          {isLoadingProfile ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading donor records and emergency history...
            </div>
          ) : profileData?.donor ? (
            <div className="space-y-5">
              {/* Top Donor Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Donor ID</span>
                  <span className="font-mono font-extrabold text-red-600 text-sm">
                    {profileData.donor.donorId || `DN${String(profileData.donor.phone).slice(-5)}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Blood Group</span>
                  <span className="font-extrabold text-slate-900 text-sm">{profileData.donor.bloodGroup}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-mono text-slate-700">{profileData.donor.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">City / Hospital</span>
                  <span className="text-slate-700">{profileData.donor.city || "Salem"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Availability</span>
                  <span className="font-bold text-emerald-700">
                    {profileData.donor.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">56-Day Rule Status</span>
                  <span className={`font-bold ${profileData.donor.isEligible ? "text-emerald-700" : "text-amber-700"}`}>
                    {profileData.donor.isEligible ? "Eligible" : "Refractory Period Active"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Donation Date</span>
                  <span className="text-slate-700">
                    {profileData.donor.lastDonationDate
                      ? new Date(profileData.donor.lastDonationDate).toLocaleDateString("en-IN")
                      : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Transfusions</span>
                  <span className="font-extrabold text-slate-900">{profileData.donor.totalDonations || 0}</span>
                </div>
              </div>

              {/* 5 KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Received</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {profileData.stats?.totalReceived || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Accepted</span>
                  <div className="text-base font-extrabold text-blue-600 mt-0.5">
                    {profileData.stats?.totalAccepted || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Declined</span>
                  <div className="text-base font-extrabold text-slate-500 mt-0.5">
                    {profileData.stats?.totalDeclined || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Released</span>
                  <div className="text-base font-extrabold text-amber-600 mt-0.5">
                    {profileData.stats?.totalReleased || 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Completed</span>
                  <div className="text-base font-extrabold text-emerald-600 mt-0.5">
                    {profileData.stats?.totalCompleted || 0}
                  </div>
                </div>
              </div>

              {/* Sub-tabs inside Modal */}
              <div className="border-b border-slate-200 flex gap-2 text-xs">
                <button
                  onClick={() => setProfileTab("received")}
                  className={`pb-2 px-1 font-bold border-b-2 transition-colors ${
                    profileTab === "received"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Received Requests ({profileData.receivedRequests?.length || 0})
                </button>
                <button
                  onClick={() => setProfileTab("accepted")}
                  className={`pb-2 px-1 font-bold border-b-2 transition-colors ${
                    profileTab === "accepted"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Accepted ({profileData.acceptedRequests?.length || 0})
                </button>
                <button
                  onClick={() => setProfileTab("released")}
                  className={`pb-2 px-1 font-bold border-b-2 transition-colors ${
                    profileTab === "released"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Release History ({profileData.releasedEvents?.length || 0})
                </button>
                <button
                  onClick={() => setProfileTab("completed")}
                  className={`pb-2 px-1 font-bold border-b-2 transition-colors ${
                    profileTab === "completed"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Completed Donations ({profileData.completedDonations?.length || 0})
                </button>
              </div>

              {/* Tab 1: Received Requests Table */}
              {profileTab === "received" && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Donor Reference</th>
                        <th className="py-2 px-3">Patient Request Number</th>
                        <th className="py-2 px-3">Hospital</th>
                        <th className="py-2 px-3">Units</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Acceptance ID</th>
                        <th className="py-2 px-3">Received At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profileData.receivedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No received requests recorded.
                          </td>
                        </tr>
                      ) : (
                        profileData.receivedRequests.map((r) => (
                          <tr key={r._id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-red-600">
                              {r.donorReference}
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-800">
                              {r.patientRequestNumber || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {r.requestId?.hospitalName || "Hospital"}
                            </td>
                            <td className="py-2 px-3">{r.requestId?.unitsRequired || 1}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  r.status === "accepted" || r.status === "fulfilled"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "released"
                                    ? "bg-amber-100 text-amber-800"
                                    : r.status === "declined"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-emerald-700 font-bold">
                              {r.acceptanceReference || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {formatDateTime(r.receivedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Accepted Requests */}
              {profileTab === "accepted" && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Request Number</th>
                        <th className="py-2 px-3">Patient</th>
                        <th className="py-2 px-3">Hospital</th>
                        <th className="py-2 px-3">Units</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Accepted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profileData.acceptedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No accepted requests recorded.
                          </td>
                        </tr>
                      ) : (
                        profileData.acceptedRequests.map((r: any) => (
                          <tr key={r._id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-red-600">{r.requestNumber}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{r.patientName}</td>
                            <td className="py-2 px-3 text-slate-700">{r.hospitalName}</td>
                            <td className="py-2 px-3">{r.unitsRequired}</td>
                            <td className="py-2 px-3 uppercase font-bold text-emerald-700">{r.status}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{formatDateTime(r.acceptedAt || r.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Released Requests */}
              {profileTab === "released" && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Request Number</th>
                        <th className="py-2 px-3">Hospital</th>
                        <th className="py-2 px-3">Release Reason</th>
                        <th className="py-2 px-3">Accepted Date</th>
                        <th className="py-2 px-3">Released Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profileData.releasedEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No release events recorded for this donor.
                          </td>
                        </tr>
                      ) : (
                        profileData.releasedEvents.map((ev: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-red-600">{ev.requestNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{ev.hospitalName}</td>
                            <td className="py-2 px-3 text-amber-800 font-medium">{ev.releaseReason || "Unable to donate"}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{formatDateTime(ev.acceptedAt)}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{formatDateTime(ev.releasedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Completed Donations */}
              {profileTab === "completed" && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Request Number</th>
                        <th className="py-2 px-3">Hospital & City</th>
                        <th className="py-2 px-3">Blood Group</th>
                        <th className="py-2 px-3">Units Donated</th>
                        <th className="py-2 px-3">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profileData.completedDonations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No completed donations recorded yet.
                          </td>
                        </tr>
                      ) : (
                        profileData.completedDonations.map((c: any) => (
                          <tr key={c._id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-emerald-700">{c.requestNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{c.hospitalName}, {c.city || "Salem"}</td>
                            <td className="py-2 px-3 font-bold text-red-600">{c.bloodGroup}</td>
                            <td className="py-2 px-3">{c.unitsRequired}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{formatDateTime(c.updatedAt || c.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Download Buttons in Profile Modal */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-[11px] text-slate-400">
                  Data sourced from verified MongoDB collections (User, EmergencyRequest, DonorReceivedRequest).
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportProfileCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handleDownloadProfilePDF}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-red-600">Failed to load donor profile.</div>
          )}
        </Modal>
      )}
    </div>
  );
};
