import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { EmergencyRequest, User, BloodGroup } from "../../types";

interface AdminChartsProps {
  requests: EmergencyRequest[];
  users: User[];
}

const STATUS_COLORS: Record<string, string> = {
  broadcasting: "#dc2626", // Red
  accepted: "#2563eb",     // Blue
  fulfilled: "#16a34a",    // Green
  suspicious_review: "#d97706", // Amber
  rejected: "#94a3b8",     // Slate
  screening: "#8b5cf6",    // Purple
};

const USER_COLORS = {
  patients: "#3b82f6", // Blue
  donors: "#dc2626",   // Red
  both: "#8b5cf6",     // Purple
  admin: "#f59e0b",    // Amber
};

export const AdminCharts: React.FC<AdminChartsProps> = ({ requests, users }) => {
  // 1. Data for Request Status Donut Chart
  const statusCounts: Record<string, number> = {
    broadcasting: 0,
    accepted: 0,
    fulfilled: 0,
    suspicious_review: 0,
    rejected: 0,
  };

  requests.forEach((r) => {
    const s = r.status || "broadcasting";
    if (statusCounts[s] !== undefined) {
      statusCounts[s]++;
    } else {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
  });

  const requestStatusData = [
    { name: "Active Broadcasts", value: statusCounts.broadcasting, color: STATUS_COLORS.broadcasting },
    { name: "Accepted", value: statusCounts.accepted, color: STATUS_COLORS.accepted },
    { name: "Fulfilled Transfusions", value: statusCounts.fulfilled, color: STATUS_COLORS.fulfilled },
    { name: "Suspicious Review", value: statusCounts.suspicious_review, color: STATUS_COLORS.suspicious_review },
    { name: "Rejected / Cancelled", value: statusCounts.rejected, color: STATUS_COLORS.rejected },
  ].filter((d) => d.value > 0);

  // 2. Data for User Demographic Donut Chart
  const patientOnly = users.filter((u) => u.roles?.includes("patient") && !u.roles?.includes("donor")).length;
  const donorOnly = users.filter((u) => u.roles?.includes("donor") && !u.roles?.includes("patient")).length;
  const bothRoles = users.filter((u) => u.roles?.includes("patient") && u.roles?.includes("donor")).length;
  const adminUsers = users.filter((u) => u.roles?.includes("admin")).length;

  const userDemographicData = [
    { name: "Patient Only", value: patientOnly, color: USER_COLORS.patients },
    { name: "Donor Only", value: donorOnly, color: USER_COLORS.donors },
    { name: "Both Patient + Donor", value: bothRoles, color: USER_COLORS.both },
    { name: "System Admin", value: adminUsers, color: USER_COLORS.admin },
  ].filter((d) => d.value > 0);

  // 3. Data for Blood Group Demand vs Fulfillment Bar Chart
  const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const bloodGroupBarData = bloodGroups.map((bg) => {
    const bgReqs = requests.filter((r) => r.bloodGroup === bg);
    const requestedUnits = bgReqs.reduce((acc, r) => acc + (r.unitsRequired || 1), 0);
    const fulfilledUnits = bgReqs
      .filter((r) => r.status === "fulfilled")
      .reduce((acc, r) => acc + (r.unitsRequired || 1), 0);

    return {
      bloodGroup: bg,
      requested: requestedUnits,
      fulfilled: fulfilledUnits,
    };
  });

  // 4. Data for Regional City Distribution
  const cityCounts: Record<string, number> = {};
  requests.forEach((r) => {
    const city = r.city || "Salem";
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  const cityData = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 2 Circular / Donut Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart 1: Request Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Emergency Request Lifecycle
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time distribution of all logged blood requests
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Total: {requests.length}
            </span>
          </div>

          <div className="h-64 w-full my-2">
            {requestStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requestStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {requestStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} requests`, name]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No request data to visualize
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart 2: User Demographics */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                User Account Demographics
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Distribution across Patients, Donors, and Both-Role accounts
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Total: {users.length}
            </span>
          </div>

          <div className="h-64 w-full my-2">
            {userDemographicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDemographicData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {userDemographicData.map((entry, index) => (
                      <Cell key={`user-cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} accounts`, name]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No user data to visualize
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2 Bar Charts: Blood Group Demand & Regional Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blood Group Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Blood Group Demand vs. Fulfilled Transfusions
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total units requested compared to verified fulfilled units across 8 blood groups
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bloodGroupBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bloodGroup" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="rect"
                />
                <Bar dataKey="requested" name="Requested Units" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="fulfilled" name="Fulfilled Units" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional City Bar Chart (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Top Active Cities
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Emergency broadcast concentration
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {cityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} requests`, "Volume"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No regional data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
