/**
 * BloodGuard — UCI Blood Transfusion Dataset Importer
 *
 * Imports the 748-record UCI dataset into the MongoDB donor_history_uci collection.
 * Run after downloading: python backend/ml/download_dataset.py
 *
 * Usage: node backend/scripts/import_uci_dataset.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DonorHistory = require('../models/DonorHistory');

const UCI_CSV_PATH = path.join(__dirname, '../ml/uci_blood_transfusion.csv');

async function importUciDataset() {
  console.log('='.repeat(60));
  console.log('BloodGuard — UCI Blood Transfusion Dataset Importer');
  console.log('='.repeat(60));

  // Check file exists
  if (!fs.existsSync(UCI_CSV_PATH)) {
    console.error(`\n❌ Dataset CSV not found: ${UCI_CSV_PATH}`);
    console.error('\nRun first: cd backend/ml && python download_dataset.py');
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bloodguard';
  await mongoose.connect(mongoUri);
  console.log(`\n✅ MongoDB connected: ${mongoose.connection.host}`);

  // Check for existing records
  const existingCount = await DonorHistory.countDocuments();
  if (existingCount > 0) {
    console.log(`\n⚠️  Found ${existingCount} existing UCI records in MongoDB.`);
    console.log('   Skipping import to avoid duplicates.');
    console.log('   To re-import, run: db.donor_history_uci.drop() in MongoDB shell first.');
    await mongoose.disconnect();
    return;
  }

  // Parse CSV
  const rl = readline.createInterface({
    input: fs.createReadStream(UCI_CSV_PATH),
    crlfDelay: Infinity,
  });

  const records = [];
  let lineIndex = 0;
  let headerSkipped = false;

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Skip header row
    if (!headerSkipped) {
      headerSkipped = true;
      console.log(`\nCSV Header: ${line}`);
      continue;
    }

    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 5) continue;

    const recency = parseInt(parts[0]);
    const frequency = parseInt(parts[1]);
    const monetary = parseInt(parts[2]);
    const time = parseInt(parts[3]);
    const donated = parseInt(parts[4]);

    if (isNaN(recency) || isNaN(frequency) || isNaN(monetary) || isNaN(time) || isNaN(donated)) {
      console.warn(`  ⚠️  Skipping malformed row ${lineIndex + 1}: ${line}`);
      continue;
    }

    // Derive analysis fields from UCI data
    let donationCategory = 'occasional';
    if (frequency >= 10) donationCategory = 'frequent';
    else if (frequency >= 5) donationCategory = 'regular';
    else if (frequency === 1) donationCategory = 'lapsed';

    const isActiveRecent = recency <= 6;
    const avgInterval = frequency > 1 ? Math.round(time / (frequency - 1)) : null;

    records.push({
      datasetSource: 'UCI Blood Transfusion Service Center',
      datasetUrl: 'https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center',
      sourceRowIndex: lineIndex,
      recency_months: recency,
      frequency_donations: frequency,
      monetary_cc: monetary,
      time_months: time,
      whether_donated: donated,
      donationCategory,
      isActiveRecent,
      averageDonationIntervalMonths: avgInterval,
    });

    lineIndex++;
  }

  console.log(`\nParsed ${records.length} valid records from CSV.`);

  // Batch insert
  if (records.length > 0) {
    await DonorHistory.insertMany(records, { ordered: false });
    console.log(`✅ Imported ${records.length} UCI records into MongoDB (collection: donor_history_uci)`);
  }

  // Summary statistics
  const stats = await DonorHistory.aggregate([
    {
      $group: {
        _id: null,
        avgRecency: { $avg: '$recency_months' },
        avgFrequency: { $avg: '$frequency_donations' },
        avgMonetary: { $avg: '$monetary_cc' },
        donationRate: { $avg: '$whether_donated' },
        total: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const s = stats[0];
    console.log('\n── UCI Dataset Summary ─────────────────────────────');
    console.log(`  Total Records:      ${s.total}`);
    console.log(`  Avg Recency:        ${s.avgRecency.toFixed(1)} months`);
    console.log(`  Avg Frequency:      ${s.avgFrequency.toFixed(1)} donations`);
    console.log(`  Avg Monetary:       ${s.avgMonetary.toFixed(0)} cc`);
    console.log(`  Donation Rate:      ${(s.donationRate * 100).toFixed(1)}%`);
    console.log('────────────────────────────────────────────────────');
  }

  console.log('\n⚠️  DATA PROVENANCE REMINDER:');
  console.log('  This dataset does NOT contain blood groups, phone numbers,');
  console.log('  donor names, availability status, or fraud labels.');
  console.log('  BloodGuard app fields are stored separately in the users collection.');

  await mongoose.disconnect();
  console.log('\n✅ Import complete.');
}

if (require.main === module) {
  importUciDataset().catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
  });
}

module.exports = { importUciDataset };
