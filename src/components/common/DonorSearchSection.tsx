import React, { useState, useEffect } from "react";
import { useBloodGuard } from "../../context/BloodGuardContext";
import { BloodGroup, DonorSearchResult } from "../../types";
import { searchApiDonors, getStates, getDistricts, getCities } from "../../utils/api";
import {
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const DonorSearchSection: React.FC = () => {
  const { currentUser } = useBloodGuard();
  const isAdmin = currentUser.roles?.includes("admin") || currentUser.role === "admin";

  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [compatible, setCompatible] = useState<boolean>(true);
  const [availableOnly, setAvailableOnly] = useState<boolean>(true);
  const [eligibleOnly, setEligibleOnly] = useState<boolean>(true);

  // Location filters
  const [state, setState] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [donors, setDonors] = useState<DonorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const bloodGroups: BloodGroup[] = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ];

  // Load states on mount
  useEffect(() => {
    getStates().then(setStates).catch(() => {});
  }, []);

  // Load districts when state changes
  useEffect(() => {
    setDistrict("");
    setCity("");
    setDistricts([]);
    setCities([]);
    if (state) {
      getDistricts(state).then(setDistricts).catch(() => {});
    }
  }, [state]);

  // Load cities when district changes
  useEffect(() => {
    setCity("");
    setCities([]);
    if (state && district) {
      getCities(state, district).then(setCities).catch(() => {});
    }
  }, [district]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await searchApiDonors({
        bloodGroup: bloodGroup || undefined,
        state: state || undefined,
        district: district || undefined,
        city: city || undefined,
        availability: availableOnly,
        eligibleOnly,
        compatible,
      });
      setDonors(data.donors || []);
    } catch (_) {
      setDonors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const selectClass =
    "w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-medium bg-white";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-red-600" />
            Verified Donor Registry &amp; Search
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search active blood donors applying clinical 56-day whole blood refractory eligibility.
          </p>
        </div>
        <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
          {donors.length} matching donor{donors.length === 1 ? "" : "s"} found
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className={selectClass}
            >
              <option value="">All Groups</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={selectClass}
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              District
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={selectClass}
              disabled={!state}
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={selectClass}
              disabled={!district}
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={compatible}
                onChange={(e) => setCompatible(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span>Include ABO/Rh Compatible Groups</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span>Available Donors Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span>56-Day Clinically Eligible Only</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="py-2 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            {isLoading ? "Searching..." : "Apply Filters"}
          </button>
        </div>
      </form>

      {/* Notice */}
      <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
        <strong>Broadcast Note:</strong> Emergency requests are always broadcast simultaneously to{" "}
        <em>all</em> matching eligible donors in the platform, not only those displayed in this search list.
      </div>

      {/* Results Table */}
      {donors.length > 0 ? (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Donor ID</th>
                <th className="py-2.5 px-3">Blood Group</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3">56-Day Rule</th>
                <th className="py-2.5 px-3">Donations</th>
                {isAdmin && <th className="py-2.5 px-3">Contact</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {d.donorId}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[11px]">
                      {d.bloodGroup}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{d.city}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {(d as any).state || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    {d.isAvailable ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {d.isEligible ? (
                      <span className="text-emerald-600 font-semibold">
                        Eligible
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold">
                        {d.daysSinceLastDonation !== null
                          ? `${56 - (d.daysSinceLastDonation || 0)}d remaining`
                          : "Ineligible"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    {d.totalDonations}
                  </td>
                  {isAdmin && (
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {d.phone || "N/A"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        hasSearched && (
          <div className="text-center py-8 text-xs text-slate-400">
            No matching registered donors found for the specified criteria.
          </div>
        )
      )}
    </div>
  );
};
