const mongoose = require('mongoose');

/**
 * DonorToken — Secure one-time-use tokens for SMS accept/reject links.
 * Each eligible donor gets a unique token per request.
 * Donor can respond WITHOUT logging in.
 * Token is consumed atomically on first use.
 */
const DonorTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Whether this specific token is for accepting or rejecting
    action: {
      type: String,
      enum: ['accept', 'reject'],
      required: true,
    },
    // Has this token been used already?
    used: {
      type: Boolean,
      default: false,
    },
    // Token auto-expires after 24 hours
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

// ── TTL index — MongoDB auto-deletes expired tokens ──────────
DonorTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
DonorTokenSchema.index({ requestId: 1, donorId: 1, action: 1 });

module.exports = mongoose.model('DonorToken', DonorTokenSchema);
