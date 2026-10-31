import React from "react";
import { useBloodGuard } from "../../context/BloodGuardContext";
import { Modal } from "./Modal";
import { Droplet, HeartHandshake, CheckCircle2 } from "lucide-react";

export const RoleSelectionModal: React.FC = () => {
  const {
    currentUser,
    activeRole,
    switchActiveRole,
    isRoleSelectionModalOpen,
    setIsRoleSelectionModalOpen,
  } = useBloodGuard();

  const isBoth =
    currentUser.roles?.includes("patient") && currentUser.roles?.includes("donor");

  if (!isBoth) return null;

  const handleSelectRole = (role: "patient" | "donor") => {
    switchActiveRole(role);
    setIsRoleSelectionModalOpen(false);
  };

  return (
    <Modal
      isOpen={isRoleSelectionModalOpen}
      onClose={() => setIsRoleSelectionModalOpen(false)}
      title="Choose Active Portal"
      subtitle="Your account is registered as both a Patient and a Donor. Select which portal you wish to access now. You can switch modes anytime without signing out."
      maxWidth="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
        {/* Patient Portal Card */}
        <div
          onClick={() => handleSelectRole("patient")}
          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
            activeRole === "patient"
              ? "border-red-600 bg-red-50/70 ring-2 ring-red-600/20 shadow-md"
              : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <Droplet className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
            👤 Patient Portal
            {activeRole === "patient" && (
              <CheckCircle2 className="w-4 h-4 text-red-600" />
            )}
          </h4>
          <span className="text-[11px] font-mono text-slate-500 mt-1">
            ID: {currentUser.patientId || `PD${String(currentUser.phone).slice(-5)}`}
          </span>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Create emergency requests, upload medical prescriptions, and track donor broadcasts.
          </p>
          <button
            type="button"
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
              activeRole === "patient"
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {activeRole === "patient" ? "Currently Active" : "Enter Patient Portal"}
          </button>
        </div>

        {/* Donor Portal Card */}
        <div
          onClick={() => handleSelectRole("donor")}
          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
            activeRole === "donor"
              ? "border-red-600 bg-red-50/70 ring-2 ring-red-600/20 shadow-md"
              : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
            🩸 Donor Portal
            {activeRole === "donor" && (
              <CheckCircle2 className="w-4 h-4 text-red-600" />
            )}
          </h4>
          <span className="text-[11px] font-mono text-slate-500 mt-1">
            ID: {currentUser.donorId || `DN${String(currentUser.phone).slice(-5)}`} • {currentUser.bloodGroup || "O+"}
          </span>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            View live matching blood alerts, respond to emergency requests, and manage availability.
          </p>
          <button
            type="button"
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
              activeRole === "donor"
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {activeRole === "donor" ? "Currently Active" : "Enter Donor Portal"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
