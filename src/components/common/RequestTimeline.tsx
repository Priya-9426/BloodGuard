import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Users,
  HeartHandshake,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { EmergencyRequest } from "../../types";
import { formatDateTime } from "../../utils/eligibility";

interface RequestTimelineProps {
  request: EmergencyRequest;
}

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  time?: string;
  icon: LucideIcon;
  isCompleted: boolean;
  isActive: boolean;
  isWarning?: boolean;
  isError?: boolean;
}

export const RequestTimeline: React.FC<RequestTimelineProps> = ({
  request,
}) => {
  const isSuspicious =
    request.isFlagged || request.status === "suspicious_review";
  const isRejected = request.status === "rejected";

  const normalSteps: TimelineStep[] = [
    {
      key: "created",
      title: "Request Created",
      description: "Emergency patient details logged",
      time: request.createdAt,
      icon: CheckCircle2,
      isCompleted: true,
      isActive: false,
    },
    {
      key: "screening",
      title: "Security Screening",
      description:
        "Isolation Forest anomaly verification (Score: " +
        request.anomalyScore +
        ")",
      icon: ShieldCheck,
      isCompleted: request.status !== "screening",
      isActive: request.status === "screening",
    },
    {
      key: "eligibility",
      title: "Eligibility Filtering",
      description: "56-day rule, active status, exact blood group matching",
      icon: Users,
      isCompleted: ["broadcasting", "accepted", "fulfilled"].includes(
        request.status,
      ),
      isActive: false,
    },
    {
      key: "broadcast",
      title: "Simultaneous Broadcast",
      description: `FCM push alert sent to ${request.eligibleDonorsNotifiedCount || "all"} eligible matching donors`,
      time: request.broadcastTime,
      icon: Radio,
      isCompleted: ["accepted", "fulfilled"].includes(request.status),
      isActive: request.status === "broadcasting",
    },
    {
      key: "donor_response",
      title: "Donor Response",
      description: request.acceptedByDonorName
        ? `Accepted by ${request.acceptedByDonorName}`
        : "Awaiting first donor acceptance",
      time: request.acceptedAt,
      icon: HeartHandshake,
      isCompleted:
        request.status === "fulfilled" || request.status === "accepted",
      isActive: request.status === "accepted",
    },
    {
      key: "fulfilled",
      title: "Fulfilled & Safe",
      description: "Transfusion coordinated with medical center",
      icon: CheckCircle2,
      isCompleted: request.status === "fulfilled",
      isActive: request.status === "fulfilled",
    },
  ];

  const suspiciousSteps: TimelineStep[] = [
    {
      key: "created",
      title: "Request Created",
      description: "Emergency submission received",
      time: request.createdAt,
      icon: CheckCircle2,
      isCompleted: true,
      isActive: false,
    },
    {
      key: "flagged",
      title: "Security Review Flagged",
      description: `Isolation Forest flagged anomaly (Score: ${request.anomalyScore})`,
      icon: AlertTriangle,
      isCompleted: true,
      isActive: false,
      isWarning: true,
    },
    {
      key: "admin_review",
      title: "Admin Review Queue",
      description: isRejected
        ? "Audited & Rejected by Medical Officer"
        : "Currently pending verification in Fraud Review Center",
      icon: isRejected ? XCircle : AlertTriangle,
      isCompleted: isRejected,
      isActive: request.status === "suspicious_review",
      isWarning: true,
      isError: isRejected,
    },
  ];

  const stepsToRender =
    isSuspicious && request.status === "suspicious_review"
      ? suspiciousSteps
      : normalSteps;

  return (
    <div className="py-3">
      {/* Warning banner if flagged */}
      {isSuspicious && request.status === "suspicious_review" && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Security Screening Notice:</span>{" "}
            This request triggered anomaly indicators (e.g. bulk unit volume or
            velocity pattern). It is awaiting manual verification by the
            Hospital Admin before donor broadcast.
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {stepsToRender.map((step, idx) => {
          const Icon = step.icon;

          let circleColor = "bg-slate-100 text-slate-400 border-slate-300";
          let textColor = "text-slate-500";

          if (step.isCompleted) {
            circleColor =
              "bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-50";
            textColor = "text-slate-900";
          } else if (step.isActive) {
            circleColor = step.isWarning
              ? "bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 animate-pulse"
              : "bg-red-600 text-white border-red-600 ring-4 ring-red-100 animate-pulse";
            textColor = "text-slate-900 font-semibold";
          } else if (step.isError) {
            circleColor = "bg-slate-700 text-white border-slate-700";
          }

          return (
            <div
              key={step.key || idx}
              className="relative flex items-start group"
            >
              <div
                className={`absolute -left-6 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${circleColor} transition-all`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="ml-3">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm ${textColor}`}>{step.title}</h4>
                  {step.isActive && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 uppercase tracking-wider">
                      Current Stage
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {step.description}
                </p>
                {step.time && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(step.time)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
