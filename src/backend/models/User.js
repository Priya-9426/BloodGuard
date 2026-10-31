const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { normalizeIndianPhone } = require("../utils/phone");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      set: normalizeIndianPhone,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: ["patient", "donor", "admin"],
      required: true,
      default: ["donor"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one role is required",
      },
    },
    patientId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    donorId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    adminId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
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
    requestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedRequestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    acceptanceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: function () {
        return this.roles && this.roles.includes("donor");
      },
    },
    dateOfBirth: {
      type: Date,
    },
    lastDonationDate: {
      type: Date,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    totalDonations: {
      type: Number,
      default: 0,
      min: 0,
    },
    hospitalAffiliation: {
      type: String,
      trim: true,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    resetToken: String,
    resetTokenExpiry: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.resetToken;
        delete ret.resetTokenExpiry;
        ret.id = ret._id;
        ret.role = (ret.roles && ret.roles[0]) || (ret.adminId ? "admin" : (ret.patientId ? "patient" : "donor"));
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        ret.role = (ret.roles && ret.roles[0]) || (ret.adminId ? "admin" : (ret.patientId ? "patient" : "donor"));
        return ret;
      },
    },
  },
);

// Virtual for single 'role' for backward compatibility
UserSchema.virtual("role").get(function () {
  return (this.roles && this.roles[0]) || (this.adminId ? "admin" : (this.patientId ? "patient" : "donor"));
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

UserSchema.methods.isEligibleToDonate = function () {
  if (!this.isAvailable) return false;
  if (!this.lastDonationDate) return true;

  const daysSince = Math.floor(
    (Date.now() - new Date(this.lastDonationDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return daysSince >= 56;
};

UserSchema.index({ roles: 1, bloodGroup: 1, isAvailable: 1 });
UserSchema.index({ city: 1, roles: 1 });
UserSchema.index({ state: 1, district: 1, city: 1, roles: 1 });

module.exports = mongoose.model("User", UserSchema);
