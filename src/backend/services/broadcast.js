const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const DonorToken = require("../models/DonorToken");
const { sendBroadcastNotification } = require("./firebase");
const {
  sendSMS,
  buildDonorSMS,
  buildOtherDonorsAcceptedSMS,
  buildRequestReopenedSMS,
  buildPatientAcceptanceSMS,
  buildPatientReleasedSMS,
  buildAdminNoticeSMS,
} = require("./sms");
const { normalizeIndianPhone } = require("../utils/phone");
const { recordDonorReceivedRequest } = require("../utils/receivedRequests");
const { getCompatibleDonorGroups } = require("../utils/compatibility");

async function notifyAdminOfEvent({
  request,
  donor = null,
  eventType = "request_created",
  reason = null,
  message,
}) {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) {
    console.warn(
      "[Admin SMS] ADMIN_PHONE is not configured; skipping admin notification.",
    );
    return { success: false, error: "ADMIN_PHONE not configured" };
  }

  const normalizedAdminPhone = normalizeIndianPhone(adminPhone);
  if (!normalizedAdminPhone) {
    console.warn(
      "[Admin SMS] ADMIN_PHONE must be a valid 10-digit Indian mobile number.",
    );
    return {
      success: false,
      error: "ADMIN_PHONE must be a valid 10-digit Indian mobile number",
    };
  }

  const context = {
    requestId: request?._id || request?.id || null,
    donorId: donor?._id || donor?.id || null,
    recipientType: "admin",
    messageType: "admin_notice",
  };

  const adminMessage =
    message || buildAdminNoticeSMS({ request, donor, eventType, reason });

  return sendSMS(normalizedAdminPhone, adminMessage, context);
}

/**
 * Core broadcast engine.
 * Finds ALL eligible donors matching the blood group.
 * Eligibility constraints:
 *   1. roles includes 'donor'
 *   2. bloodGroup === request.bloodGroup (exact ABO/Rh match)
 *   3. isAvailable === true
 *   4. (Today - lastDonationDate) >= 56 days (56-day refractory rule)
 *   5. Not in releasedDonorIds or declinedDonorIds
 *
 * All matching donors receive Fast2SMS with direct ACCEPT and REJECT HTTPS action links.
 */
async function broadcastEmergencyRequest(requestId) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);

  const baseUrl = process.env.BACKEND_BASE_URL || "http://localhost:4000";

  // Step 1: Find all donors matching compatible blood groups (ABO/Rh compatibility)
  const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
  const allMatchingDonors = await User.find({
    roles: "donor",
    bloodGroup: { $in: compatibleGroups },
  }).lean();

  const releasedSet = new Set(
    (request.releasedDonorIds || []).map((id) => id.toString()),
  );
  const declinedSet = new Set(
    (request.declinedDonorIds || []).map((id) => id.toString()),
  );

  // Step 2: Filter by availability + 56-day refractory rule + exclusion sets
  const today = new Date();
  const eligibleDonors = allMatchingDonors.filter((donor) => {
    const dIdStr = donor._id.toString();
    if (releasedSet.has(dIdStr)) return false;
    if (declinedSet.has(dIdStr)) return false;
    if (donor.isAvailable === false) return false;
    if (donor.lastDonationDate) {
      const daysSince = Math.floor(
        (today - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24),
      );
      if (daysSince < 56) return false;
    }
    return true;
  });

  console.log(
    `[Broadcast] ${allMatchingDonors.length} matching compatible (${compatibleGroups.join(", ")}) donors -> ` +
      `${eligibleDonors.length} eligible after 56-day rule and exclusions.`,
  );

  // Step 3: Generate unique secure tokens & send SMS with direct action links sequentially
  const smsResults = [];
  for (const donor of eligibleDonors) {
    const normalizedDonorPhone = normalizeIndianPhone(donor.phone);
    if (!normalizedDonorPhone) {
      smsResults.push({ success: false, error: "Donor phone number is invalid or missing" });
      continue;
    }

    // Record meaningful donor received request reference (DN...-RCV-...)
    await recordDonorReceivedRequest(donor, request);

    // Reuse existing tokens if present, or create new unique tokens
    let acceptTokenDoc = await DonorToken.findOne({
      requestId: request._id,
      donorId: donor._id,
      action: "accept",
    });
    let rejectTokenDoc = await DonorToken.findOne({
      requestId: request._id,
      donorId: donor._id,
      action: "reject",
    });

    let acceptToken = acceptTokenDoc?.token;
    let rejectToken = rejectTokenDoc?.token;

    if (!acceptToken || !rejectToken) {
      acceptToken = acceptToken || uuidv4();
      rejectToken = rejectToken || uuidv4();
      await DonorToken.insertMany([
        {
          token: acceptToken,
          requestId: request._id,
          donorId: donor._id,
          action: "accept",
        },
        {
          token: rejectToken,
          requestId: request._id,
          donorId: donor._id,
          action: "reject",
        },
      ]);
    }

    const acceptUrl = `${baseUrl}/api/donors/token-accept/${acceptToken}`;
    const rejectUrl = `${baseUrl}/api/donors/token-reject/${rejectToken}`;

    const smsBody = buildDonorSMS({
      request,
      requestNumber: request.requestNumber,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      hospitalName: request.hospitalName,
      city: request.city || "Salem",
      acceptUrl,
      rejectUrl,
    });

    // Send with deduplication and 250ms spacing to prevent Fast2SMS concurrency locks
    const res = await sendSMS(donor.phone, smsBody, {
      requestId: request._id,
      donorId: donor._id,
      recipientType: "donor",
      messageType: "donor_broadcast",
    });

    smsResults.push(res);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const smsSent = smsResults.filter((result) => result.success === true).length;
  const smsFailed = eligibleDonors.length - smsSent;

  // Step 4: Optional FCM push
  const fcmTokens = eligibleDonors.map((d) => d.fcmToken).filter(Boolean);
  let fcmResult = { successCount: 0 };
  if (fcmTokens.length > 0) {
    try {
      fcmResult = await sendBroadcastNotification({
        donorTokens: fcmTokens,
        request,
      });
    } catch (_) {}
  }

  // Step 5: Update request status
  await EmergencyRequest.findByIdAndUpdate(requestId, {
    status: "broadcasting",
    broadcastTime: today,
    eligibleDonorIds: eligibleDonors.map((d) => d._id),
    eligibleDonorsNotifiedCount: eligibleDonors.length,
  });

  return {
    eligibleDonorsCount: eligibleDonors.length,
    fcmDelivered: fcmResult.successCount,
    smsSent,
    smsFailed,
  };
}

