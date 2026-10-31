const mongoose = require("mongoose");
const { normalizeIndianPhone } = require("../utils/phone");

const SmsLogSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    donorId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    patientId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
      set: (val) => normalizeIndianPhone(val) || String(val || "unknown"),
    },
    recipientType: {
      type: String,
      enum: ["donor", "patient", "admin", "unknown"],
      default: "unknown",
    },
    direction: {
      type: String,
      enum: ["outbound"],
      default: "outbound",
    },
    provider: {
      type: String,
      enum: ["textbelt", "fast2sms", "jio", "twilio", "disabled"],
      default: "disabled",
    },
    messageType: {
      type: String,
      enum: [
        "broadcast",
        "donor_broadcast",
        "patient_confirmation",
        "acceptance_patient",
        "acceptance_confirm",
        "other_donor_notice",
        "patient_reopen",
        "admin_notice",
        "test",
        "backfill",
      ],
      default: "broadcast",
    },
    status: {
      type: String,
      enum: ["sent", "failed", "queued", "delivered", "skipped"],
      default: "queued",
    },
    messageSnippet: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

SmsLogSchema.index({ requestId: 1, recipientType: 1, createdAt: -1 });
SmsLogSchema.index({ donorId: 1, createdAt: -1 });
SmsLogSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model("SmsLog", SmsLogSchema);
