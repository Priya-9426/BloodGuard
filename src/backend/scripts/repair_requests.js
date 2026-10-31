require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const DonorReceivedRequest = require("../models/DonorReceivedRequest");

async function repairRequests() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";
  await mongoose.connect(mongoUri);

  console.log("Updating emergency requests with sequential numbers...");
  const patients = await User.find({ roles: "patient" });
  for (const patient of patients) {
    const patientRequests = await EmergencyRequest.find({ patientId: patient._id }).sort({ createdAt: 1 });
    let count = 0;
    for (const r of patientRequests) {
      count++;
      r.patientPublicId = patient.patientId;
      if (!r.requestNumber || r.requestNumber.startsWith("undefined") || r.requestNumber.startsWith("null")) {
        r.requestNumber = `${patient.patientId}-REQ-${String(count).padStart(3, "0")}`;
      }
      if (r.acceptedByDonorId) {
        const donor = await User.findById(r.acceptedByDonorId);
        if (donor && donor.donorId) {
          r.acceptedByDonorPublicId = donor.donorId;
        }
      }
      await r.save();
      console.log(`Request ${r._id} -> ${r.requestNumber}`);
    }
    await User.updateOne({ _id: patient._id }, { $set: { requestCount: count } });
  }

  // Backfill DonorReceivedRequest records for existing donor broadcasts and acceptances
  console.log("Backfilling DonorReceivedRequest records...");
  const donors = await User.find({ roles: "donor" });
  for (const donor of donors) {
    const donorPublicId = donor.donorId;
    if (!donorPublicId) continue;
    
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

  console.log("✅ Requests and DonorReceivedRequests successfully backfilled!");
  await mongoose.disconnect();
}

repairRequests().catch(err => {
  console.error(err);
  process.exit(1);
});
