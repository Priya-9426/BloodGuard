import React, { useEffect, useState } from "react";
import { useBloodGuard } from "../context/BloodGuardContext";
import { BloodGroup } from "../types";
import { CreateRequestModal } from "./CreateRequestModal";
import { StatusBadge } from "../components/common/StatusBadge";
import { getApiPublicStats, PublicStats } from "../utils/api";
import {
  ShieldCheck,
  Radio,
  Clock,
  Users,
  Building2,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Heart,
  AlertCircle,
  PhoneCall,
  Activity,
  Droplet,
  Sparkles,
  Lock,
  Zap,
  HelpCircle,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const { currentUser, requests, setActiveTab, isApiAuthenticated } =
    useBloodGuard();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [publicStats, setPublicStats] = useState<PublicStats>({
    registeredDonors: 0,
    fulfilledRequests: 0,
    activeRequests: 0,
    totalRequests: 0,
  });

  useEffect(() => {
    let active = true;
    const refreshStats = async () => {
      try {
        const stats = await getApiPublicStats();
        if (active) setPublicStats(stats);
      } catch (error) {
        console.error(
          "[BloodGuard API] Could not load public statistics:",
          error,
        );
      }
    };
    void refreshStats();
    const interval = window.setInterval(refreshStats, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

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

  // Calculate live counts
  const activeBroadcastsCount = requests.filter(
    (r) => r.status === "broadcasting",
  ).length;
  const featuredRequest =
    requests.find((request) => request.status === "broadcasting") ||
    requests[0];
  const openRequestForm = () => {
    if (!isApiAuthenticated) {
      setActiveTab("login");
    } else if (currentUser.role === "patient" || currentUser.role === "admin") {
      setIsRequestModalOpen(true);
    } else {
      setActiveTab("donor-dashboard");
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 animate-fade-in pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-xs font-bold tracking-wide shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
                <span>AI-Driven Anomaly Detection & Real-Time Broadcast</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Every Second Matters. <br />
                <span className="text-red-600">Every Drop Counts.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-normal">
                BloodGuard connects emergency blood requests with eligible
                donors through secure fraud screening and simultaneous real-time
                push alerts — with zero algorithmic bias or donor ranking.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  onClick={openRequestForm}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-red-600/30 transition-all"
                >
                  <Droplet className="w-5 h-5 fill-white" />
                  <span>Request Blood Now</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() =>
                    currentUser.role === "donor"
                      ? setActiveTab("donor-dashboard")
                      : setActiveTab("register")
                  }
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold text-sm sm:text-base transition-all shadow-sm"
                >
                  <Heart className="w-4 h-4 text-red-600" />
                  <span>Become a Donor</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Isolation Forest Screening</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-red-600" />
                  <span>Simultaneous FCM Broadcast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>56-Day Refractory Rule</span>
                </div>
              </div>
            </div>

            {/* Right Healthcare Visual Card (No Maps/GPS as per strict rule) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 text-white shadow-2xl border border-slate-800">
                {/* Floating Badge */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                      Emergency Broadcast Hub
                    </span>
                  </div>
                  <span className="text-[11px] font-mono bg-red-950/80 text-red-400 px-2 py-0.5 rounded border border-red-800/80">
                    {activeBroadcastsCount} OPEN
                  </span>
                </div>

                <div className="space-y-4">
                  {featuredRequest ? (
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-red-400">
                          Blood request status
                        </span>
                        <span className="text-slate-400 font-mono">
                          {featuredRequest.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-600 text-white font-extrabold text-base">
                          {featuredRequest.bloodGroup}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {featuredRequest.hospitalName}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {featuredRequest.unitsRequired} unit(s) •{" "}
                            {featuredRequest.status}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 text-[11px] text-slate-300 border border-slate-800">
                        Eligible matching donors notified:{" "}
                        <strong className="text-white">
                          {featuredRequest.eligibleDonorsNotifiedCount || 0}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-sm text-slate-300">
                      {isApiAuthenticated
                        ? "No open requests are currently assigned to this account."
                        : "Sign in to view account requests and donor alerts."}
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-3 text-xs text-emerald-300">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block">
                        Request security screening
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        Backend screens requests before donor broadcast.
                      </span>
                    </div>
                  </div>

                  {/* Donors quick badge */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 text-xs text-slate-400 border border-slate-700/50">
                    <span>Verified Donors Network</span>
                    <strong className="text-white font-mono">
                      {publicStats.registeredDonors} Registered Donors
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMERGENCY CTA SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 p-6 sm:p-10 text-white shadow-xl shadow-red-600/20 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Immediate Medical Response</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                🚨 Need Blood Urgently?
              </h2>
              <p className="text-sm sm:text-base text-red-100 leading-relaxed font-normal">
                Create an emergency blood request and notify all eligible
                matching donors instantly across the region.
              </p>
            </div>

            <button
              onClick={openRequestForm}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-red-700 font-extrabold text-sm sm:text-base shadow-lg transition-all active:scale-95 shrink-0"
            >
              <span>Request Blood Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. HOW BLOODGUARD WORKS (4-STEP VISUAL PROCESS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        <div className="max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider">
            Automated Coordination Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How BloodGuard Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            A zero-latency, 4-stage pipeline that secures requests and
            broadcasts alerts without artificial scoring bottlenecks.
          </p>
        </div>

        {/* 4 Connected Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Step 01 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-200 group-hover:text-red-600 transition-colors">
                  01
                </span>
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                  <Droplet className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Create Request
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Patient or attending hospital submits the required blood
                  group, unit count, and urgency level.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Stage 1: Clinical Ingestion
            </div>
          </div>

          {/* Step 02 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-200 group-hover:text-amber-500 transition-colors">
                  02
                </span>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Security Screening
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Isolation Forest ML verifies request frequency, unit volume,
                  and profile validity to isolate spam.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Stage 2: AI Anomaly Detection
            </div>
          </div>

          {/* Step 03 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-200 group-hover:text-blue-500 transition-colors">
                  03
                </span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Eligibility Filtering
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  System evaluates exact ABO/Rh match, active donor toggle, and
                  mandatory 56-day donation recovery rule.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Stage 3: Medical Constraint Check
            </div>
          </div>

          {/* Step 04 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-200 group-hover:text-emerald-500 transition-colors">
                  04
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Radio className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Broadcast Alert
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  All eligible matching donors receive simultaneous push
                  notifications via FCM. First responder connects.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Stage 4: Simultaneous Dispatch
            </div>
          </div>
        </div>
      </section>

      {/* 4. KEY FEATURES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Key Architectural Features
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Engineered for high reliability, clinical safety, and swift
            emergency action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Emergency Blood Requests
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create and track urgent blood requests with real-time status
              visibility from screening to fulfillment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Fraud Detection (Isolation Forest)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detect suspicious request patterns, unusual volume bursts, and
              rapid submissions using unsupervised machine learning.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Real-Time Broadcast
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Notify all eligible matching donors simultaneously via Firebase
              Cloud Messaging without artificial queuing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Eligibility Filtering
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enforce strict medical constraints: ABO/Rh group match, donor
              availability toggle, and the 56-day donation rule.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Verified Donor Network
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time donor availability across 8 blood groups applying clinical
              56-day whole blood refractory eligibility.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Admin Monitoring & Audit
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect flagged anomaly cases in the Fraud Review Center and
              oversee platform operations in real time.
            </p>
          </div>
        </div>
      </section>

      {/* 5. STATISTICS SECTION */}
      <section className="bg-slate-900 text-white py-14 rounded-3xl max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Platform Metrics & Impact
            </h2>
            <p className="text-xs text-slate-400">
              Aggregate counts from the BloodGuard database.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-red-500">
                {publicStats.registeredDonors.toLocaleString()}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                Registered Donors
              </p>
              <span className="text-[10px] text-slate-400">Verified Pool</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                {publicStats.fulfilledRequests.toLocaleString()}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                Successful Requests
              </p>
              <span className="text-[10px] text-slate-400">
                Transfusions Done
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-blue-400">
                {publicStats.activeRequests.toLocaleString()}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                Open Requests
              </p>
              <span className="text-[10px] text-slate-400">
                Currently broadcasting
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-amber-400">
                8
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                Blood Groups
              </p>
              <span className="text-[10px] text-slate-400">
                In active clinical registry
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BLOOD GROUP COVERAGE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Blood Group Coverage & Readiness
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified donor coverage across all 8 ABO/Rh blood groups ready for instant emergency broadcast dispatch.
            </p>
          </div>

          <button
            onClick={() => setActiveTab("how-it-works")}
            className="text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Learn How BloodGuard Works</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 8 Blood Group Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {bloodGroups.map((bg) => (
            <div
              key={bg}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-red-300 transition-all text-center flex flex-col justify-between"
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-red-50 text-red-600 font-extrabold text-base flex items-center justify-center mb-2">
                {bg}
              </div>

              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Ready
                </div>
                <span className="text-[10px] text-slate-400 font-medium uppercase block">
                  Broadcast Active
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Covered
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-200 pt-12 text-slate-500 text-xs space-y-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">
                Blood<span className="text-red-600">Guard</span>
              </span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              "Every Second Matters. Every Drop Counts." — A secure, intelligent
              framework for emergency blood donor coordination.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Core Workflow</h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>Emergency Blood Request</li>
              <li>AI Anomaly Screening (Isolation Forest)</li>
              <li>Eligibility Filtering (56-Day Rule)</li>
              <li>Simultaneous Push Broadcast</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">System Portals</h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>
                <button
                  onClick={() => setActiveTab("login")}
                  className="hover:text-red-600"
                >
                  Patient Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("login")}
                  className="hover:text-red-600"
                >
                  Donor Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("login")}
                  className="hover:text-red-600"
                >
                  Admin Command Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("how-it-works")}
                  className="hover:text-red-600"
                >
                  How BloodGuard Works
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">Emergency Desk</h4>
            <p className="text-xs text-slate-600">
              24/7 Regional Emergency Hotline:
            </p>
            <strong className="text-slate-900 font-mono text-sm block mt-0.5">
              1-800-BLOOD-GD
            </strong>
            <p className="text-[11px] text-slate-400 mt-2">
              Secure emergency blood request coordination.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 pt-6 text-center text-[11px] text-slate-400">
          BloodGuard © 2026. Secure Blood Coordination with Real-Time Emergency
          Alerts.
        </div>
      </footer>

      {/* Request Modal */}
      <CreateRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
};
