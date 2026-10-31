import React, { useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { BloodGroup } from "../types";
import {
  Shield,
  Droplet,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  HeartHandshake,
  Users,
} from "lucide-react";
import { LocationHospitalSelector, LocationValues } from "../components/common/LocationHospitalSelector";

export const LoginPage: React.FC = () => {
  const { setActiveTab, signIn, showToast } = useBloodGuard();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    try {
      await signIn(email, password);
    } catch (error) {
      const message = (error as Error).message;
      setLoginError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
        {/* Left Branding Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-red-950 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                BloodGuard
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Emergency Blood Access
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Sign in to manage emergency blood requests, verify donation
                eligibility, or respond directly to alerts.
              </p>
            </div>

            <div className="space-y-3 pt-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>Multi-role support: Patient, Donor, or Both</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>Simultaneous Fast2SMS alerts with direct actions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>First-accept-wins atomic coordination</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-[11px] text-slate-400 relative z-10">
            "Every Second Matters. Every Drop Counts."
          </div>
        </div>

        {/* Right Login Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Sign in to your account
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your registered email and password.
            </p>
          </div>

          {loginError && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {loginError}
            </p>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs flex items-center justify-between text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Admin Login:</span>{" "}
              <span className="font-mono text-slate-700 font-medium">
                admin@bloodguard.health
              </span>
              <span className="text-slate-400 mx-1">|</span>
              <span className="font-mono text-slate-700 font-medium">
                Admin@123456
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@bloodguard.health");
                setPassword("Admin@123456");
              }}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline shrink-0 ml-2"
            >
              Fill Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Don't have an account?{" "}
            <button
              onClick={() => setActiveTab("register")}
              className="text-red-600 font-bold hover:underline"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { registerAccount, showToast } = useBloodGuard();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LocationValues>({
    state: "Tamil Nadu",
    district: "Salem",
    city: "Salem",
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Role choice: Exactly one of three choices (Section 2)
  // "patient" -> roles: ["patient"]
  // "donor" -> roles: ["donor"]
  // "both" -> roles: ["patient", "donor"]
  const [roleChoice, setRoleChoice] = useState<"patient" | "donor" | "both">(
    "donor",
  );

  // Donor Details
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [dob, setDob] = useState("1998-05-14");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

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

  const getRolesPayload = (): string[] => {
    if (roleChoice === "patient") return ["patient"];
    if (roleChoice === "donor") return ["donor"];
    return ["patient", "donor"];
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (roleChoice === "patient") {
        setIsSubmitting(true);
        setRegistrationError("");
        try {
          await registerAccount({
            name: fullName,
            email,
            phone,
            password,
            state: location.state,
            district: location.district,
            city: location.city,
            roles: ["patient"],
            role: "patient",
          });
          showToast("Registration successful! Welcome to BloodGuard.", "success");
        } catch (error) {
          const message = (error as Error).message;
          setRegistrationError(message);
          showToast(message, "error");
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Donor or Both moves to Step 3 for blood group details
        setStep(3);
      }
    } else if (step === 3) {
      setIsSubmitting(true);
      setRegistrationError("");
      try {
        const roles = getRolesPayload();
        await registerAccount({
          name: fullName,
          email,
          phone,
          password,
          state: location.state,
          district: location.district,
          city: location.city,
          roles,
          role: roles[0],
          bloodGroup,
          dateOfBirth: dob || undefined,
          lastDonationDate: lastDonationDate || undefined,
          isAvailable,
        });
        showToast(
          roleChoice === "both"
            ? `Registration complete as Patient & ${bloodGroup} Donor.`
            : `Registration complete as ${bloodGroup} Donor.`,
          "success",
        );
      } catch (error) {
        const message = (error as Error).message;
        setRegistrationError(message);
        showToast(message, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-10 space-y-6">
        {/* Progress Header */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Create your BloodGuard account
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Step {step} of {roleChoice === "patient" ? 2 : 3}
            </span>
          </div>

          {/* Stepper Indicators */}
          <div className="flex items-center gap-2 pt-1">
            <div
              className={`h-2 flex-1 rounded-full transition-all ${step >= 1 ? "bg-red-600" : "bg-slate-200"}`}
            />
            <div
              className={`h-2 flex-1 rounded-full transition-all ${step >= 2 ? "bg-red-600" : "bg-slate-200"}`}
            />
            {roleChoice !== "patient" && (
              <div
                className={`h-2 flex-1 rounded-full transition-all ${step >= 3 ? "bg-red-600" : "bg-slate-200"}`}
              />
            )}
          </div>
        </div>

        {registrationError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            {registrationError}
          </div>
        )}

        <form onSubmit={handleNextStep} className="space-y-5">
          {/* STEP 1: Personal & Contact Details */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-700">
                1. Personal & Contact Information
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-digit Indian Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="9876543210"
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      title="Enter a 10-digit Indian mobile number."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium font-mono"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Public IDs (e.g. PD12345 / DN12345) are generated from your mobile digits.
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <LocationHospitalSelector
                  values={location}
                  onChange={setLocation}
                  showHospital={false}
                  required={true}
                  title="Residential Location"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 font-medium"
                      required
                      minLength={8}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* STEP 2: Multi-Role Selection (Section 2) */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Choose Account Type
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select how you would like to participate in BloodGuard. You can be a Patient, a Donor, or Both.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* 1. Patient Only */}
                <div
                  onClick={() => setRoleChoice("patient")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    roleChoice === "patient"
                      ? "border-red-600 bg-red-50/60 shadow-md ring-2 ring-red-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    👤 Patient Only
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Create emergency blood broadcasts, upload clinical prescriptions, and coordinate with donors.
                  </p>
                </div>

                {/* 2. Donor Only */}
                <div
                  onClick={() => setRoleChoice("donor")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    roleChoice === "donor"
                      ? "border-red-600 bg-red-50/60 shadow-md ring-2 ring-red-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    🩸 Donor Only
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Receive instant emergency Fast2SMS broadcasts and respond directly with one-tap ACCEPT/REJECT.
                  </p>
                </div>

                {/* 3. Both Patient and Donor */}
                <div
                  onClick={() => setRoleChoice("both")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    roleChoice === "both"
                      ? "border-red-600 bg-red-50/60 shadow-md ring-2 ring-red-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white flex items-center justify-center mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    👤🩸 Both
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Single account to both request blood emergencies and donate to patients. Switch modes anytime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Blood Group & Donor Profile */}
          {step === 3 && roleChoice !== "patient" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Donor Clinical Profile
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your blood group and donation history to ensure 56-day clinical refractory compliance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Blood Group
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {bloodGroups.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                        bloodGroup === bg
                          ? "bg-red-600 text-white border-red-600 shadow-sm scale-105"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Whole Blood Donation Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={lastDonationDate}
                    onChange={(e) => setLastDonationDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leave blank if first-time donor (automatically eligible).
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Available for Emergency Broadcasts
                  </span>
                  <span className="text-[11px] text-slate-500">
                    You can toggle your availability on/off anytime from the dashboard.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-2"
            >
              <span>
                {isSubmitting
                  ? "Creating Account..."
                  : step === (roleChoice === "patient" ? 2 : 3)
                    ? "Complete Registration"
                    : "Continue"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
