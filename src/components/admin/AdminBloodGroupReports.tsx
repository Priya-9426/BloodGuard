import React, { useState, useEffect } from "react";
import { BloodGroup, BloodGroupReportItem, DonorProfileData } from "../../types";
import { getApiAdminBloodGroups, getApiAdminDonors, getApiAdminDonorProfile, getAuthToken } from "../../utils/api";
import { Modal } from "../common/Modal";
import { formatDateTime } from "../../utils/eligibility";
import {
  Droplets,
  Users,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Building2,
  FileText,
  Phone,
  Mail,
  RotateCcw,
} from "lucide-react";

export const AdminBloodGroupReports: React.FC = () => {
  const [reports, setReports] = useState<BloodGroupReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | "">("");

  // Donors of selected blood group
  const [groupDonors, setGroupDonors] = useState<any[]>([]);
  const [groupDonorsLoading, setGroupDonorsLoading] = useState(false);

  // Selected donor for detailed profile modal
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<DonorProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<"received" | "accepted" | "released" | "completed">("received");

  const bloodGroupColors: Record<BloodGroup, { bg: string; text: string; badge: string; border: string }> = {
    "A+": { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-800", border: "border-red-200" },
    "A-": { bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100 text-rose-800", border: "border-rose-200" },
    "B+": { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", border: "border-blue-200" },
    "B-": { bg: "bg-indigo-50", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800", border: "border-indigo-200" },
    "AB+": { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-800", border: "border-purple-200" },
    "AB-": { bg: "bg-violet-50", text: "text-violet-700", badge: "bg-violet-100 text-violet-800", border: "border-violet-200" },
    "O+": { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" },
    "O-": { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-800", border: "border-amber-200" },
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await getApiAdminBloodGroups();
      setReports(data.bloodGroups || []);
    } catch (err) {
      console.error("Failed to load blood group reports", err);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSelectGroup = async (bg: BloodGroup) => {
    if (selectedGroup === bg) {
      setSelectedGroup("");
      setGroupDonors([]);
      return;
    }
    setSelectedGroup(bg);
    setGroupDonorsLoading(true);
    try {
      const data = await getApiAdminDonors({ bloodGroup: bg, limit: 50 });
      setGroupDonors(data.donors || []);
    } catch (err) {
      console.error(err);
      setGroupDonors([]);
    } finally {
      setGroupDonorsLoading(false);
    }
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

  const handleExportCSV = () => {
    const token = getAuthToken();
    const params = token ? `?token=${token}` : "";
    window.open(`/api/admin/export/blood-groups${params}`, "_blank");
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = reports
      .map(
        (r) => `
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #dc2626;">${r.bloodGroup}</td>
          <td style="padding: 8px 12px; text-align: center;">${r.totalRegistered}</td>
          <td style="padding: 8px 12px; text-align: center; color: #16a34a;">${r.availableDonors}</td>
          <td style="padding: 8px 12px; text-align: center; color: #0284c7; font-weight: 600;">${r.eligibleDonors}</td>
          <td style="padding: 8px 12px; text-align: center; color: #6b7280;">${r.unavailableDonors}</td>
          <td style="padding: 8px 12px; text-align: center; color: #ea580c;">${r.ineligibleDonors}</td>
          <td style="padding: 8px 12px; text-align: center;">${r.totalRequests}</td>
          <td style="padding: 8px 12px; text-align: center;">${r.acceptedRequests}</td>
          <td style="padding: 8px 12px; text-align: center; color: #16a34a; font-weight: 600;">${r.fulfilledRequests}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BloodGuard — Blood Group-Wise Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1f2937; }
          .header { border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 24px; font-weight: 700; color: #dc2626; }
          .subtitle { font-size: 14px; color: #4b5563; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #f9fafb; padding: 10px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
          th:first-child { text-align: left; }
          td { border-bottom: 1px solid #f3f4f6; }
          .footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">🩸 BloodGuard Healthcare Platform</div>
          <div class="subtitle">Official Blood Group-Wise Inventory & Donor Report | Generated: ${new Date().toLocaleString("en-IN")}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Blood Group</th>
              <th>Total Registered</th>
              <th>Available Donors</th>
              <th>Eligible (56-Day)</th>
              <th>Unavailable</th>
              <th>Ineligible</th>
              <th>Total Requests</th>
              <th>Accepted</th>
              <th>Fulfilled</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Confidential Medical Report — BloodGuard Healthcare Administration
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportProfileCSV = () => {
    const id = profileData?.donor?._id || profileData?.donor?.id;
    if (!id) return;
    const token = getAuthToken();
    const params = new URLSearchParams({ id: String(id) });
    if (token) params.append("token", token);
    window.open(`/api/admin/export/donor-profile?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-red-600" />
            Blood Group-Wise Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive breakdown of donor availability, 56-day eligibility rule, and hospital demand by blood group.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* 8 Blood Group Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          Loading blood group reports...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.map((item) => {
            const colors = bloodGroupColors[item.bloodGroup] || {
              bg: "bg-gray-50",
              text: "text-gray-700",
              badge: "bg-gray-100 text-gray-800",
              border: "border-gray-200",
            };
            const isSelected = selectedGroup === item.bloodGroup;

            return (
              <div
                key={item.bloodGroup}
                onClick={() => handleSelectGroup(item.bloodGroup)}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-red-600 shadow-md bg-red-50/20"
                    : `${colors.border} bg-white hover:border-red-400 hover:shadow-sm`
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-base">
                      {item.bloodGroup}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {item.totalRegistered} Registered
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                      Viewing Donors
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Available:
                    </span>
                    <span className="font-semibold text-gray-800">{item.availableDonors}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Eligible (56d):
                    </span>
                    <span className="font-bold text-blue-600">{item.eligibleDonors}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-500">Unavailable / Ineligible:</span>
                    <span className="text-gray-600">
                      {item.unavailableDonors} / {item.ineligibleDonors}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-gray-500">
                    <span>Demand / Fulfilled:</span>
                    <span className="font-medium text-gray-700">
                      {item.totalRequests} / <span className="text-green-600 font-bold">{item.fulfilledRequests}</span>
                    </span>
                  </div>
                </div>

                {item.cityDistribution && item.cityDistribution.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100">
                    <p className="text-[11px] font-medium text-gray-400 mb-1">Top Cities:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.cityDistribution.map((c, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {c.city} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Blood Group Donor Directory */}
      {selectedGroup && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                Donors with Blood Group: <span className="text-red-600">{selectedGroup}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing all registered {selectedGroup} donors with availability and 56-day rule eligibility.
              </p>
            </div>
            <button
              onClick={() => setSelectedGroup("")}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Close Donor List
            </button>
          </div>

          {groupDonorsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading {selectedGroup} donors...</div>
          ) : groupDonors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No registered donors found for blood group {selectedGroup}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                    <th className="p-3">Donor ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">56-Day Rule</th>
                    <th className="p-3">Donations</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupDonors.map((d) => (
                    <tr key={d._id} className="hover:bg-red-50/20 transition">
                      <td className="p-3 font-mono font-bold text-gray-800">{d.donorId || "N/A"}</td>
                      <td className="p-3 font-medium text-gray-900">{d.name}</td>
                      <td className="p-3 font-mono text-gray-600">{d.phone}</td>
                      <td className="p-3 text-gray-600">{d.city || "Salem"}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.isAvailable !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {d.isAvailable !== false ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      <td className="p-3">
                        {d.isEligible ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Ineligible ({d.daysSinceLastDonation !== null ? `${d.daysSinceLastDonation}d` : "<56d"})
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-700">{d.totalDonations || 0}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenProfile(d._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-xs font-medium shadow-sm transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detailed Donor Profile Modal */}
      {selectedDonorId && (
        <Modal
          isOpen={!!selectedDonorId}
          onClose={() => {
            setSelectedDonorId(null);
            setProfileData(null);
          }}
          title={
            profileData?.donor
              ? `Donor Profile: ${profileData.donor.donorId || profileData.donor.name}`
              : "Loading Donor Profile..."
          }
          maxWidth="max-w-4xl"
        >
          {isLoadingProfile ? (
            <div className="p-8 text-center text-gray-500">Loading donor profile and request history...</div>
          ) : !profileData?.donor ? (
            <div className="p-8 text-center text-red-500">Failed to load donor profile.</div>
          ) : (
            <div className="space-y-6">
              {/* Profile Header Card */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl border-2 border-red-200">
                    {profileData.donor.bloodGroup}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-gray-900">{profileData.donor.name}</h4>
                      <span className="font-mono text-xs px-2 py-0.5 bg-gray-200 text-gray-800 font-bold rounded">
                        {profileData.donor.donorId}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {profileData.donor.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {profileData.donor.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {profileData.donor.city || "Salem"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportProfileCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Received</p>
                  <p className="text-lg font-bold text-blue-600">{profileData.stats.totalReceived}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Accepted</p>
                  <p className="text-lg font-bold text-green-600">{profileData.stats.totalAccepted}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Declined</p>
                  <p className="text-lg font-bold text-red-600">{profileData.stats.totalDeclined}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Released</p>
                  <p className="text-lg font-bold text-amber-600">{profileData.stats.totalReleased}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Donations</p>
                  <p className="text-lg font-bold text-purple-600">{profileData.stats.totalCompleted}</p>
                </div>
              </div>

              {/* Tabs for Request Details */}
              <div>
                <div className="flex border-b border-gray-200 mb-3">
                  <button
                    onClick={() => setProfileTab("received")}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
                      profileTab === "received"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Received Requests ({profileData.receivedRequests.length})
                  </button>
                  <button
                    onClick={() => setProfileTab("accepted")}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
                      profileTab === "accepted"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Accepted ({profileData.acceptedRequests.length})
                  </button>
                  <button
                    onClick={() => setProfileTab("released")}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
                      profileTab === "released"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Release History ({profileData.releasedEvents.length})
                  </button>
                  <button
                    onClick={() => setProfileTab("completed")}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
                      profileTab === "completed"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Completed Donations ({profileData.completedDonations.length})
                  </button>
                </div>

                {/* Tab content */}
                {profileTab === "received" && (
                  <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                    {profileData.receivedRequests.length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-500">No received requests recorded.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                          <tr>
                            <th className="p-2.5">Donor Ref</th>
                            <th className="p-2.5">Patient Req</th>
                            <th className="p-2.5">Hospital</th>
                            <th className="p-2.5">Blood Group</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Received Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {profileData.receivedRequests.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2.5 font-mono font-bold text-red-600">{r.donorReference}</td>
                              <td className="p-2.5 font-mono text-gray-600">{r.requestId?.requestNumber || "REQ"}</td>
                              <td className="p-2.5">{r.requestId?.hospitalName || "Hospital"}</td>
                              <td className="p-2.5 font-semibold">{r.requestId?.bloodGroup}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-500">{formatDateTime(r.receivedAt || (r as any).createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {profileTab === "accepted" && (
                  <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                    {profileData.acceptedRequests.length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-500">No accepted requests.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                          <tr>
                            <th className="p-2.5">Request No</th>
                            <th className="p-2.5">Hospital</th>
                            <th className="p-2.5">Blood Group</th>
                            <th className="p-2.5">Units</th>
                            <th className="p-2.5">Accepted At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {profileData.acceptedRequests.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2.5 font-mono font-bold text-blue-600">{r.requestNumber}</td>
                              <td className="p-2.5">{r.hospitalName}</td>
                              <td className="p-2.5 font-bold">{r.bloodGroup}</td>
                              <td className="p-2.5">{r.unitsRequired}</td>
                              <td className="p-2.5 text-gray-500">{formatDateTime(r.acceptedAt || r.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {profileTab === "released" && (
                  <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                    {profileData.releasedEvents.length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-500">No release events recorded.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                          <tr>
                            <th className="p-2.5">Request No</th>
                            <th className="p-2.5">Hospital</th>
                            <th className="p-2.5">Release Reason</th>
                            <th className="p-2.5">Accepted At</th>
                            <th className="p-2.5">Released At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {profileData.releasedEvents.map((e, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2.5 font-mono font-bold text-gray-700">{e.requestNumber}</td>
                              <td className="p-2.5">{e.hospitalName}</td>
                              <td className="p-2.5 text-amber-700 font-medium">{e.releaseReason || "Donor released"}</td>
                              <td className="p-2.5 text-gray-500">{formatDateTime(e.acceptedAt)}</td>
                              <td className="p-2.5 text-gray-500">{formatDateTime(e.releasedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {profileTab === "completed" && (
                  <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                    {profileData.completedDonations.length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-500">No completed donations yet.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                          <tr>
                            <th className="p-2.5">Request No</th>
                            <th className="p-2.5">Hospital</th>
                            <th className="p-2.5">Blood Group</th>
                            <th className="p-2.5">Units Donated</th>
                            <th className="p-2.5">Completed Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {profileData.completedDonations.map((d, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2.5 font-mono font-bold text-green-600">{d.requestNumber}</td>
                              <td className="p-2.5">{d.hospitalName}</td>
                              <td className="p-2.5 font-bold">{d.bloodGroup}</td>
                              <td className="p-2.5 font-semibold">{d.unitsRequired}</td>
                              <td className="p-2.5 text-gray-500">{formatDateTime(d.updatedAt || d.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
