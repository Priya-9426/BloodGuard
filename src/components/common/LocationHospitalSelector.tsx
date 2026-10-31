import React, { useState, useEffect } from "react";
import { TypeOrSelectCombobox } from "./TypeOrSelectCombobox";
import {
  getStates,
  getDistricts,
  getCities,
  getApiHospitals,
} from "../../utils/api";
import { Hospital } from "../../types";
import { Building2, ShieldCheck, AlertCircle } from "lucide-react";

export interface LocationValues {
  state: string;
  district: string;
  city: string;
  hospitalName?: string;
  hospitalId?: string;
  hospitalType?: string;
  isCustomHospital?: boolean;
}

interface LocationHospitalSelectorProps {
  values: LocationValues;
  onChange: (vals: LocationValues) => void;
  showHospital?: boolean;
  required?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export const LocationHospitalSelector: React.FC<LocationHospitalSelectorProps> = ({
  values,
  onChange,
  showHospital = false,
  required = false,
  disabled = false,
  title,
  className = "",
}) => {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(false);

  // 1. Fetch States on mount
  useEffect(() => {
    getStates()
      .then((data) => setStates(data))
      .catch((err) => console.error("[LocationSelector] Error fetching states:", err));
  }, []);

  // 2. Fetch Districts when State changes
  useEffect(() => {
    if (values.state) {
      getDistricts(values.state)
        .then((data) => setDistricts(data))
        .catch((err) => console.error("[LocationSelector] Error fetching districts:", err));
    } else {
      setDistricts([]);
    }
  }, [values.state]);

  // 3. Fetch Cities when District or State changes
  useEffect(() => {
    if (values.state) {
      getCities(values.state, values.district)
        .then((data) => setCities(data))
        .catch((err) => console.error("[LocationSelector] Error fetching cities:", err));
    } else {
      setCities([]);
    }
  }, [values.state, values.district]);

  // 4. Fetch Hospitals when City, District, or State changes
  useEffect(() => {
    if (showHospital && (values.city || values.state)) {
      setLoadingHospitals(true);
      getApiHospitals({
        state: values.state || undefined,
        district: values.district || undefined,
        city: values.city || undefined,
      })
        .then((data) => setHospitals(data))
        .catch((err) => console.error("[LocationSelector] Error fetching hospitals:", err))
        .finally(() => setLoadingHospitals(false));
    } else {
      setHospitals([]);
    }
  }, [showHospital, values.state, values.district, values.city]);

  // Handle State Change: clear downstream district, city, hospital
  const handleStateChange = (newState: string) => {
    onChange({
      ...values,
      state: newState,
      district: "",
      city: "",
      hospitalName: showHospital ? "" : values.hospitalName,
      hospitalId: undefined,
      isCustomHospital: false,
    });
  };

  // Handle District Change: clear downstream city, hospital
  const handleDistrictChange = (newDistrict: string) => {
    onChange({
      ...values,
      district: newDistrict,
      city: "",
      hospitalName: showHospital ? "" : values.hospitalName,
      hospitalId: undefined,
      isCustomHospital: false,
    });
  };

  // Handle City Change: clear downstream hospital
  const handleCityChange = (newCity: string) => {
    onChange({
      ...values,
      city: newCity,
      hospitalName: showHospital ? "" : values.hospitalName,
      hospitalId: undefined,
      isCustomHospital: false,
    });
  };

  // Handle Hospital Change
  const handleHospitalChange = (hospitalNameInput: string) => {
    const matched = hospitals.find(
      (h) => h.name.toLowerCase() === hospitalNameInput.trim().toLowerCase(),
    );

    if (matched) {
      onChange({
        ...values,
        hospitalName: matched.name,
        hospitalId: matched._id || matched.id,
        hospitalType: matched.type || "Private",
        isCustomHospital: false,
      });
    } else {
      // Custom unlisted hospital
      onChange({
        ...values,
        hospitalName: hospitalNameInput,
        hospitalId: undefined,
        hospitalType: "Other",
        isCustomHospital: hospitalNameInput.trim().length > 0,
      });
    }
  };

  const hospitalOptions = hospitals.map((h) => h.name);

  // Check if current hospital selection is custom
  const selectedHospitalDoc = hospitals.find(
    (h) =>
      values.hospitalName &&
      h.name.toLowerCase() === values.hospitalName.toLowerCase(),
  );
  const isCustomHospital =
    showHospital &&
    Boolean(values.hospitalName && values.hospitalName.trim().length > 0) &&
    !selectedHospitalDoc;

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
          <Building2 className="w-4 h-4 text-red-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h4>
        </div>
      )}

      {/* Grid for State, District, City */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. State */}
        <TypeOrSelectCombobox
          label="State"
          value={values.state}
          onChange={handleStateChange}
          options={states}
          placeholder="e.g. Tamil Nadu"
          required={required}
          disabled={disabled}
          helperText="5 South Indian states supported"
        />

        {/* 2. District */}
        <TypeOrSelectCombobox
          label="District"
          value={values.district}
          onChange={handleDistrictChange}
          options={districts}
          placeholder="e.g. Salem"
          required={required}
          disabled={disabled || !values.state}
          helperText={!values.state ? "Select State first" : undefined}
        />

        {/* 3. City / Town */}
        <TypeOrSelectCombobox
          label="City / Town"
          value={values.city}
          onChange={handleCityChange}
          options={cities}
          placeholder="e.g. Salem"
          required={required}
          disabled={disabled || !values.district}
          helperText={!values.district ? "Select District first" : undefined}
        />
      </div>

      {/* 4. Hospital Selection (If Enabled) */}
      {showHospital && (
        <div className="pt-1">
          <TypeOrSelectCombobox
            label="Verified Treatment Hospital"
            value={values.hospitalName || ""}
            onChange={handleHospitalChange}
            options={hospitalOptions}
            placeholder={
              loadingHospitals
                ? "Loading hospitals..."
                : values.city
                ? `Search or type hospital in ${values.city}...`
                : "Select City to view hospitals..."
            }
            required={required}
            disabled={disabled}
            helperText={
              hospitalOptions.length > 0
                ? `${hospitalOptions.length} verified hospitals found in this location`
                : "Type custom hospital if unlisted"
            }
            customBadge={
              isCustomHospital
                ? "⚠️ Custom Hospital — will be submitted with Pending Verification status"
                : undefined
            }
          />

          {/* Hospital status indicator */}
          {selectedHospitalDoc && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Verified {selectedHospitalDoc.type || "Hospital"} •{" "}
                {selectedHospitalDoc.address || selectedHospitalDoc.city}
              </span>
            </div>
          )}

          {isCustomHospital && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                New unlisted hospital will be flagged as <strong>Pending Verification</strong>.
                Admin will review and verify official details.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
