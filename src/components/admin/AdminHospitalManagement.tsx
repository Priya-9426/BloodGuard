import React, { useState, useEffect, useCallback } from "react";
import { Hospital } from "../../types";
import {
  getApiHospitals,
  verifyHospital,
  createAdminHospital,
  getHospitalSummary,
  getStates,
} from "../../utils/api";
import {
  Building2,
  ShieldCheck,
  AlertCircle,
  Edit2,
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";

type VerificationStatus = "verified" | "pending" | "needs_review";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === "verified")
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 w-fit">
        <ShieldCheck className="w-3 h-3" /> Verified
      </span>
    );
  if (status === "needs_review")
    return (
      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1 w-fit">
        <AlertCircle className="w-3 h-3" /> Needs Review
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold w-fit">
      Pending
    </span>
  );
};

export const AdminHospitalManagement: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<VerificationStatus>("verified");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHospital, setNewHospital] = useState({
    name: "",
    address: "",
    phone: "",
    type: "Government" as "Government" | "Private" | "Other",
    state: "",
    district: "",
    city: "",
    sourceUrl: "",
  });
  const [saveMsg, setSaveMsg] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, sum, stateList] = await Promise.all([
        getApiHospitals({
          all: true,
          status: filterStatus || undefined,
          state: filterState || undefined,
          search: search || undefined,
        } as any),
        getHospitalSummary(),
        getStates(),
      ]);
      setHospitals(data);
      setSummary(sum as any);
      setStates(stateList);
    } catch (_) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterState, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (
    id: string,
    status: VerificationStatus,
    notes: string,
  ) => {
    await verifyHospital(id, status, true, notes);
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2000);
    setEditingId(null);
    load();
  };

  const handleCreate = async () => {
    if (!newHospital.name || !newHospital.city || !newHospital.state) {
      alert("Name, State, and City are required.");
      return;
    }
    await createAdminHospital({
      ...newHospital,
      verificationStatus: "verified",
    } as any);
    setShowAddForm(false);
    setNewHospital({
      name: "",
      address: "",
      phone: "",
      type: "Government",
      state: "",
      district: "",
      city: "",
      sourceUrl: "",
    });
    load();
  };

  const inputClass =
    "w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500";

  const summaryCards = summary
    ? [
        { label: "Total Hospitals", val: (summary as any).total ?? 0, color: "slate" },
        { label: "Verified", val: (summary as any).verified ?? 0, color: "emerald" },
        { label: "Pending Review", val: (summary as any).pending ?? 0, color: "amber" },
        { label: "Needs Review", val: (summary as any).needsReview ?? 0, color: "red" },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-2xl border border-slate-200 p-4"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {c.label}
              </div>
              <div
                className={`text-2xl font-extrabold mt-1 ${
                  c.color === "emerald"
                    ? "text-emerald-600"
                    : c.color === "amber"
                    ? "text-amber-600"
                    : c.color === "red"
                    ? "text-red-600"
                    : "text-slate-900"
                }`}
              >
                {c.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search hospital name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="needs_review">Needs Review</option>
        </select>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
        >
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> Add Hospital
        </button>
        {saveMsg && (
          <span className="text-xs text-emerald-600 font-bold">{saveMsg}</span>
        )}
      </div>

      {/* Add Hospital Form */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-800">
            Add New Verified Hospital
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Hospital Name *
              </label>
              <input
                className={inputClass}
                value={newHospital.name}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Hospital name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                State *
              </label>
              <select
                className={inputClass}
                value={newHospital.state}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, state: e.target.value }))
                }
              >
                <option value="">Select state</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                District
              </label>
              <input
                className={inputClass}
                value={newHospital.district}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, district: e.target.value }))
                }
                placeholder="District"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                City *
              </label>
              <input
                className={inputClass}
                value={newHospital.city}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, city: e.target.value }))
                }
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Type
              </label>
              <select
                className={inputClass}
                value={newHospital.type}
                onChange={(e) =>
                  setNewHospital((p) => ({
                    ...p,
                    type: e.target.value as "Government" | "Private" | "Other",
                  }))
                }
              >
                <option value="Government">Government</option>
                <option value="Private">Private</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Phone
              </label>
              <input
                className={inputClass}
                value={newHospital.phone}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="044-XXXXXXXX"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Address
              </label>
              <input
                className={inputClass}
                value={newHospital.address}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Full address"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Source URL
              </label>
              <input
                className={inputClass}
                value={newHospital.sourceUrl}
                onChange={(e) =>
                  setNewHospital((p) => ({ ...p, sourceUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Create Hospital
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hospital Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Hospital</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : hospitals.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  No hospitals found.
                </td>
              </tr>
            ) : (
              hospitals.map((h) => (
                <tr key={h._id || h.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{h.name}</div>
                    {h.address && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {h.address}
                      </div>
                    )}
                    {h.contactPhone && (
                      <div className="text-[10px] text-slate-400">{h.contactPhone}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-700">{h.city}</div>
                    <div className="text-[10px] text-slate-400">
                      {h.district ? `${h.district}, ` : ""}
                      {h.state}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.type === "Government"
                          ? "bg-blue-100 text-blue-700"
                          : h.type === "Private"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {h.type || "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={h.verificationStatus || "pending"} />
                    {h.adminNotes && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {h.adminNotes}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {editingId === (h._id || h.id) ? (
                      <div className="space-y-1.5">
                        <select
                          value={editStatus}
                          onChange={(e) =>
                            setEditStatus(e.target.value as VerificationStatus)
                          }
                          className="w-full px-2 py-1 text-[10px] rounded-lg border border-slate-300"
                        >
                          <option value="verified">Verified</option>
                          <option value="pending">Pending</option>
                          <option value="needs_review">Needs Review</option>
                        </select>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Admin notes..."
                          rows={2}
                          className="w-full px-2 py-1 text-[10px] rounded-lg border border-slate-300 resize-none"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              handleVerify(
                                h._id || h.id!,
                                editStatus,
                                editNotes,
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(h._id || h.id!);
                          setEditStatus(
                            (h.verificationStatus as VerificationStatus) ||
                              "pending",
                          );
                          setEditNotes(h.adminNotes || "");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                      >
                        <Edit2 className="w-3 h-3" /> Review
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-400 text-right">
        {hospitals.length} hospital{hospitals.length !== 1 ? "s" : ""} listed
      </div>
    </div>
  );
};
