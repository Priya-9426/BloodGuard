const DonorReceivedRequest = require("../models/DonorReceivedRequest");
const User = require("../models/User");

async function recordDonorReceivedRequest(donor, request) {
  try {
    const existing = await DonorReceivedRequest.findOne({
      donorId: donor._id,
      requestId: request._id,
    });
    if (existing) return existing;

    const donorUser = await User.findByIdAndUpdate(
      donor._id,
      { $inc: { receivedRequestCount: 1 } },
      { new: true }
    );
    const seq = donorUser.receivedRequestCount || 1;
    const donorPublicId = donor.donorId || `DN${String(donor.phone).slice(-5)}`;
    const donorRef = `${donorPublicId}-RCV-${String(seq).padStart(3, "0")}`;

    return await DonorReceivedRequest.create({
      donorId: donor._id,
      donorPublicId,
      requestId: request._id,
      patientRequestNumber: request.requestNumber || `${request.patientPublicId || "REQ"}-001`,
      patientPublicId: request.patientPublicId,
      donorReference: donorRef,
      sequence: seq,
      status: "received",
      receivedAt: new Date(),
    });
  } catch (err) {
    console.error("[Record Received Request Error]", err.message);
    return null;
  }
}

async function recordDonorAcceptance(donorId, requestId) {
  try {
    const donor = await User.findByIdAndUpdate(
      donorId,
      { $inc: { acceptanceCount: 1 } },
      { new: true }
    );
    const donorPublicId = donor.donorId || `DN${String(donor.phone).slice(-5)}`;
    const accSeq = donor.acceptanceCount || 1;
    const acceptanceRef = `${donorPublicId}-ACC-${String(accSeq).padStart(3, "0")}`;

    await DonorReceivedRequest.findOneAndUpdate(
      { donorId, requestId },
      {
        $set: {
          status: "accepted",
          acceptanceReference: acceptanceRef,
          acceptedAt: new Date(),
        },
      },
      { upsert: false }
    );
    return acceptanceRef;
  } catch (err) {
    console.error("[Record Acceptance Error]", err.message);
    return null;
  }
}

async function recordDonorRelease(donorId, requestId, reason) {
  try {
    await DonorReceivedRequest.findOneAndUpdate(
      { donorId, requestId },
      {
        $set: {
          status: "released",
          releasedAt: new Date(),
          releaseReason: reason,
        },
      }
    );
  } catch (err) {
    console.error("[Record Release Error]", err.message);
  }
}

async function recordDonorDecline(donorId, requestId) {
  try {
    await DonorReceivedRequest.findOneAndUpdate(
      { donorId, requestId },
      {
        $set: {
          status: "declined",
        },
      }
    );
  } catch (err) {
    console.error("[Record Decline Error]", err.message);
  }
}

async function recordDonorFulfilled(donorId, requestId) {
  try {
    await DonorReceivedRequest.findOneAndUpdate(
      { donorId, requestId },
      {
        $set: {
          status: "fulfilled",
        },
      }
    );
  } catch (err) {
    console.error("[Record Fulfilled Error]", err.message);
  }
}

module.exports = {
  recordDonorReceivedRequest,
  recordDonorAcceptance,
  recordDonorRelease,
  recordDonorDecline,
  recordDonorFulfilled,
};