/**
 * Notify other eligible donors that request was already accepted (Section 9).
 * Sends sequentially with deduplication to ensure reliable delivery.
 */
async function notifyOtherDonorsAccepted({ request, winningDonorId }) {
  const otherDonorIds = (request.eligibleDonorIds || []).filter(
    (id) => id.toString() !== winningDonorId.toString(),
  );

  if (otherDonorIds.length === 0) return { notifiedCount: 0 };

  const otherDonors = await User.find({ _id: { $in: otherDonorIds } })
    .select("phone name")
    .lean();

  const message = buildOtherDonorsAcceptedSMS({
    requestNumber: request.requestNumber || request._id,
  });

  const results = [];
  for (const d of otherDonors) {
    if (!d.phone) continue;
    const res = await sendSMS(d.phone, message, {
      requestId: request._id,
      donorId: d._id,
      recipientType: "donor",
      messageType: "other_donor_notice",
    });
    results.push(res);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return { notifiedCount: results.filter((r) => r.success).length, total: otherDonors.length };
}

/**
 * Notify patient and admin when their donor has been confirmed (Section 11).
 */
async function notifyPatientOfAcceptance({ request, donor }) {
  let patientPhone =
    normalizeIndianPhone(request.contactPhone) || request.contactPhone;

  if (!patientPhone && request.patientId) {
    try {
      const patientUser = await User.findById(request.patientId).lean();
      if (patientUser) {
        patientPhone =
          normalizeIndianPhone(patientUser.phone) || patientUser.phone;
      }
    } catch (_) {}
  }

  const patientMsg = buildPatientAcceptanceSMS({ request, donor });

  let patientNotification = {
    success: false,
    error: "Patient phone is missing",
  };
  if (patientPhone) {
    try {
      patientNotification = await sendSMS(patientPhone, patientMsg, {
        requestId: request._id,
        patientId: request.patientId,
        recipientType: "patient",
        messageType: "acceptance_patient",
      });
    } catch (error) {
      console.warn("[Fast2SMS Patient Notify Error]", error.message);
      patientNotification = { success: false, error: error.message };
    }
  }

  const adminNotification = await notifyAdminOfEvent({
    request,
    donor,
    eventType: "request_accepted",
  });

  return {
    patient: { phone: patientPhone || null, ...patientNotification },
    admin: adminNotification,
  };
}

/**
 * Notify when a request is released and reopened (Section 10).
 */
async function notifyReleaseAndReopened({ request, reason }) {
  // Re-broadcast to matching donors
  const broadcastResult = await broadcastEmergencyRequest(request._id);

  // Notify Patient
  let patientPhone =
    normalizeIndianPhone(request.contactPhone) || request.contactPhone;
  if (!patientPhone && request.patientId) {
    try {
      const p = await User.findById(request.patientId).lean();
      if (p) patientPhone = normalizeIndianPhone(p.phone) || p.phone;
    } catch (_) {}
  }

  if (patientPhone) {
    const patientMsg = buildPatientReleasedSMS({
      requestNumber: request.requestNumber || request._id,
    });
    await sendSMS(patientPhone, patientMsg, {
      requestId: request._id,
      patientId: request.patientId,
      recipientType: "patient",
      messageType: "patient_reopen",
    });
  }

  // Notify Admin
  await notifyAdminOfEvent({
    request,
    eventType: "request_released",
    reason,
  });

  return broadcastResult;
}

/**
 * Safe, idempotent retry or backfill mechanism for missing or failed notifications (Requirement 2).
 * Checks existing logs and provider responses before retrying to prevent duplicate messages.
 */
async function backfillMissingNotifications({ requestId = null, forceRetry = false } = {}) {
  const filter = {};
  if (requestId) {
    filter._id = requestId;
  } else {
    // Audit recent requests (last 14 days)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    filter.createdAt = { $gte: twoWeeksAgo };
  }

  const requests = await EmergencyRequest.find(filter).sort({ createdAt: -1 });
  const report = [];
  const baseUrl = process.env.BACKEND_BASE_URL || "http://localhost:4000";

  for (const request of requests) {
    const reqReport = {
      requestId: request._id,
      requestNumber: request.requestNumber,
      status: request.status,
      bloodGroup: request.bloodGroup,
      patientName: request.patientName,
      donorsNotified: [],
      patientNotified: null,
      adminNotified: null,
    };

    // 1. If request is still "broadcasting":
    if (request.status === "broadcasting") {
      const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
      const allMatching = await User.find({
        roles: "donor",
        bloodGroup: { $in: compatibleGroups },
      }).lean();

      const releasedSet = new Set(
        (request.releasedDonorIds || []).map((id) => id.toString()),
      );
      const declinedSet = new Set(
        (request.declinedDonorIds || []).map((id) => id.toString()),
      );
      const today = new Date();

      const eligibleDonors = allMatching.filter((donor) => {
        const dIdStr = donor._id.toString();
        if (releasedSet.has(dIdStr)) return false;
        if (declinedSet.has(dIdStr)) return false;
        if (donor.isAvailable === false) return false;
        if (donor.lastDonationDate) {
          const daysSince = Math.floor(
            (today - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24),
          );
          if (daysSince < 56) return false;
        }
        return true;
      });

      // Update eligibleDonorIds if not set
      if (!request.eligibleDonorIds || request.eligibleDonorIds.length === 0) {
        await EmergencyRequest.findByIdAndUpdate(request._id, {
          eligibleDonorIds: eligibleDonors.map((d) => d._id),
          eligibleDonorsNotifiedCount: eligibleDonors.length,
        });
      }

      for (const donor of eligibleDonors) {
        const normalizedDonorPhone = normalizeIndianPhone(donor.phone);
        if (!normalizedDonorPhone) continue;

        // Ensure token exists
        let acceptTokenDoc = await DonorToken.findOne({
          requestId: request._id,
          donorId: donor._id,
          action: "accept",
        });
        let rejectTokenDoc = await DonorToken.findOne({
          requestId: request._id,
          donorId: donor._id,
          action: "reject",
        });

        let acceptToken = acceptTokenDoc?.token;
        let rejectToken = rejectTokenDoc?.token;
        if (!acceptToken || !rejectToken) {
          acceptToken = acceptToken || uuidv4();
          rejectToken = rejectToken || uuidv4();
          await DonorToken.insertMany([
            {
              token: acceptToken,
              requestId: request._id,
              donorId: donor._id,
              action: "accept",
            },
            {
              token: rejectToken,
              requestId: request._id,
              donorId: donor._id,
              action: "reject",
            },
          ]);
        }

        const acceptUrl = `${baseUrl}/api/donors/token-accept/${acceptToken}`;
        const rejectUrl = `${baseUrl}/api/donors/token-reject/${rejectToken}`;

        const smsBody = buildDonorSMS({
          request,
          requestNumber: request.requestNumber,
          patientName: request.patientName,
          bloodGroup: request.bloodGroup,
          unitsRequired: request.unitsRequired,
          hospitalName: request.hospitalName,
          city: request.city || "Salem",
          acceptUrl,
          rejectUrl,
        });

        await recordDonorReceivedRequest(donor, request);

        const res = await sendSMS(donor.phone, smsBody, {
          requestId: request._id,
          donorId: donor._id,
          recipientType: "donor",
          messageType: "donor_broadcast",
          forceRetry,
        });

        reqReport.donorsNotified.push({
          donorId: donor._id,
          name: donor.name,
          phone: donor.phone,
          status: res.skipped
            ? "skipped_already_sent"
            : res.success
              ? "sent"
              : "failed",
          error: res.error || null,
          providerResponse: res.response || null,
        });

        await new Promise((r) => setTimeout(r, 250));
      }
    }

    // 2. If request is "accepted", "in_progress", or "fulfilled":
    if (["accepted", "in_progress", "fulfilled"].includes(request.status)) {
      if (request.acceptedByDonorId) {
        const donor = await User.findById(request.acceptedByDonorId).lean();
        if (donor) {
          const patientResult = await notifyPatientOfAcceptance({ request, donor });
          reqReport.patientNotified = patientResult.patient;

          const otherResult = await notifyOtherDonorsAccepted({
            request,
            winningDonorId: request.acceptedByDonorId,
          });
          reqReport.otherDonorsNotifiedCount = otherResult.notifiedCount;
        }
      }
    }

    report.push(reqReport);
  }

  return report;
}

module.exports = {
  broadcastEmergencyRequest,
  notifyPatientOfAcceptance,
  notifyOtherDonorsAccepted,
  notifyReleaseAndReopened,
  notifyAdminOfEvent,
  backfillMissingNotifications,
};
