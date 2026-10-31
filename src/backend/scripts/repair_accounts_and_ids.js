require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const DonorReceivedRequest = require("../models/DonorReceivedRequest");
const { generatePublicId, normalizeIndianPhone } = require("../utils/phone");

async function repair() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB:", mongoUri);

  const users = await mongoose.connection.collection("users").find({}).toArray();
  console.log(`Processing ${users.length} users...`);

  // Helper collision functions
  const isPatientIdTaken = async (id, excludeId) => {
    const ex = await mongoose.connection.collection("users").findOne({
      patientId: id,
      _id: { $ne: excludeId }
    });
    return Boolean(ex);
  };

  const isDonorIdTaken = async (id, excludeId) => {
    const ex = await mongoose.connection.collection("users").findOne({
      donorId: id,
      _id: { $ne: excludeId }
    });
    return Boolean(ex);
  };

  const isAdminIdTaken = async (id, excludeId) => {
    const ex = await mongoose.connection.collection("users").findOne({
      adminId: id,
      _id: { $ne: excludeId }
    });
    return Boolean(ex);
  };

  for (const u of users) {
    const phone = u.phone || "0000000000";
    const update = { $set: {}, $unset: {} };

    // 1. Admin account
    if (u.role === "admin" || (Array.isArray(u.roles) && u.roles.includes("admin")) || u.email === "admin@bloodguard.health") {
      update.$set.roles = ["admin"];
      const adminId = await generatePublicId(phone, "AD", (id) => isAdminIdTaken(id, u._id));
      update.$set.adminId = adminId;
      update.$unset.donorId = 1;
      update.$unset.patientId = 1;
      console.log(`[Admin] ${u.email} -> adminId: ${adminId}`);
    }
    // 2. Both-role accounts
    else if (Array.isArray(u.roles) && u.roles.includes("patient") && u.roles.includes("donor")) {
      update.$set.roles = ["patient", "donor"];
      if (!u.patientId) {
        update.$set.patientId = await generatePublicId(phone, "PD", (id) => isPatientIdTaken(id, u._id));
      }
      if (!u.donorId) {
        update.$set.donorId = await generatePublicId(phone, "DN", (id) => isDonorIdTaken(id, u._id));
      }
      update.$unset.adminId = 1;
      console.log(`[Both] ${u.email} -> patientId: ${u.patientId || update.$set.patientId}, donorId: ${u.donorId || update.$set.donorId}`);
    }
    // 3. Patient accounts (including Priya G: rachelpriya9@gmail.com and legacy patients)
    else if (u.email === "rachelpriya9@gmail.com" || u.role === "patient") {
      update.$set.roles = ["patient"];
      const patientId = await generatePublicId(phone, "PD", (id) => isPatientIdTaken(id, u._id));
      update.$set.patientId = patientId;
      update.$unset.donorId = 1;
      update.$unset.adminId = 1;
      console.log(`[Patient] ${u.email} -> patientId: ${patientId}`);
    }
    // 4. Donor accounts
    else {
      update.$set.roles = ["donor"];
      const donorId = await generatePublicId(phone, "DN", (id) => isDonorIdTaken(id, u._id));
      update.$set.donorId = donorId;
      update.$unset.patientId = 1;
      update.$unset.adminId = 1;
      console.log(`[Donor] ${u.email} -> donorId: ${donorId}`);
    }

    if (Object.keys(update.$unset).length === 0) delete update.$unset;
    await mongoose.connection.collection("users").updateOne({ _id: u._id }, update);
  }

  // Update EmergencyRequests with patientPublicId and requestNumber
  console.log("Updating emergency requests...");
  const requests = await EmergencyRequest.find({}).populate("patientId").populate("acceptedByDonorId");
  for (const r of requests) {
    let changed = false;
    if (r.patientId && typeof r.patientId === "object") {
      if (!r.patientPublicId && r.patientId.patientId) {
        r.patientPublicId = r.patientId.patientId;
        changed = true;
      }
      if (!r.requestNumber && r.patientId.patientId) {
        r.requestNumber = `${r.patientId.patientId}-REQ-001`;
        changed = true;
      }
    }
    if (r.acceptedByDonorId && typeof r.acceptedByDonorId === "object" && r.acceptedByDonorId.donorId) {
      if (!r.acceptedByDonorPublicId) {
        r.acceptedByDonorPublicId = r.acceptedByDonorId.donorId;
        changed = true;
      }
    }
    if (changed) {
      await r.save();
    }
  }

  // Backfill DonorReceivedRequest records for existing donor broadcasts and acceptances
  console.log("Backfilling DonorReceivedRequest records...");
  const donors = await User.find({ roles: "donor" });
  for (const donor of donors) {
    const donorPublicId = donor.donorId || await generatePublicId(donor.phone, "DN", (id) => isDonorIdTaken(id, donor._id));
    
    // Find all requests where donor was eligible, accepted, or in history
    const matchingReqs = await EmergencyRequest.find({
      $or: [
        { eligibleDonorIds: donor._id },
        { acceptedByDonorId: donor._id },
        { "acceptanceHistory.donorId": donor._id }
      ]
    }).sort({ createdAt: 1 });

    for (const req of matchingReqs) {
      const existingRecord = await DonorReceivedRequest.findOne({
        donorId: donor._id,
        requestId: req._id
      });

      if (!existingRecord) {
        const userUpdate = await User.findByIdAndUpdate(
          donor._id,
          { $inc: { receivedRequestCount: 1 } },
          { new: true }
        );
        const seq = userUpdate.receivedRequestCount || 1;
        const donorRef = `${donorPublicId}-RCV-${String(seq).padStart(3, "0")}`;

        const isWinner = req.acceptedByDonorId && req.acceptedByDonorId.toString() === donor._id.toString();
        const isDeclined = req.declinedDonorIds && req.declinedDonorIds.some(id => id.toString() === donor._id.toString());
        const isReleased = req.releasedDonorIds && req.releasedDonorIds.some(id => id.toString() === donor._id.toString());

        let status = "received";
        let acceptanceRef = undefined;
        let acceptedAt = null;
        let releasedAt = null;
        let releaseReason = null;

        if (isWinner) {
          status = req.status === "fulfilled" ? "fulfilled" : "accepted";
          acceptedAt = req.acceptedAt || req.updatedAt || new Date();
          const accUpdate = await User.findByIdAndUpdate(
            donor._id,
            { $inc: { acceptanceCount: 1 } },
            { new: true }
          );
          acceptanceRef = `${donorPublicId}-ACC-${String(accUpdate.acceptanceCount || 1).padStart(3, "0")}`;
        } else if (isReleased) {
          status = "released";
          releasedAt = req.updatedAt || new Date();
          releaseReason = "Unable to donate at scheduled hospital.";
        } else if (isDeclined) {
          status = "declined";
        }

        await DonorReceivedRequest.create({
          donorId: donor._id,
          donorPublicId,
          requestId: req._id,
          patientRequestNumber: req.requestNumber || `${req.patientPublicId || "REQ"}-001`,
          patientPublicId: req.patientPublicId,
          donorReference: donorRef,
          sequence: seq,
          status,
          acceptanceReference: acceptanceRef,
          receivedAt: req.createdAt || new Date(),
          acceptedAt,
          releasedAt,
          releaseReason
        });
        console.log(`Created received record ${donorRef} for donor ${donorPublicId}`);
      }
    }
  }

  console.log("✅ Repair and backfill complete!");
  await mongoose.disconnect();
}

repair().catch(err => {
  console.error("Repair error:", err);
  process.exit(1);
});
