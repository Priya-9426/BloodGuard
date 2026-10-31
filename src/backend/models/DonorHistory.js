const mongoose = require('mongoose');

/**
 * DonorHistory — Stores records imported from the UCI Blood Transfusion Dataset.
 *
 * DATA PROVENANCE:
 *   Dataset: Blood Transfusion Service Center
 *   Source:  UCI Machine Learning Repository
 *   URL:     https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center
 *   Records: 748 real donor records
 *   License: CC BY 4.0
 *
 * WHAT THIS DATASET CONTAINS:
 *   - Recency:    Months since last donation
 *   - Frequency:  Total number of donations
 *   - Monetary:   Total blood donated in c.c.
 *   - Time:       Months since first donation
 *   - Donated:    Whether donated in March 2007 (0 or 1) — target variable
 *
 * WHAT THIS DATASET DOES NOT CONTAIN (and we do NOT fabricate):
 *   - Donor names, phone numbers, email, or passwords
 *   - Blood groups (ABO/Rh typing)
 *   - Donor availability status
 *   - Hospital, patient, or emergency request information
 *   - Fraud labels of any kind
 *
 * These records are kept STRICTLY SEPARATE from BloodGuard application
 * registration data stored in the User collection.
 * They are used only for:
 *   (a) Donation behavior analysis (frequency, recency, volume trends)
 *   (b) Calibrating Isolation Forest training distributions
 *   (c) Academic reference in project documentation
 */
const DonorHistorySchema = new mongoose.Schema(
  {
    // ── Source metadata ─────────────────────────────────────
    datasetSource: {
      type: String,
      default: 'UCI Blood Transfusion Service Center',
      immutable: true,
    },
    datasetUrl: {
      type: String,
      default: 'https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center',
      immutable: true,
    },
    // Row index in the original CSV (for traceability)
    sourceRowIndex: {
      type: Number,
      required: true,
    },

    // ── Original UCI dataset fields (exact column names preserved) ─
    // Recency — months since last donation (RFMTC feature)
    recency_months: {
      type: Number,
      required: true,
      min: 0,
    },
    // Frequency — total number of donations
    frequency_donations: {
      type: Number,
      required: true,
      min: 0,
    },
    // Monetary — total blood donated in cubic centimeters
    monetary_cc: {
      type: Number,
      required: true,
      min: 0,
    },
    // Time — months since first donation
    time_months: {
      type: Number,
      required: true,
      min: 0,
    },
    // whether_donated — target variable: 1 = donated in March 2007, 0 = did not
    // NOTE: This is a donation outcome field, NOT a fraud label.
    whether_donated: {
      type: Number,
      enum: [0, 1],
      required: true,
    },

    // ── BloodGuard-derived analysis fields ────────────────────
    // Computed from UCI data for donation-behavior analysis
    // These are DERIVED — not original UCI fields
    donationCategory: {
      type: String,
      enum: ['frequent', 'regular', 'occasional', 'lapsed'],
      // frequent:   frequency_donations >= 10
      // regular:    frequency_donations 5-9
      // occasional: frequency_donations 2-4
      // lapsed:     frequency_donations == 1
    },
    isActiveRecent: {
      type: Boolean,
      // true if recency_months <= 6
    },
    averageDonationIntervalMonths: {
      type: Number,
      // time_months / frequency_donations (if frequency > 1)
    },
  },
  {
    timestamps: true,
    collection: 'donor_history_uci', // Separate collection, not mixed with users
  }
);

// ── Indexes ──────────────────────────────────────────────────
DonorHistorySchema.index({ sourceRowIndex: 1 }, { unique: true });
DonorHistorySchema.index({ frequency_donations: 1 });
DonorHistorySchema.index({ recency_months: 1 });
DonorHistorySchema.index({ donationCategory: 1 });

module.exports = mongoose.model('DonorHistory', DonorHistorySchema);
