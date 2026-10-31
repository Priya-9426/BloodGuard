const mongoose = require("mongoose");
const { normalizeIndianPhone } = require("../utils/phone");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EmergencyRequestSchema = new mongoose.Schema(
  {
    // ── Public Request Number (e.g. PD12345-REQ-001) ──────────
    requestNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    // ── Patient Info ──────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientPublicId: {
      type: String,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
      set: normalizeIndianPhone,
    },

    // ── Blood Requirement ─────────────────────────────────────
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: [true, "Blood group is required"],
    },
    unitsRequired: {
      type: Number,
      required: [true, "Units required is required"],
      min: [1, "At least 1 unit required"],
      max: [20, "Cannot request more than 20 units"],
    },
    urgency: {
      type: String,
      enum: ["CRITICAL", "URGENT", "STANDARD"],
      required: true,
      default: "CRITICAL",
    },

    // ── Hospital & Location Details ───────────────────────────
    hospitalName: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    hospitalType: {
      type: String,
      enum: ["Government", "Private", "Other"],
      default: "Private",
    },
    hospitalVerificationStatus: {
      type: String,
      enum: ["verified", "pending", "needs_review"],
      default: "verified",
    },
    state: {
      type: String,
      default: "Tamil Nadu",
      trim: true,
    },
    district: {
      type: String,
      default: "Salem",
      trim: true,
    },
    city: {
      type: String,
      default: "Salem",
      trim: true,
    },
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    requiredDate: {
      type: Date,
    },

    // ── Supporting Document ───────────────────────────────────
    documentPath: {
      type: String,
      default: null,
    },
    documentOriginalName: {
      type: String,
      default: null,
    },
    documentMimeType: {
      type: String,
      default: null,
    },

    // ── Workflow Status ───────────────────────────────────────
    status: {
      type: String,
      enum: [
        "screening", // Anomaly check in progress
        "suspicious_review", // Flagged — awaiting admin decision
        "broadcasting", // Broadcasted simultaneously to all matching eligible donors
        "accepted", // A donor accepted
        "fulfilled", // Donation completed
        "rejected", // Rejected by admin or cancelled
      ],
      default: "screening",
    },

    // ── Fraud Detection ───────────────────────────────────────
    anomalyScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    fraudIndicators: {
      type: [String],
      default: [],
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },

    // ── Broadcast Tracking ────────────────────────────────────
    broadcastTime: {
      type: Date,
      default: null,
    },
    eligibleDonorIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    eligibleDonorsNotifiedCount: {
      type: Number,
      default: 0,
    },
    declinedDonorIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    releasedDonorIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    // ── Active Donor Acceptance ───────────────────────────────
    acceptedByDonorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acceptedByDonorName: {
      type: String,
      default: null,
    },
    acceptedByDonorPhone: {
      type: String,
      default: null,
      set: (value) => (value == null ? null : normalizeIndianPhone(value)),
    },
    acceptedByDonorPublicId: {
      type: String,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },

    // ── Acceptance & Release History ──────────────────────────
    acceptanceHistory: [
      {
        donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        donorName: String,
        donorPhone: String,
        donorPublicId: String,
        acceptedAt: Date,
        releasedAt: Date,
        releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        releasedByRole: String,
        releaseReason: String,
      },
    ],

    // ── Audit Trail ───────────────────────────────────────────
    auditTrail: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        performedByRole: String,
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // ── Admin Review ──────────────────────────────────────────
    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminReviewNote: {
      type: String,
      default: null,
    },
    adminReviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        return ret;
      },
    },
  },
);

EmergencyRequestSchema.index({ patientId: 1, createdAt: -1 });
EmergencyRequestSchema.index({ status: 1, bloodGroup: 1, city: 1 });
EmergencyRequestSchema.index({ status: 1, bloodGroup: 1, state: 1, district: 1, city: 1 });
EmergencyRequestSchema.index({ isFlagged: 1, status: 1 });

module.exports = mongoose.model("EmergencyRequest", EmergencyRequestSchema);
