import React from 'react';
import { useBloodGuard } from '../context/BloodGuardContext';
import { 
  ShieldCheck, 
  Radio, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Lock, 
  Cpu, 
  Zap 
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const { setActiveTab } = useBloodGuard();

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider">
          System Architecture & Workflow
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How BloodGuard Operates
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          A secure, automated coordination pipeline engineered to eliminate sequential latency and algorithmically biased scoring in life-critical emergencies.
        </p>
      </div>

      {/* Comparison: Legacy Directory vs BloodGuard Broadcast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Legacy Systems */}
        <div className="p-6 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Legacy Directory Apps (The Problem)</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Passive Directory:</strong> Patient must manually browse and dial donors one by one.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Sequential Delay:</strong> Critical time lost when initial contacts are unreachable.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>No Fraud Defense:</strong> Susceptible to fake bulk requests, bot spam, and donor fatigue.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Unchecked Ineligibility:</strong> Frequently contacts donors who donated recently.</span>
            </li>
          </ul>
        </div>

        {/* BloodGuard System */}
        <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>BloodGuard Framework (Our Solution)</span>
          </div>
          <ul className="space-y-2.5 text-xs text-emerald-950">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Simultaneous Push Broadcast:</strong> All matching eligible donors alerted at once via FCM.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>AI Anomaly Detection:</strong> Real-time Isolation Forest screens requests for suspicious patterns.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Zero Algorithmic Bias:</strong> No donor ranking, scoring, or location tiers — pure equal reach.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>56-Day Clinical Rule:</strong> Automatically excludes donors currently in recovery.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* 4 Pipeline Stages in Detail */}
      <div className="space-y-6">
        <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-3">
          4-Stage Processing Pipeline
        </h2>

        <div className="space-y-4">
          
          {/* Stage 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
              01
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-bold text-slate-900">Emergency Request Ingestion</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The patient or attending hospital staff creates an emergency request specifying required ABO/Rh blood type, required units (pints), urgency priority (Critical / Urgent / Standard), and medical center details.
              </p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
              02
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AI Fraud Screening (Isolation Forest)</h3>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Machine Learning
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Before sending alerts, an unsupervised <strong>Isolation Forest</strong> algorithm evaluates the request across multiple behavioral dimensions: 24-hour request velocity, bulk unit demand anomalies (&gt;4 units), off-hour submission spikes, and profile verification status. If an anomaly score exceeds threshold (&gt;0.55), the request is quarantined in the <strong>Fraud Review Center</strong> for admin audit.
              </p>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
              03
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-bold text-slate-900">Deterministic Eligibility Filtering</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Verified requests trigger a hard constraint query across registered donors:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>1. Blood Compatibility:</strong> Exact ABO/Rh match
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>2. Active Toggle:</strong> Marked 🟢 AVAILABLE
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>3. 56-Day Rule:</strong> $\ge$56 days since last whole blood donation
                </div>
              </div>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
              04
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-bold text-slate-900">Simultaneous Push Broadcast (FCM)</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Firebase Cloud Messaging sends a multicast push notification to all eligible matching donors at the exact same moment. The first available donor to accept locks the request, connecting the donor with the patient's medical facility.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* CTA Bottom */}
      <div className="text-center pt-6">
        <button
          onClick={() => setActiveTab('landing')}
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all"
        >
          Return to Home Page
        </button>
      </div>

    </div>
  );
};
