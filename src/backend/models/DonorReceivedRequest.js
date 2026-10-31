const mongoose = require("mongoose");

const DonorReceivedRequestSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    donorPublicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmergencyRequest",
      required: true,
      index: true,
    },
    patientRequestNumber: {
      type: String,
      trim: true,
      index: true,
    },
    patientPublicId: {
      type: String,
      trim: true,
    },
    // Meaningful received request reference format: DN67890-RCV-001
    donorReference: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    // Status relative to this donor
    status: {
      type: String,
      enum: ["received", "accepted", "declined", "released", "fulfilled"],
      default: "received",
      index: true,
    },
    // Optional acceptance reference format: DN67890-ACC-001
    acceptanceReference: {
      type: String,
      trim: true,
      sparse: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releaseReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate received references for the same donor + request combination
DonorReceivedRequestSchema.index({ donorId: 1, requestId: 1 }, { unique: true });
DonorReceivedRequestSchema.index({ donorId: 1, sequence: 1 }, { unique: true });
DonorReceivedRequestSchema.index({ donorReference: 1 });

module.exports = mongoose.model(
  "DonorReceivedRequest",
  DonorReceivedRequestSchema,
);
