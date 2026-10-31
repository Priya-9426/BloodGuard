/**
 * BloodGuard — Database Seed Script
 * Seeds the default admin account and verifies configuration.
 * Safe to call on every startup — checks before inserting.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const { normalizeIndianPhone, generatePublicId } = require("../utils/phone");

async function seedAdminIfEmpty() {
  // Check for admin by either legacy string role or new roles array
  const existing = await User.findOne({
    $or: [{ role: "admin" }, { roles: "admin" }],
  });
  if (!existing) {
    const adminPhone = normalizeIndianPhone(
      process.env.ADMIN_PHONE || "9361111750",
    );
    if (!adminPhone) {
      console.warn(
        "[Seed] Set ADMIN_PHONE to a valid 10-digit Indian mobile number before creating the default admin.",
      );
      return;
    }
    const adminId = await generatePublicId(adminPhone, "AD");
    const admin = new User({
      name: "BloodGuard Admin",
      email: process.env.ADMIN_EMAIL || "admin@bloodguard.health",
      phone: adminPhone,
      passwordHash: process.env.ADMIN_PASSWORD || "Admin@123456",
      roles: ["admin"],
      adminId,
      city: "Salem",
    });
    await admin.save();
    console.log(`✅ Default admin created: ${admin.email} (ID: ${adminId})`);
    console.log(
      "   ⚠️  Change the admin password immediately after first login!",
    );
  } else {
    // Backfill roles array and adminId for existing admin accounts
    const update = {};
    if (!Array.isArray(existing.roles) || !existing.roles.includes("admin")) {
      update.roles = ["admin"];
    }
    if (!existing.adminId || existing.adminId === "BGA001") {
      update.adminId = await generatePublicId(existing.phone, "AD");
    }
    const unset = {};
    if (existing.donorId) unset.donorId = 1;
    if (existing.patientId) unset.patientId = 1;

    const op = {};
    if (Object.keys(update).length > 0) op.$set = update;
    if (Object.keys(unset).length > 0) op.$unset = unset;

    if (Object.keys(op).length > 0) {
      await User.updateOne({ _id: existing._id }, op);
      console.log("✅ Admin account backfilled:", JSON.stringify(op));
    }
  }
}

// ── Standalone run ───────────────────────────────────────────
async function main() {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";
  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected:", mongoose.connection.host);
  await seedAdminIfEmpty();
  await mongoose.disconnect();
  console.log("✅ Seed complete.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedAdminIfEmpty };
