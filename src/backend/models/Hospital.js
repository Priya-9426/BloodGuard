const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    city: {
      type: String,
      required: true,
      default: "Salem",
      trim: true,
    },
    district: {
      type: String,
      default: "Salem",
      trim: true,
    },
    state: {
      type: String,
      required: true,
      default: "Tamil Nadu",
      trim: true,
    },
    type: {
      type: String,
      enum: ["Government", "Private", "Other"],
      default: "Private",
    },
    address: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["verified", "pending", "needs_review"],
      default: "verified",
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Keep isVerified in sync with verificationStatus
HospitalSchema.pre("save", function (next) {
  if (this.verificationStatus === "verified") {
    this.isVerified = true;
  } else {
    this.isVerified = false;
  }
  next();
});

HospitalSchema.index({ city: 1, isActive: 1 });
HospitalSchema.index({ state: 1, district: 1, city: 1, isActive: 1, verificationStatus: 1 });
HospitalSchema.index({ name: 1, city: 1, state: 1 });

module.exports = mongoose.model("Hospital", HospitalSchema);
