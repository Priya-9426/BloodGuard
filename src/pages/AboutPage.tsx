import React from 'react';
import { Shield, Droplet, CheckCircle2, AlertOctagon, Cpu, Database, Bell, Lock } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
          <Shield className="w-3.5 h-3.5" />
          <span>Academic Engineering Project</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About BloodGuard Framework
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          A Secure and Intelligent Blood Donor Management Framework with AI-Driven Anomaly Detection and Real-Time Emergency Notifications.
        </p>
      </div>

      {/* Core Mission & Philosophy */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Core Purpose & Philosophy</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          In emergency medicine, every second counts. Traditional platforms suffer from two fatal flaws: they rely on passive directories where seekers must dial phone numbers one by one, or they introduce opaque AI donor-ranking scoring systems that queue notifications sequentially and require intrusive continuous GPS tracking.
        </p>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          BloodGuard re-engineers this paradigm: it treats all medically eligible donors equally by broadcasting emergency requests to <strong>all matching donors simultaneously</strong> via Firebase Cloud Messaging, while protecting donors from spam and abuse through real-time <strong>Isolation Forest anomaly detection</strong>.
        </p>
      </div>

      {/* Strict Ethical Architecture: What BloodGuard Does NOT Do */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-5 shadow-xl">
        <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm uppercase tracking-wider">
          <AlertOctagon className="w-5 h-5" />
          <span>Strict Architectural Safeguards (Zero Algorithmic Bias)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <strong className="text-white block">✕ No Donor Ranking or Scoring</strong>
            <p className="text-slate-400">Donors are never graded, scored, or ranked. Medical eligibility is binary (eligible vs ineligible).</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <strong className="text-white block">✕ No Cascading / Sequential Alerts</strong>
            <p className="text-slate-400">Alerts are never staggered. Every eligible donor receives the notification at the same instant.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <strong className="text-white block">✕ No Continuous GPS Tracking</strong>
            <p className="text-slate-400">Preserves donor battery and privacy by avoiding invasive real-time geolocation tracking.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <strong className="text-white block">✓ Simultaneous Multicast Broadcast</strong>
            <p className="text-slate-400">All matching donors receive the push alert in parallel; first available donor accepts.</p>
          </div>
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Engineering Technology Stack</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Cpu className="w-4 h-4 text-red-600" />
              <span>Frontend Architecture</span>
            </div>
            <p className="text-slate-500">React.js 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts Data Visualization.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Backend & Database</span>
            </div>
            <p className="text-slate-500">Node.js, Express REST Framework, MongoDB with atomic request-locking transactions.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>AI Anomaly Detection</span>
            </div>
            <p className="text-slate-500">Python, Scikit-Learn Isolation Forest (unsupervised tree ensemble for request verification).</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Push Notifications</span>
            </div>
            <p className="text-slate-500">Firebase Cloud Messaging (FCM) simultaneous multicast notification dispatcher.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Authentication</span>
            </div>
            <p className="text-slate-500">Role-Based Access Control (RBAC) with JWT tokens and bcrypt password encryption.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Clinical Safeguards</span>
              </div>
            <p className="text-slate-500">Automated 56-day whole blood refractory calculation and donor availability toggles.</p>
          </div>

        </div>
      </div>

    </div>
  );
};
