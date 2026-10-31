// Migration Script: Safely Backfill State, District, and Seed 41 Cities' Hospitals
// Can be executed standalone: node src/backend/scripts/migrateLocations.js

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");
const { ensureAllHospitals } = require("../routes/hospitals");

async function runMigration() {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);

  console.log("[Migration] 1. Updating users missing state or district...");
  const userResult = await User.updateMany(
    { $or: [{ state: { $exists: false } }, { district: { $exists: false } }] },
    { $set: { state: "Tamil Nadu", district: "Salem" } },
  );
  console.log(`[Migration] Updated ${userResult.modifiedCount} users.`);

  console.log("[Migration] 2. Updating emergency requests missing location snapshot...");
  const reqResult = await EmergencyRequest.updateMany(
    { $or: [{ state: { $exists: false } }, { district: { $exists: false } }] },
    { $set: { state: "Tamil Nadu", district: "Salem" } },
  );
  const reqVerResult = await EmergencyRequest.updateMany(
    { hospitalVerificationStatus: { $exists: false } },
    { $set: { hospitalType: "Private", hospitalVerificationStatus: "verified" } },
  );
  console.log(
    `[Migration] Updated ${reqResult.modifiedCount} requests location, ${reqVerResult.modifiedCount} requests verification status.`,
  );

  console.log("[Migration] 3. Running idempotent hospital seeder for 41 cities...");
  await ensureAllHospitals();

  const totalHospitals = await Hospital.countDocuments();
  const verifiedCount = await Hospital.countDocuments({ verificationStatus: "verified" });
  const pendingCount = await Hospital.countDocuments({ verificationStatus: "pending" });
  const needsReviewCount = await Hospital.countDocuments({ verificationStatus: "needs_review" });

  console.log("\n==========================================");
  console.log("MIGRATION COMPLETED SUCCESSFULLY");
  console.log(`Total Hospitals: ${totalHospitals}`);
  console.log(`Verified Hospitals: ${verifiedCount}`);
  console.log(`Pending Hospitals: ${pendingCount}`);
  console.log(`Needs Review Hospitals: ${needsReviewCount}`);
  console.log("==========================================\n");

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
