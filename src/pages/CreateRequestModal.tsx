import React, { useEffect, useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { BloodGroup, UrgencyLevel } from "../types";
import { Modal } from "../components/common/Modal";
import {
  LocationHospitalSelector,
  LocationValues,
} from "../components/common/LocationHospitalSelector";
import {
  AlertTriangle,
  UploadCloud,
  X,
  CheckCircle2,
} from "lucide-react";

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, createEmergencyRequest } = useBloodGuard();

  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [unitsRequired, setUnitsRequired] = useState<number>(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>("CRITICAL");
  const [patientName, setPatientName] = useState<string>(
    currentUser?.name || "",
  );
  const [contactPhone, setContactPhone] = useState<string>(
    currentUser?.phone || "",
  );

  // Treatment location (hospital where blood is needed)
  const [treatmentLocation, setTreatmentLocation] = useState<LocationValues>({
    state: (currentUser as any)?.state || "Tamil Nadu",
    district: (currentUser as any)?.district || "Salem",
    city: (currentUser as any)?.city || "Salem",
    hospitalName: "",
    hospitalId: "",
  });

  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [document, setDocument] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  useEffect(() => {
    if (!isOpen) return;
    setPatientName(currentUser.name || "");
    setContactPhone(currentUser.phone || "");
    setDocument(null);
    setDocumentError("");
    setTreatmentLocation({
      state: (currentUser as any)?.state || "Tamil Nadu",
      district: (currentUser as any)?.district || "Salem",
      city: (currentUser as any)?.city || "Salem",
      hospitalName: "",
      hospitalId: "",
    });
  }, [currentUser.id, currentUser.name, currentUser.phone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) {
      setDocumentError(
        "Please attach the official clinical prescription or hospital blood request report (PDF, JPG, or PNG).",
      );
      return;
    }
    if (!treatmentLocation.hospitalName?.trim()) {
      setDocumentError("Please select or enter the treatment hospital.");
      return;
    }

    setDocumentError("");
    setIsSubmitting(true);
    try {
      const request = await createEmergencyRequest({
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        urgency,
        patientName: patientName || currentUser.name,
        contactPhone,
        hospitalName: treatmentLocation.hospitalName!,
        city: treatmentLocation.city || "Salem",
        state: treatmentLocation.state,
        district: treatmentLocation.district,
        hospitalId: treatmentLocation.isCustomHospital
          ? undefined
          : treatmentLocation.hospitalId,
        hospitalType: treatmentLocation.hospitalType,
        additionalNotes,
        document,
      });
      if (request) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Emergency Blood Request"
      subtitle="Broadcast simultaneously to all matching eligible donors instantly after automated security screening."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Notice */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Medical Emergency Requirement:</span> All
            requests are screened for bulk anomaly signals. Fast2SMS alerts are
            dispatched simultaneously to all matching, available donors meeting
            the 56-day refractory interval.
          </div>
        </div>

        {documentError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
            {documentError}
          </div>
        )}

        {/* Section 1: Blood Requirement */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Blood Group &amp; Demand
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {bloodGroups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setBloodGroup(group)}
                className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                  bloodGroup === group
                    ? "bg-red-600 text-white border-red-600 shadow-sm scale-105"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Units Required (Pints)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-medium"
              >
                <option value="CRITICAL">🔴 CRITICAL (Immediate)</option>
                <option value="URGENT">🟠 URGENT (&lt; 6 Hours)</option>
                <option value="STANDARD">🟡 STANDARD (&lt; 24 Hours)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Patient Details */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            2. Patient Details
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Display Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient Full Name"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone (10 digits)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) =>
                  setContactPhone(
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="9876543210"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-mono text-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Treatment Hospital & Location */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. Treatment Hospital &amp; Location
          </label>
          <p className="text-[11px] text-slate-500">
            Select the hospital where blood is needed. You may choose a hospital in any city — not limited to your residential location.
          </p>
          <LocationHospitalSelector
            values={treatmentLocation}
            onChange={setTreatmentLocation}
            showHospital={true}
            required={true}
            title=""
          />
        </div>

        {/* Section 4: Clinical Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700">
            Emergency Clinical Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g. Scheduled emergency surgery, cross-match instructions..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        {/* Section 5: Document Upload */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            4. Hospital Prescription / Requisition Report (Required)
          </label>

          {!document ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-red-50/20 transition-all">
              <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-700">
                Click to attach doctor's blood request form
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                PDF, PNG, JPG up to 5MB. Protected with authorized server access.
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setDocument(e.target.files[0]);
                    setDocumentError("");
                  }
                }}
              />
            </label>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {document.name}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
                  ({(document.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDocument(null)}
                className="text-slate-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all"
          >
            {isSubmitting ? "Broadcasting..." : "🚨 Broadcast Emergency Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
