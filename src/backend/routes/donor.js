const express = require("express");
const router = express.Router();
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const DonorToken = require("../models/DonorToken");
const {
  notifyPatientOfAcceptance,
  notifyOtherDonorsAccepted,
} = require("../services/broadcast");
const { normalizeIndianPhone } = require("../utils/phone");
const { authenticateToken } = require("../middleware/auth");
const { getCompatibleDonorGroups } = require("../utils/compatibility");
const {
  recordDonorAcceptance,
  recordDonorDecline,
} = require("../utils/receivedRequests");

// Helper to detect web crawler bot previews to avoid accidental trigger on SMS preview
function isBotCrawler(req) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot =
    /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|slackbot|skypeuripreview|preview/i.test(
      userAgent,
    );
  const isPrefetch =
    req.headers["purpose"] === "prefetch" ||
    req.headers["x-purpose"] === "preview" ||
    req.headers["sec-purpose"] === "prefetch";
  return isBot || isPrefetch;
}

// ── GET /api/donors/token-accept/:token ──────────────────────
// Direct SMS accept link — no login required (Section 7 & 8)
router.get("/token-accept/:token", async (req, res) => {
  if (isBotCrawler(req)) {
    return res.status(200).send(
      buildPage({
        title: "BloodGuard Emergency Response",
        icon: "🩸",
        body: "<p>Tap the link in your browser to confirm your acceptance.</p>",
        color: "#dc2626",
      }),
    );
  }

  const donorToken = await DonorToken.findOne({
    token: req.params.token,
    action: "accept",
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!donorToken) {
    return res.status(400).send(
      buildPage({
        title: "Link Expired or Already Used",
        icon: "❌",
        body: "<p>This accept link has already been used, has expired, or is invalid.</p>",
        color: "#dc2626",
      }),
    );
  }

  const [request, donor] = await Promise.all([
    EmergencyRequest.findById(donorToken.requestId),
    User.findById(donorToken.donorId),
  ]);

  if (!request || !donor) {
    return res.status(404).send(
      buildPage({
        title: "Not Found",
        icon: "❌",
        body: "<p>The associated request or donor account could not be found.</p>",
        color: "#dc2626",
      }),
    );
  }

  const isDonorRole = Array.isArray(donor.roles)
    ? donor.roles.includes("donor")
    : donor.role === "donor";

  const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
  if (!isDonorRole || !compatibleGroups.includes(donor.bloodGroup)) {
    return res.status(403).send(
      buildPage({
        title: "Donor Not Eligible",
        icon: "❌",
        body: "<p>This response link is not valid for this donor profile.</p>",
        color: "#dc2626",
      }),
    );
  }

  if (!donor.isEligibleToDonate()) {
    return res.status(409).send(
      buildPage({
        title: "Donation Eligibility Notice",
        icon: "⚠️",
        body: "<p>You do not currently meet the 56-day whole blood interval or availability requirements.</p>",
        color: "#d97706",
      }),
    );
  }

  if (request.status !== "broadcasting") {
    return res.status(409).send(
      buildPage({
        title: "Request Already Accepted or Closed",
        icon: "✅",
        body: `<p>This emergency request is no longer available. It was already accepted by <strong>${request.acceptedByDonorName || "another donor"}</strong>.</p><p>Thank you for your willingness to save a life!</p>`,
        color: "#059669",
      }),
    );
  }

  // Atomic acceptance: First-accept-wins (Section 8)
  const updated = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request._id,
      status: "broadcasting",
      eligibleDonorIds: donor._id,
      declinedDonorIds: { $ne: donor._id },
      releasedDonorIds: { $ne: donor._id },
    },
    {
      status: "accepted",
      acceptedByDonorId: donor._id,
      acceptedByDonorName: donor.name,
      acceptedByDonorPhone: normalizeIndianPhone(donor.phone),
      acceptedByDonorPublicId: donor.donorId || `DN${String(donor.phone).slice(-5)}`,
      acceptedAt: new Date(),
      $push: {
        acceptanceHistory: {
          donorId: donor._id,
          donorName: donor.name,
          donorPhone: donor.phone,
          donorPublicId: donor.donorId || `DN${String(donor.phone).slice(-5)}`,
          acceptedAt: new Date(),
        },
        auditTrail: {
          action: "donor_accepted_via_sms",
          performedBy: donor._id,
          performedByRole: "donor",
          timestamp: new Date(),
          details: { via: "sms_token_accept" },
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    const existing = await EmergencyRequest.findById(request._id).lean();
    return res.status(409).send(
      buildPage({
        title: "Request Already Accepted",
        icon: "✅",
        body: `<p>Another donor (<strong>${existing?.acceptedByDonorName || "verified donor"}</strong>) accepted this request just moments ahead.</p><p>Thank you sincerely for your readiness to help!</p>`,
        color: "#059669",
      }),
    );
  }

  // Mark all tokens for this donor and request as used
  await DonorToken.updateMany(
    { requestId: request._id, donorId: donor._id },
    { used: true },
  );

  // Increment donation count for donor
  await User.findByIdAndUpdate(donor._id, { $inc: { totalDonations: 1 } });

  // Record donor acceptance reference (DN...-ACC-...)
  await recordDonorAcceptance(donor._id, updated._id);

  // Section 11: Notify patient with donor contact details
  notifyPatientOfAcceptance({
    request: updated,
    donor: donor.toJSON ? donor.toJSON() : donor,
  }).catch((err) => console.error("[SMS Patient Notify Error]", err.message));

  // Section 9: Notify other eligible donors that request is already accepted
  notifyOtherDonorsAccepted({
    request: updated,
    winningDonorId: donor._id,
  }).catch((err) => console.error("[SMS Other Donors Error]", err.message));

  const reqNumber = updated.requestNumber || updated._id;

  return res.send(
    buildPage({
      title: "🩸 Acceptance Confirmed — Thank You!",
      icon: "❤️",
      color: "#059669",
      body: `
      <p>You have successfully accepted emergency request <strong>${reqNumber}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:16px;margin:16px 0;text-align:left;font-size:13px;line-height:1.7;">
        <p><strong>Request Number:</strong> ${reqNumber}</p>
        <p><strong>Blood Group Needed:</strong> ${request.bloodGroup} (${request.unitsRequired} unit${request.unitsRequired > 1 ? "s" : ""})</p>
        <p><strong>Hospital:</strong> ${request.hospitalName}, ${request.city || "Salem"}</p>
        <p><strong>Urgency:</strong> ${request.urgency}</p>
        <p><strong>Patient Contact:</strong> ${request.contactPhone}</p>
      </div>
      <p>The patient has been notified of your response with your contact details.</p>
      <p>Please proceed to <strong>${request.hospitalName}</strong> to coordinate the blood donation.</p>
    `,
    }),
  );
});

// ── GET /api/donors/token-reject/:token ──────────────────────
// Direct SMS reject link — no login required (Section 7)
router.get("/token-reject/:token", async (req, res) => {
  if (isBotCrawler(req)) {
    return res.status(200).send(
      buildPage({
        title: "BloodGuard Emergency Response",
        icon: "🩸",
        body: "<p>Tap the link in your browser to record your response.</p>",
        color: "#64748b",
      }),
    );
  }

  const donorToken = await DonorToken.findOne({
    token: req.params.token,
    action: "reject",
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!donorToken) {
    return res.status(400).send(
      buildPage({
        title: "Link Expired or Already Used",
        icon: "❌",
        body: "<p>This response link has already been used or has expired.</p>",
        color: "#dc2626",
      }),
    );
  }

  const [request, donor] = await Promise.all([
    EmergencyRequest.findById(donorToken.requestId),
    User.findById(donorToken.donorId),
  ]);

  if (!request || !donor) {
    return res.status(404).send(
      buildPage({
        title: "Not Found",
        icon: "❌",
        body: "<p>The associated request or donor account could not be found.</p>",
        color: "#dc2626",
      }),
    );
  }

  if (request.status === "broadcasting") {
    await EmergencyRequest.findOneAndUpdate(
      { _id: request._id, status: "broadcasting" },
      {
        $addToSet: { declinedDonorIds: donor._id },
        $push: {
          auditTrail: {
            action: "donor_declined_via_sms",
            performedBy: donor._id,
            performedByRole: "donor",
            timestamp: new Date(),
            details: { via: "sms_token_reject" },
          },
        },
      },
    );
  }

  await DonorToken.updateMany(
    { requestId: request._id, donorId: donor._id },
    { used: true },
  );

  await recordDonorDecline(donor._id, request._id);

  return res.send(
    buildPage({
      title: "Response Recorded",
      icon: "🙏",
      color: "#64748b",
      body: `
      <p>Your response has been recorded. The request remains open for other eligible donors.</p>
      <p>Thank you for being part of the BloodGuard donor network.</p>
    `,
    }),
  );
});

// ── GET /api/donors/search ────────────────────────────────────
// Section 5: Donor Search for Patients and Administrators
router.get("/search", authenticateToken, async (req, res) => {
  const { bloodGroup, compatible = "true", state, district, city, availability = "true", eligibleOnly = "true" } = req.query;

  const filter = {
    roles: "donor",
  };

  if (state && state.trim()) {
    filter.state = new RegExp(`^${state.trim()}$`, "i");
  }

  if (district && district.trim()) {
    filter.district = new RegExp(`^${district.trim()}$`, "i");
  }

  if (city && city.trim()) {
    filter.city = new RegExp(`^${city.trim()}$`, "i");
  }

  if (availability === "true") {
    filter.isAvailable = true;
  }

  if (bloodGroup && bloodGroup.trim()) {
    const bg = bloodGroup.trim();
    if (compatible === "true") {
      const allowedGroups = getCompatibleDonorGroups(bg);
      filter.bloodGroup = { $in: allowedGroups };
    } else {
      filter.bloodGroup = bg;
    }
  }

  // 56-day refractory rule
  if (eligibleOnly === "true") {
    const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
    filter.$or = [
      { lastDonationDate: null },
      { lastDonationDate: { $exists: false } },
      { lastDonationDate: { $lte: fiftySixDaysAgo } },
    ];
  }

  const isAdmin = req.user.roles && req.user.roles.includes("admin");

  // Patients view permitted non-sensitive fields; Admins view full details
  let selectFields = "donorId bloodGroup state district city isAvailable totalDonations hospitalAffiliation createdAt";
  if (isAdmin) {
    selectFields += " name email phone lastDonationDate";
  }

  const donors = await User.find(filter)
    .select(selectFields)
    .sort({ totalDonations: -1, createdAt: -1 })
    .limit(100)
    .lean();

  const formattedDonors = donors.map((d) => {
    const today = new Date();
    const daysSince = d.lastDonationDate
      ? Math.floor((today - new Date(d.lastDonationDate)) / (1000 * 60 * 60 * 24))
      : 999;
    const isEligible = (d.isAvailable !== false) && daysSince >= 56;

    return {
      id: d._id,
      donorId: d.donorId || `DN${String(d.phone || d._id).slice(-5)}`,
      name: isAdmin ? d.name : `Donor ${d.donorId || ""}`,
      email: isAdmin ? d.email : undefined,
      phone: isAdmin ? d.phone : undefined,
      bloodGroup: d.bloodGroup,
      state: d.state || "Tamil Nadu",
      district: d.district || "Salem",
      city: d.city || "Salem",
      isAvailable: d.isAvailable,
      isEligible,
      daysSinceLastDonation: daysSince === 999 ? null : daysSince,
      totalDonations: d.totalDonations || 0,
      hospitalAffiliation: d.hospitalAffiliation || null,
    };
  });

  return res.json({ donors: formattedDonors, count: formattedDonors.length });
});

// ── Helper: Build clean responsive HTML response page ─────────
function buildPage({ title, icon, body, color }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — BloodGuard</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:24px;padding:36px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.08);text-align:center;border:1px solid #e2e8f0}
    .icon{font-size:56px;margin-bottom:14px}
    h1{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:14px;line-height:1.3}
    .body{font-size:14px;color:#475569;line-height:1.6;text-align:left}
    .body p{margin-bottom:10px}
    .brand{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8}
    .brand strong{color:#dc2626}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1 style="color:${color}">${title}</h1>
    <div class="body">${body}</div>
    <div class="brand"><strong>🩸 BloodGuard</strong> • Emergency Blood Coordination Platform</div>
  </div>
</body>
</html>`;
}

module.exports = router;
