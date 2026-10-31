import React, { useState, useEffect } from "react";
import { getLocationStats } from "../../utils/api";
import { MapPin, RefreshCw, Users, Activity, Building2 } from "lucide-react";

interface CityStats {
  city: string;
  state: string;
  district?: string;
  donorCount: number;
  requestCount: number;
  fulfilledCount: number;
}

interface StateStats {
  state: string;
  donorCount: number;
  requestCount: number;
  hospitalCount: number;
  cities: CityStats[];
}

interface LocationStatsData {
  byState: StateStats[];
  byCity: CityStats[];
  totalDonors: number;
  totalRequests: number;
  totalHospitals: number;
}

export const AdminLocationReports: React.FC = () => {
  const [stats, setStats] = useState<LocationStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [view, setView] = useState<"state" | "city">("state");

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getLocationStats();
      const cityMap = new Map<string, CityStats>();

      (data.cityDonorStats || []).forEach((d) => {
        const key = `${d.city}-${d.state}`;
        cityMap.set(key, {
          city: d.city,
          state: d.state,
          donorCount: d.count,
          requestCount: 0,
          fulfilledCount: 0,
        });
      });

      (data.cityRequestStats || []).forEach((r) => {
        const key = `${r.city}-${r.state}`;
        const existing = cityMap.get(key) || {
          city: r.city,
          state: r.state,
          donorCount: 0,
          requestCount: 0,
          fulfilledCount: 0,
        };
        existing.requestCount = r.count;
        existing.fulfilledCount = r.fulfilled;
        cityMap.set(key, existing);
      });

      const byCity = Array.from(cityMap.values());

      const stateMap = new Map<string, StateStats>();
      byCity.forEach((c) => {
        const existing = stateMap.get(c.state) || {
          state: c.state,
          donorCount: 0,
          requestCount: 0,
          hospitalCount: 0,
          cities: [],
        };
        existing.donorCount += c.donorCount;
        existing.requestCount += c.requestCount;
        existing.cities.push(c);
        stateMap.set(c.state, existing);
      });

      const byState = Array.from(stateMap.values());

      setStats({
        byState,
        byCity,
        totalDonors: data.metrics?.totalDonors || 0,
        totalRequests: data.metrics?.totalRequests || 0,
        totalHospitals: data.metrics?.hospitals?.total || 0,
      });
    } catch (_) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Loading location reports...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            Location-Based Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Donor distribution, request activity, and hospital coverage by state and city.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("state")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              view === "state"
                ? "bg-red-600 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            By State
          </button>
          <button
            onClick={() => setView("city")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              view === "city"
                ? "bg-red-600 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            By City
          </button>
          <button
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Total Donors
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {stats.totalDonors}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3" /> Total Requests
            </div>
            <div className="text-2xl font-extrabold text-red-600 mt-1">
              {stats.totalRequests}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Hospitals
            </div>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">
              {stats.totalHospitals}
            </div>
          </div>
        </div>
      )}

      {/* State View */}
      {stats && view === "state" && (
        <div className="space-y-2">
          {stats.byState.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No location data available yet.
            </div>
          ) : (
            stats.byState.map((s) => (
              <div
                key={s.state}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() =>
                    setExpandedState(
                      expandedState === s.state ? null : s.state,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-slate-900">
                      {s.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{s.donorCount} donors</span>
                    <span>{s.requestCount} requests</span>
                    <span>{s.hospitalCount} hospitals</span>
                  </div>
                </button>
                {expandedState === s.state &&
                  s.cities &&
                  s.cities.length > 0 && (
                    <div className="border-t border-slate-100">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="py-2 px-4">City</th>
                            <th className="py-2 px-4">District</th>
                            <th className="py-2 px-4">Donors</th>
                            <th className="py-2 px-4">Requests</th>
                            <th className="py-2 px-4">Fulfilled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {s.cities.map((c) => (
                            <tr key={c.city} className="hover:bg-slate-50">
                              <td className="py-2 px-4 font-semibold text-slate-800">
                                {c.city}
                              </td>
                              <td className="py-2 px-4 text-slate-500">
                                {c.district || "—"}
                              </td>
                              <td className="py-2 px-4 text-emerald-700 font-bold">
                                {c.donorCount}
                              </td>
                              <td className="py-2 px-4 text-red-600 font-bold">
                                {c.requestCount}
                              </td>
                              <td className="py-2 px-4 text-blue-600 font-bold">
                                {c.fulfilledCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      )}

      {/* City View */}
      {stats && view === "city" && (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Donors</th>
                <th className="py-2.5 px-3">Requests</th>
                <th className="py-2.5 px-3">Fulfilled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.byCity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No city data yet.
                  </td>
                </tr>
              ) : (
                stats.byCity.map((c) => (
                  <tr
                    key={`${c.city}-${c.state}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {c.city}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {c.district || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{c.state}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold">
                      {c.donorCount}
                    </td>
                    <td className="py-2.5 px-3 text-red-600 font-bold">
                      {c.requestCount}
                    </td>
                    <td className="py-2.5 px-3 text-blue-600 font-bold">
                      {c.fulfilledCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
