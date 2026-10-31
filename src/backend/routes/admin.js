const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const DonorHistory = require("../models/DonorHistory");
const SmsLog = require("../models/SmsLog");
const Hospital = require("../models/Hospital");
const DonorReceivedRequest = require("../models/DonorReceivedRequest");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { broadcastEmergencyRequest } = require("../services/broadcast");
const { normalizeIndianPhone } = require("../utils/phone");

// All admin routes require JWT + admin role
router.use(authenticateToken, requireRole("admin"));

// ── GET /api/admin/stats ──────────────────────────────────────
router.get("/stats", async (req, res) => {
  const [
    totalUsers,
    patientOnly,
    donorOnly,
    bothRole,
    availableDonors,
    activeRequests,
    flaggedRequests,
    fulfilledRequests,
    totalRequests,
    reopenedRequests,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: ["patient"] }),
    User.countDocuments({ roles: ["donor"] }),
    User.countDocuments({ roles: { $all: ["patient", "donor"] } }),
    User.countDocuments({ roles: "donor", isAvailable: true }),
    EmergencyRequest.countDocuments({
      status: { $in: ["broadcasting", "accepted"] },
    }),
    EmergencyRequest.countDocuments({ status: "suspicious_review" }),
    EmergencyRequest.countDocuments({ status: "fulfilled" }),
    EmergencyRequest.countDocuments(),
    EmergencyRequest.countDocuments({ "acceptanceHistory.0": { $exists: true } }),
  ]);

  return res.json({
    totalUsers,
    patientOnly,
    donorOnly,
    bothRole,
    totalDonors: donorOnly + bothRole,
    totalPatients: patientOnly + bothRole,
    availableDonors,
    activeRequests,
    flaggedRequests,
    fulfilledRequests,
    totalRequests,
    reopenedRequests,
  });
});

// ── GET /api/admin/location-stats ─────────────────────────────
router.get("/location-stats", async (req, res) => {
  const { state, district, city, bloodGroup } = req.query;

  const donorFilter = { roles: "donor" };
  const requestFilter = {};
  const hospitalFilter = {};

  if (state && state.trim()) {
    donorFilter.state = new RegExp(`^${state.trim()}$`, "i");
    requestFilter.state = new RegExp(`^${state.trim()}$`, "i");
    hospitalFilter.state = new RegExp(`^${state.trim()}$`, "i");
  }

  if (district && district.trim()) {
    donorFilter.district = new RegExp(`^${district.trim()}$`, "i");
    requestFilter.district = new RegExp(`^${district.trim()}$`, "i");
    hospitalFilter.district = new RegExp(`^${district.trim()}$`, "i");
  }

  if (city && city.trim()) {
    donorFilter.city = new RegExp(`^${city.trim()}$`, "i");
    requestFilter.city = new RegExp(`^${city.trim()}$`, "i");
    hospitalFilter.city = new RegExp(`^${city.trim()}$`, "i");
  }

  if (bloodGroup && bloodGroup.trim()) {
    donorFilter.bloodGroup = bloodGroup.trim();
    requestFilter.bloodGroup = bloodGroup.trim();
  }

  // 56-day refractory cutoff
  const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

  const [
    totalDonors,
    availableDonors,
    eligibleDonors,
    totalRequests,
    fulfilledRequests,
    hospitalsTotal,
    hospitalsVerified,
    hospitalsPending,
    hospitalsNeedsReview,
  ] = await Promise.all([
    User.countDocuments(donorFilter),
    User.countDocuments({ ...donorFilter, isAvailable: true }),
    User.countDocuments({
      ...donorFilter,
      isAvailable: true,
      $or: [
        { lastDonationDate: null },
        { lastDonationDate: { $exists: false } },
        { lastDonationDate: { $lte: fiftySixDaysAgo } },
      ],
    }),
    EmergencyRequest.countDocuments(requestFilter),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "fulfilled" }),
    Hospital.countDocuments(hospitalFilter),
    Hospital.countDocuments({ ...hospitalFilter, verificationStatus: "verified", isActive: true }),
    Hospital.countDocuments({ ...hospitalFilter, verificationStatus: "pending" }),
    Hospital.countDocuments({ ...hospitalFilter, verificationStatus: "needs_review" }),
  ]);

  // Aggregate donors grouped by city
  const cityDonorStats = await User.aggregate([
    { $match: donorFilter },
    {
      $group: {
        _id: { state: "$state", city: "$city" },
        count: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  // Aggregate requests grouped by treatment city
  const cityRequestStats = await EmergencyRequest.aggregate([
    { $match: requestFilter },
    {
      $group: {
        _id: { state: "$state", city: "$city" },
        count: { $sum: 1 },
        fulfilled: {
          $sum: { $cond: [{ $eq: ["$status", "fulfilled"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  return res.json({
    metrics: {
      totalDonors,
      availableDonors,
      eligibleDonors,
      totalRequests,
      fulfilledRequests,
      hospitals: {
        total: hospitalsTotal,
        verified: hospitalsVerified,
        pending: hospitalsPending,
        needsReview: hospitalsNeedsReview,
      },
    },
    cityDonorStats: cityDonorStats.map((item) => ({
      state: item._id.state || "Tamil Nadu",
      city: item._id.city || "Salem",
      count: item.count,
      available: item.available,
    })),
    cityRequestStats: cityRequestStats.map((item) => ({
      state: item._id.state || "Tamil Nadu",
      city: item._id.city || "Salem",
      count: item.count,
      fulfilled: item.fulfilled,
    })),
  });
});

// ── GET /api/admin/reports ────────────────────────────────────
// Section 16: Comprehensive Admin Reports with Date, City, Blood Group, Status filters
router.get("/reports", async (req, res) => {
  const { fromDate, toDate, city, bloodGroup, status } = req.query;

  const requestFilter = {};
  const userFilter = {};

  if (fromDate || toDate) {
    requestFilter.createdAt = {};
    userFilter.createdAt = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      requestFilter.createdAt.$gte = from;
      userFilter.createdAt.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      requestFilter.createdAt.$lte = to;
      userFilter.createdAt.$lte = to;
    }
  }

  if (city && city.trim()) {
    requestFilter.city = new RegExp(city.trim(), "i");
    userFilter.city = new RegExp(city.trim(), "i");
  }

  if (bloodGroup && bloodGroup.trim()) {
    requestFilter.bloodGroup = bloodGroup.trim();
    userFilter.bloodGroup = bloodGroup.trim();
  }

  if (status && status.trim()) {
    requestFilter.status = status.trim();
  }

  const [
    totalUsers,
    patientOnly,
    donorOnly,
    bothRole,
    activeDonors,
    inactiveDonors,
    totalRequests,
    openRequests,
    acceptedRequests,
    fulfilledRequests,
    rejectedRequests,
    suspiciousRequests,
    reopenedRequests,
    cityDonors,
    bloodGroupStats,
    recentRequests,
  ] = await Promise.all([
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, roles: ["patient"] }),
    User.countDocuments({ ...userFilter, roles: ["donor"] }),
    User.countDocuments({ ...userFilter, roles: { $all: ["patient", "donor"] } }),
    User.countDocuments({ ...userFilter, roles: "donor", isAvailable: true }),
    User.countDocuments({ ...userFilter, roles: "donor", isAvailable: false }),
    EmergencyRequest.countDocuments(requestFilter),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "broadcasting" }),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "accepted" }),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "fulfilled" }),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "rejected" }),
    EmergencyRequest.countDocuments({ ...requestFilter, status: "suspicious_review" }),
    EmergencyRequest.countDocuments({
      ...requestFilter,
      "acceptanceHistory.0": { $exists: true },
    }),
    User.aggregate([
      { $match: { ...userFilter, roles: "donor" } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    EmergencyRequest.aggregate([
      { $match: requestFilter },
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    EmergencyRequest.find(requestFilter)
      .populate("patientId", "name phone patientId")
      .populate("acceptedByDonorId", "name phone donorId")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  return res.json({
    metrics: {
      totalUsers,
      patientOnly,
      donorOnly,
      bothRole,
      activeDonors,
      inactiveDonors,
      totalRequests,
      openRequests,
      acceptedRequests,
      fulfilledRequests,
      rejectedRequests,
      suspiciousRequests,
      reopenedRequests,
    },
    cityDonors,
    bloodGroupStats,
    requests: recentRequests,
  });
});

// ── GET /api/admin/reports/csv ────────────────────────────────
// Export Reports to CSV
router.get("/reports/csv", async (req, res) => {
  const { fromDate, toDate, city, bloodGroup, status } = req.query;

  const requestFilter = {};
  if (fromDate || toDate) {
    requestFilter.createdAt = {};
    if (fromDate) requestFilter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      requestFilter.createdAt.$lte = to;
    }
  }
  if (city && city.trim()) requestFilter.city = new RegExp(city.trim(), "i");
  if (bloodGroup && bloodGroup.trim()) requestFilter.bloodGroup = bloodGroup.trim();
  if (status && status.trim()) requestFilter.status = status.trim();

  const requests = await EmergencyRequest.find(requestFilter)
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    "Request Number",
    "Patient Public ID",
    "Patient Name",
    "Blood Group",
    "Units",
    "Urgency",
    "Hospital",
    "City",
    "Status",
    "Accepted Donor Name",
    "Accepted Donor Phone",
    "Anomaly Score",
    "Created Date",
  ];

  const rows = requests.map((r) => [
    `"${r.requestNumber || r._id}"`,
    `"${r.patientPublicId || ""}"`,
    `"${r.patientName || ""}"`,
    `"${r.bloodGroup || ""}"`,
    r.unitsRequired || 1,
    `"${r.urgency || ""}"`,
    `"${(r.hospitalName || "").replace(/"/g, '""')}"`,
    `"${r.city || "Salem"}"`,
    `"${r.status || ""}"`,
    `"${(r.acceptedByDonorName || "").replace(/"/g, '""')}"`,
    `"${r.acceptedByDonorPhone || ""}"`,
    r.anomalyScore || 0,
    `"${r.createdAt ? new Date(r.createdAt).toISOString() : ""}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=bloodguard_report_${Date.now()}.csv`,
  );
  return res.send(csvContent);
});

// ── GET /api/admin/requests ───────────────────────────────────
router.get("/requests", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
  if (req.query.city) filter.city = new RegExp(req.query.city.trim(), "i");
  if (req.query.flagged === "true") filter.isFlagged = true;

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const [requests, total] = await Promise.all([
    EmergencyRequest.find(filter)
      .populate("patientId", "name email phone patientId")
      .populate("acceptedByDonorId", "name email phone bloodGroup donorId")
      .populate("adminReviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EmergencyRequest.countDocuments(filter),
  ]);

  return res.json({ requests, total, page, pages: Math.ceil(total / limit) });
});

// ── POST /api/admin/requests/:id/approve ─────────────────────
// Section 12: Admin approves flagged suspicious request
router.post("/requests/:id/approve", async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  if (request.status !== "suspicious_review") {
    return res.status(400).json({
      error: `Request status is "${request.status}", not "suspicious_review".`,
    });
  }

  const reviewNote =
    req.body.note || req.body.reason || "Approved by Medical Officer after document verification.";

  await EmergencyRequest.findByIdAndUpdate(req.params.id, {
    isFlagged: false,
    status: "broadcasting",
    adminReviewedBy: req.user._id,
    adminReviewNote: reviewNote,
    adminReviewedAt: new Date(),
    $push: {
      auditTrail: {
        action: "admin_approved_suspicious_request",
        performedBy: req.user._id,
        performedByRole: "admin",
        timestamp: new Date(),
        details: { note: reviewNote },
      },
    },
  });

  // Trigger broadcast to ALL eligible matching donors simultaneously
  let broadcastResult;
  try {
    broadcastResult = await broadcastEmergencyRequest(req.params.id);
  } catch (err) {
    console.error("[Admin Approve Broadcast Error]", err.message);
    return res
      .status(500)
      .json({ error: "Request approved, but broadcast failed. Please retry." });
  }

  const updated = await EmergencyRequest.findById(req.params.id);

  return res.json({
    message: `Request approved and broadcast to ${broadcastResult.eligibleDonorsCount} eligible donors simultaneously.`,
    request: updated,
    broadcast: broadcastResult,
  });
});

// ── POST /api/admin/requests/:id/reject ──────────────────────
router.post("/requests/:id/reject", async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const reviewNote =
    req.body.note || req.body.reason || "Rejected by Medical Officer after manual review.";

  await EmergencyRequest.findByIdAndUpdate(req.params.id, {
    status: "rejected",
    adminReviewedBy: req.user._id,
    adminReviewNote: reviewNote,
    adminReviewedAt: new Date(),
    $push: {
      auditTrail: {
        action: "admin_rejected_request",
        performedBy: req.user._id,
        performedByRole: "admin",
        timestamp: new Date(),
        details: { note: reviewNote },
      },
    },
  });

  return res.json({
    message: `Request ${request.requestNumber || req.params.id} rejected and blocked from broadcast.`,
  });
});

// ── GET /api/admin/requests/:id/document ─────────────────────
// Admin document preview
router.get("/requests/:id/document", async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id).lean();
  if (!request) return res.status(404).json({ error: "Request not found." });

  if (!request.documentPath) {
    return res
      .status(404)
      .json({ error: "No document attached to this request." });
  }

  const safeFilename = path.basename(request.documentPath);
  const possiblePaths = [
    path.resolve(__dirname, "../uploads", safeFilename),
    path.resolve(__dirname, "../../uploads", safeFilename),
    path.resolve(process.cwd(), "uploads", safeFilename),
    path.resolve(process.cwd(), "src/backend/uploads", safeFilename),
    process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR, safeFilename) : null,
  ].filter(Boolean);

  const filePath = possiblePaths.find((p) => fs.existsSync(p));

  if (!filePath) {
    return res
      .status(404)
      .json({ error: "Document file not found on server storage." });
  }

  let mimeType = request.documentMimeType;
  if (!mimeType) {
    const ext = path.extname(safeFilename).toLowerCase();
    if (ext === ".pdf") mimeType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else mimeType = "application/octet-stream";
  }
  res.setHeader("Content-Type", mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${request.documentOriginalName || safeFilename}"`,
  );
  return res.sendFile(filePath);
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get("/users", async (req, res) => {
  const filter = {};
  if (req.query.role) filter.roles = req.query.role;
  if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
  if (req.query.city) filter.city = new RegExp(req.query.city.trim(), "i");

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash -resetToken -resetTokenExpiry")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

// ── PATCH /api/admin/users/:id ────────────────────────────────
router.patch("/users/:id", async (req, res) => {
  const allowed = [
    "name",
    "isAvailable",
    "bloodGroup",
    "roles",
    "city",
    "lastDonationDate",
  ];
  const updates = {};
  if (req.body.phone !== undefined) {
    const phone = normalizeIndianPhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({
        error: "Phone must be a valid 10-digit Indian mobile number.",
      });
    }
    updates.phone = phone;
  }
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const updated = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!updated) return res.status(404).json({ error: "User not found." });

  return res.json({ message: "User updated.", user: updated.toJSON() });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────
router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res
      .status(400)
      .json({ error: "You cannot delete your own admin account." });
  }
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "User not found." });
  return res.json({ message: "User account deleted." });
});

// ── GET /api/admin/analytics ──────────────────────────────────
router.get("/analytics", async (req, res) => {
  const [requestsByBloodGroup, requestsByStatus, donorAvailability, requestsByCity] =
    await Promise.all([
      EmergencyRequest.aggregate([
        { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      EmergencyRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { roles: "donor" } },
        { $group: { _id: "$isAvailable", count: { $sum: 1 } } },
      ]),
      EmergencyRequest.aggregate([
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

  return res.json({
    requestsByBloodGroup,
    requestsByStatus,
    donorAvailability,
    requestsByCity,
  });
});

// ── POST /api/admin/sms/test ─────────────────────────────────
router.post("/sms/test", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({
      error: "phone must be a valid 10-digit Indian mobile number.",
    });
  }

  const { sendSMS } = require("../services/sms");
  const testMsg =
    message ||
    `BloodGuard SMS Test\nProvider: Fast2SMS\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n- BloodGuard Platform`;

  const result = await sendSMS(normalizedPhone, testMsg, {
    recipientType: "admin",
    messageType: "test",
  });
  return res.json({
    provider: "fast2sms",
    phone: normalizedPhone,
    result,
  });
});

// ── GET /api/admin/sms/status ────────────────────────────────
router.get("/sms/status", (req, res) => {
  const credentialsConfigured = Boolean(process.env.FAST2SMS_API_KEY);

  return res.json({
    provider: "fast2sms",
    credentialsConfigured,
    configured: credentialsConfigured,
    integrationReady: credentialsConfigured,
    adminPhone: process.env.ADMIN_PHONE || "9361111750",
    message: credentialsConfigured
      ? "Fast2SMS gateway is connected and operational."
      : "FAST2SMS_API_KEY is not set in backend .env. Set your API key from fast2sms.com.",
  });
});

// ── GET /api/admin/sms/logs ──────────────────────────────────
router.get("/sms/logs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.recipientType) filter.recipientType = req.query.recipientType;
    if (req.query.requestId) filter.requestId = req.query.requestId;

    const [logs, total] = await Promise.all([
      SmsLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      SmsLog.countDocuments(filter),
    ]);

    return res.json({ logs, total });
  } catch (err) {
    console.error("[Admin SMS Logs Error]", err.message);
    return res.status(500).json({ error: "Failed to retrieve SMS logs." });
  }
});

// ── POST /api/admin/sms/backfill ─────────────────────────────
// Requirement 2: Send missing SMS for existing requests safely & idempotently
router.post("/sms/backfill", async (req, res) => {
  try {
    const { requestId, forceRetry } = req.body || {};
    const { backfillMissingNotifications } = require("../services/broadcast");
    const report = await backfillMissingNotifications({
      requestId: requestId || null,
      forceRetry: Boolean(forceRetry),
    });

    return res.json({
      success: true,
      message: "Backfill completed.",
      report,
    });
  } catch (err) {
    console.error("[Admin SMS Backfill Error]", err.message);
    return res.status(500).json({ error: err.message || "Backfill failed." });
  }
});

// ── POST /api/admin/sms/retry-failed ─────────────────────────
// Requirement 4: Retry failed notifications without duplicate sends
router.post("/sms/retry-failed", async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const { backfillMissingNotifications } = require("../services/broadcast");
    const report = await backfillMissingNotifications({
      requestId: requestId || null,
      forceRetry: false, // will only send to those who did NOT succeed previously
    });

    return res.json({
      success: true,
      message: "Retry of pending/failed SMS notifications completed.",
      report,
    });
  } catch (err) {
    console.error("[Admin SMS Retry Error]", err.message);
    return res.status(500).json({ error: err.message || "Retry failed." });
  }
});

// ── POST /api/admin/sms/test-workflow ────────────────────────
// Requirement 5: Test mode for all SMS workflows
router.post("/sms/test-workflow", async (req, res) => {
  try {
    const { testType = "all", targetPhone = null } = req.body || {};
    const { sendSMS, buildDonorSMS, buildPatientAcceptanceSMS, buildOtherDonorsAcceptedSMS, buildAdminNoticeSMS } = require("../services/sms");
    const { backfillMissingNotifications } = require("../services/broadcast");
    const adminPhone = targetPhone || process.env.ADMIN_PHONE || "9361111750";
    const results = {};

    // 1. Backfill test for existing requests
    if (testType === "all" || testType === "backfill") {
      const backfillReport = await backfillMissingNotifications();
      results.backfill = {
        success: true,
        summary: `Processed ${backfillReport.length} requests for backfill`,
        details: backfillReport,
      };
    }

    // 2. Admin notification test
    if (testType === "all" || testType === "admin_notice") {
      const adminNoticeMsg = buildAdminNoticeSMS({
        request: { requestNumber: "TEST-REQ-001", patientName: "Test Patient", bloodGroup: "B+", hospitalName: "Test Hospital", unitsRequired: 1 },
        eventType: "request_created",
      });
      const adminRes = await sendSMS(adminPhone, adminNoticeMsg, {
        recipientType: "admin",
        messageType: "admin_notice",
        forceRetry: true,
      });
      results.adminNotice = adminRes;
    }

    // 3. Donor broadcast format test
    if (testType === "all" || testType === "donor_broadcast") {
      const donorMsg = buildDonorSMS({
        patientName: "Test Patient",
        requestNumber: "TEST-REQ-001",
        bloodGroup: "B+",
        unitsRequired: 2,
        hospitalName: "St. Peters Hospital",
        city: "Hosur",
        acceptUrl: "http://localhost:4000/api/donors/token-accept/test-token",
        rejectUrl: "http://localhost:4000/api/donors/token-reject/test-token",
      });
      const donorRes = await sendSMS(adminPhone, donorMsg, {
        recipientType: "donor",
        messageType: "test",
        forceRetry: true,
      });
      results.donorBroadcast = donorRes;
    }

    // 4. Patient acceptance notification test
    if (testType === "all" || testType === "patient_acceptance") {
      const patientMsg = buildPatientAcceptanceSMS({
        request: { requestNumber: "TEST-REQ-001" },
        donor: { name: "Test Donor", donorId: "DN-TEST", bloodGroup: "B+", phone: adminPhone },
      });
      const patientRes = await sendSMS(adminPhone, patientMsg, {
        recipientType: "patient",
        messageType: "test",
        forceRetry: true,
      });
      results.patientAcceptance = patientRes;
    }

    // 5. Remaining donors notification test
    if (testType === "all" || testType === "other_donors") {
      const otherMsg = buildOtherDonorsAcceptedSMS({
        requestNumber: "TEST-REQ-001",
      });
      const otherRes = await sendSMS(adminPhone, otherMsg, {
        recipientType: "donor",
        messageType: "test",
        forceRetry: true,
      });
      results.otherDonors = otherRes;
    }

    // 6. Deduplication test (retry without forceRetry)
    if (testType === "all" || testType === "dedup") {
      const dedupMsg = "[BloodGuard Test] Deduplication check";
      const first = await sendSMS(adminPhone, dedupMsg, {
        requestId: "TEST-DEDUP-001",
        recipientType: "admin",
        messageType: "test",
        forceRetry: true,
      });
      const second = await sendSMS(adminPhone, dedupMsg, {
        requestId: "TEST-DEDUP-001",
        recipientType: "admin",
        messageType: "test",
        forceRetry: false,
      });
      results.deduplicationTest = {
        firstAttempt: first.success ? "sent" : "failed",
        secondAttempt: second.skipped ? "correctly_skipped_duplicate" : "failed",
      };
    }

    return res.json({
      success: true,
      testPhone: adminPhone,
      results,
    });
  } catch (err) {
    console.error("[Admin SMS Test Workflow Error]", err.message);
    return res.status(500).json({ error: err.message || "Test workflow failed." });
  }
});

// ── GET /api/admin/donors (Section 3: Donor Directory) ────────
router.get("/donors", async (req, res) => {
  try {
    const {
      bloodGroup,
      donorId,
      search,
      city,
      availability,
      eligibleOnly,
      fromDate,
      toDate,
    } = req.query;

    const filter = { roles: "donor" };

    if (bloodGroup && bloodGroup.trim()) {
      filter.bloodGroup = bloodGroup.trim();
    }

    if (donorId && donorId.trim()) {
      filter.donorId = new RegExp(donorId.trim(), "i");
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
        { donorId: new RegExp(s, "i") },
      ];
    }

    if (city && city.trim()) {
      filter.city = new RegExp(city.trim(), "i");
    }

    if (availability === "true") {
      filter.isAvailable = true;
    } else if (availability === "false") {
      filter.isAvailable = false;
    }

    if (eligibleOnly === "true") {
      const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
      filter.isAvailable = true;
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { lastDonationDate: null },
          { lastDonationDate: { $exists: false } },
          { lastDonationDate: { $lte: fiftySixDaysAgo } },
        ],
      });
    }

    if (fromDate || toDate) {
      filter.createdAt = filter.createdAt || {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [donors, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -resetToken -resetTokenExpiry")
        .sort({ totalDonations: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const today = new Date();
    const formatted = donors.map((d) => {
      const daysSince = d.lastDonationDate
        ? Math.floor((today - new Date(d.lastDonationDate)) / (1000 * 60 * 60 * 24))
        : 999;
      const isEligible = d.isAvailable !== false && daysSince >= 56;
      return {
        ...d,
        id: d._id,
        isEligible,
        daysSinceLastDonation: daysSince === 999 ? null : daysSince,
        nextEligibleDate:
          daysSince < 56
            ? new Date(
                new Date(d.lastDonationDate).getTime() + 56 * 24 * 60 * 60 * 1000,
              )
            : null,
      };
    });

    return res.json({
      donors: formatted,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Admin Donors Error]", err.message);
    return res.status(500).json({ error: "Failed to search donors." });
  }
});

// ── GET /api/admin/donors/:id/profile (Section 3: Detailed Donor Profile) ──
router.get("/donors/:id/profile", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, roles: "donor" }
      : { donorId: req.params.id, roles: "donor" };

    const donor = await User.findOne(query)
      .select("-passwordHash -resetToken -resetTokenExpiry")
      .lean();

    if (!donor) {
      return res.status(404).json({ error: "Donor profile not found." });
    }

    const today = new Date();
    const daysSince = donor.lastDonationDate
      ? Math.floor((today - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24))
      : 999;
    const isEligible = donor.isAvailable !== false && daysSince >= 56;
    donor.isEligible = isEligible;
    donor.daysSinceLastDonation = daysSince === 999 ? null : daysSince;

    // 1. Received requests from DonorReceivedRequest collection
    const receivedRecords = await DonorReceivedRequest.find({ donorId: donor._id })
      .populate("requestId", "patientName hospitalName city unitsRequired bloodGroup status urgency createdAt")
      .sort({ sequence: -1 })
      .lean();

    // 2. Requests accepted by this donor
    const acceptedRequests = await EmergencyRequest.find({
      acceptedByDonorId: donor._id,
    })
      .select("requestNumber patientName hospitalName city unitsRequired bloodGroup status acceptedAt createdAt")
      .sort({ acceptedAt: -1 })
      .lean();

    // 3. Requests released by this donor (from acceptanceHistory)
    const releasedRequests = await EmergencyRequest.find({
      "acceptanceHistory.donorId": donor._id,
    })
      .select("requestNumber patientName hospitalName city bloodGroup acceptanceHistory createdAt")
      .lean();

    const releasedEvents = [];
    releasedRequests.forEach((req) => {
      (req.acceptanceHistory || []).forEach((hist) => {
        if (hist.donorId && hist.donorId.toString() === donor._id.toString()) {
          releasedEvents.push({
            requestId: req._id,
            requestNumber: req.requestNumber,
            hospitalName: req.hospitalName,
            city: req.city,
            bloodGroup: req.bloodGroup,
            acceptedAt: hist.acceptedAt,
            releasedAt: hist.releasedAt,
            releaseReason: hist.releaseReason,
          });
        }
      });
    });

    // 4. Completed donations
    const completedDonations = await EmergencyRequest.find({
      acceptedByDonorId: donor._id,
      status: "fulfilled",
    })
      .select("requestNumber patientName hospitalName city bloodGroup unitsRequired updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    // 5. Declined count
    const declinedCount = await EmergencyRequest.countDocuments({
      declinedDonorIds: donor._id,
    });

    return res.json({
      donor,
      receivedRequests: receivedRecords,
      acceptedRequests,
      releasedEvents,
      completedDonations,
      stats: {
        totalReceived: receivedRecords.length,
        totalAccepted: acceptedRequests.length,
        totalDeclined: declinedCount,
        totalReleased: releasedEvents.length,
        totalCompleted: completedDonations.length,
      },
    });
  } catch (err) {
    console.error("[Admin Donor Profile Error]", err.message);
    return res.status(500).json({ error: "Failed to retrieve donor profile." });
  }
});

// ── GET /api/admin/patients (Section 5: Patient Management) ────
router.get("/patients", async (req, res) => {
  try {
    const { patientId, search, city, fromDate, toDate } = req.query;

    const filter = { roles: "patient" };

    if (patientId && patientId.trim()) {
      filter.patientId = new RegExp(patientId.trim(), "i");
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
        { patientId: new RegExp(s, "i") },
      ];
    }

    if (city && city.trim()) {
      filter.city = new RegExp(city.trim(), "i");
    }

    if (fromDate || toDate) {
      filter.createdAt = filter.createdAt || {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -resetToken -resetTokenExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate patient requests stats
    const patientIds = patients.map((p) => p._id);
    const statsAgg = await EmergencyRequest.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      {
        $group: {
          _id: "$patientId",
          total: { $sum: 1 },
          open: {
            $sum: { $cond: [{ $eq: ["$status", "broadcasting"] }, 1, 0] },
          },
          accepted: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
          },
          fulfilled: {
            $sum: { $cond: [{ $eq: ["$status", "fulfilled"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          reopened: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $size: { $ifNull: ["$acceptanceHistory", []] } },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    statsAgg.forEach((s) => statsMap.set(s._id.toString(), s));

    const formatted = patients.map((p) => {
      const s = statsMap.get(p._id.toString()) || {
        total: 0,
        open: 0,
        accepted: 0,
        fulfilled: 0,
        cancelled: 0,
        reopened: 0,
      };
      return {
        ...p,
        id: p._id,
        totalRequests: s.total,
        openRequests: s.open,
        acceptedRequests: s.accepted,
        fulfilledRequests: s.fulfilled,
        cancelledRequests: s.cancelled,
        reopenedRequests: s.reopened,
      };
    });

    return res.json({
      patients: formatted,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Admin Patients Error]", err.message);
    return res.status(500).json({ error: "Failed to search patients." });
  }
});

// ── GET /api/admin/patients/:id/history (Section 5: Patient Request History) ──
router.get("/patients/:id/history", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, roles: "patient" }
      : { patientId: req.params.id, roles: "patient" };

    const patient = await User.findOne(query)
      .select("-passwordHash -resetToken -resetTokenExpiry")
      .lean();

    if (!patient) {
      return res.status(404).json({ error: "Patient record not found." });
    }

    const requests = await EmergencyRequest.find({ patientId: patient._id })
      .populate("acceptedByDonorId", "name phone bloodGroup donorId")
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalRequests: requests.length,
      openRequests: requests.filter((r) => r.status === "broadcasting").length,
      acceptedRequests: requests.filter((r) => r.status === "accepted").length,
      fulfilledRequests: requests.filter((r) => r.status === "fulfilled").length,
      cancelledRequests: requests.filter((r) => r.status === "rejected").length,
      reopenedRequests: requests.filter((r) => (r.acceptanceHistory || []).length > 0).length,
    };

    return res.json({
      patient,
      requests,
      stats,
    });
  } catch (err) {
    console.error("[Admin Patient History Error]", err.message);
    return res.status(500).json({ error: "Failed to retrieve patient history." });
  }
});

// ── GET /api/admin/blood-groups (Section 4: Blood Group-Wise Reports) ──
router.get("/blood-groups", async (req, res) => {
  try {
    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

    const reports = await Promise.all(
      bloodGroups.map(async (bg) => {
        const [
          totalRegistered,
          availableDonors,
          eligibleDonors,
          cityAgg,
          totalRequests,
          acceptedRequests,
          fulfilledRequests,
        ] = await Promise.all([
          User.countDocuments({ roles: "donor", bloodGroup: bg }),
          User.countDocuments({
            roles: "donor",
            bloodGroup: bg,
            isAvailable: true,
          }),
          User.countDocuments({
            roles: "donor",
            bloodGroup: bg,
            isAvailable: true,
            $or: [
              { lastDonationDate: null },
              { lastDonationDate: { $exists: false } },
              { lastDonationDate: { $lte: fiftySixDaysAgo } },
            ],
          }),
          User.aggregate([
            { $match: { roles: "donor", bloodGroup: bg } },
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ]),
          EmergencyRequest.countDocuments({ bloodGroup: bg }),
          EmergencyRequest.countDocuments({ bloodGroup: bg, status: "accepted" }),
          EmergencyRequest.countDocuments({ bloodGroup: bg, status: "fulfilled" }),
        ]);

        const unavailableDonors = totalRegistered - availableDonors;
        const ineligibleDonors = availableDonors - eligibleDonors;

        return {
          bloodGroup: bg,
          totalRegistered,
          availableDonors,
          eligibleDonors,
          unavailableDonors,
          ineligibleDonors,
          cityDistribution: cityAgg.map((c) => ({
            city: c._id || "Salem",
            count: c.count,
          })),
          totalRequests,
          acceptedRequests,
          fulfilledRequests,
        };
      }),
    );

    return res.json({ bloodGroups: reports });
  } catch (err) {
    console.error("[Admin Blood Groups Error]", err.message);
    return res.status(500).json({ error: "Failed to generate blood group reports." });
  }
});

// ── GET /api/admin/date-reports (Section 6: Date-Wise Event Reports) ──
router.get("/date-reports", async (req, res) => {
  try {
    const { fromDate, toDate, city, bloodGroup } = req.query;

    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    const to = toDate ? new Date(toDate) : new Date();
    to.setHours(23, 59, 59, 999);

    const matchReq = { createdAt: { $gte: from, $lte: to } };
    if (city && city.trim()) matchReq.city = new RegExp(city.trim(), "i");
    if (bloodGroup && bloodGroup.trim()) matchReq.bloodGroup = bloodGroup.trim();

    // 1. Requests created in period
    const requestsCreated = await EmergencyRequest.find(matchReq)
      .populate("patientId", "name patientId phone")
      .populate("acceptedByDonorId", "name donorId phone")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Requests accepted in period (by acceptedAt timestamp)
    const acceptMatch = {
      acceptedAt: { $gte: from, $lte: to },
    };
    if (city && city.trim()) acceptMatch.city = new RegExp(city.trim(), "i");
    if (bloodGroup && bloodGroup.trim()) acceptMatch.bloodGroup = bloodGroup.trim();

    const requestsAccepted = await EmergencyRequest.find(acceptMatch)
      .populate("patientId", "name patientId")
      .populate("acceptedByDonorId", "name donorId phone")
      .sort({ acceptedAt: -1 })
      .lean();

    // 3. Requests released/reopened in period (from acceptanceHistory)
    const releasedReqs = await EmergencyRequest.find({
      "acceptanceHistory.releasedAt": { $gte: from, $lte: to },
    }).lean();

    const releasedEvents = [];
    releasedReqs.forEach((r) => {
      (r.acceptanceHistory || []).forEach((h) => {
        if (h.releasedAt && h.releasedAt >= from && h.releasedAt <= to) {
          releasedEvents.push({
            requestNumber: r.requestNumber,
            hospitalName: r.hospitalName,
            bloodGroup: r.bloodGroup,
            donorName: h.donorName,
            donorPublicId: h.donorPublicId,
            acceptedAt: h.acceptedAt,
            releasedAt: h.releasedAt,
            releaseReason: h.releaseReason,
          });
        }
      });
    });

    // 4. Completed donations in period
    const completedReqs = await EmergencyRequest.find({
      status: "fulfilled",
      updatedAt: { $gte: from, $lte: to },
    })
      .populate("patientId", "name patientId")
      .populate("acceptedByDonorId", "name donorId phone")
      .sort({ updatedAt: -1 })
      .lean();

    // 5. Registrations in period
    const userMatch = { createdAt: { $gte: from, $lte: to } };
    if (city && city.trim()) userMatch.city = new RegExp(city.trim(), "i");

    const [patientRegs, donorRegs] = await Promise.all([
      User.countDocuments({ ...userMatch, roles: "patient" }),
      User.countDocuments({ ...userMatch, roles: "donor" }),
    ]);

    return res.json({
      period: { from, to },
      metrics: {
        requestsCreated: requestsCreated.length,
        requestsAccepted: requestsAccepted.length,
        requestsReleased: releasedEvents.length,
        donationsCompleted: completedReqs.length,
        patientRegistrations: patientRegs,
        donorRegistrations: donorRegs,
      },
      requestsCreated,
      requestsAccepted,
      releasedEvents,
      completedDonations: completedReqs,
    });
  } catch (err) {
    console.error("[Admin Date Reports Error]", err.message);
    return res.status(500).json({ error: "Failed to generate date reports." });
  }
});

// ── GET /api/admin/export/:type (Section 7: Complete Export Center) ──
router.get("/export/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { fromDate, toDate, city, bloodGroup, status, id } = req.query;

    let csvContent = "";
    let filename = `bloodguard_${type}_${Date.now()}.csv`;

    // 1. Export All / Filtered Donors
    if (type === "donors") {
      const filter = { roles: "donor" };
      if (bloodGroup) filter.bloodGroup = bloodGroup;
      if (city) filter.city = new RegExp(city.trim(), "i");
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
      }

      const donors = await User.find(filter)
        .select("donorId name phone email bloodGroup city isAvailable totalDonations lastDonationDate createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const headers = [
        "Donor ID",
        "Name",
        "Phone",
        "Email",
        "Blood Group",
        "City",
        "Availability",
        "Eligible (56-Day)",
        "Total Donations",
        "Last Donation Date",
        "Registered Date",
      ];

      const today = new Date();
      const rows = donors.map((d) => {
        const daysSince = d.lastDonationDate
          ? Math.floor((today - new Date(d.lastDonationDate)) / (1000 * 60 * 60 * 24))
          : 999;
        const isEligible = d.isAvailable !== false && daysSince >= 56;
        return [
          `"${d.donorId || ""}"`,
          `"${(d.name || "").replace(/"/g, '""')}"`,
          `"${d.phone || ""}"`,
          `"${d.email || ""}"`,
          `"${d.bloodGroup || ""}"`,
          `"${d.city || "Salem"}"`,
          d.isAvailable ? "Available" : "Unavailable",
          isEligible ? "Eligible" : "Ineligible",
          d.totalDonations || 0,
          `"${d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString("en-IN") : "Never"}"`,
          `"${d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : ""}"`,
        ].join(",");
      });

      csvContent = [headers.join(","), ...rows].join("\n");
    }

    // 2. Export All / Filtered Patients
    else if (type === "patients") {
      const filter = { roles: "patient" };
      if (city) filter.city = new RegExp(city.trim(), "i");
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
      }

      const patients = await User.find(filter)
        .select("patientId name phone email city requestCount createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const headers = [
        "Patient ID",
        "Name",
        "Phone",
        "Email",
        "City",
        "Total Requests",
        "Registered Date",
      ];

      const rows = patients.map((p) => [
        `"${p.patientId || ""}"`,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${p.phone || ""}"`,
        `"${p.email || ""}"`,
        `"${p.city || "Salem"}"`,
        p.requestCount || 0,
        `"${p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : ""}"`,
      ].join(","));

      csvContent = [headers.join(","), ...rows].join("\n");
    }

    // 3. Export All / Filtered Emergency Requests
    else if (type === "requests") {
      const filter = {};
      if (bloodGroup) filter.bloodGroup = bloodGroup;
      if (city) filter.city = new RegExp(city.trim(), "i");
      if (status) filter.status = status;
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
      }

      const reqs = await EmergencyRequest.find(filter)
        .populate("patientId", "name phone patientId")
        .populate("acceptedByDonorId", "name phone donorId")
        .sort({ createdAt: -1 })
        .lean();

      const headers = [
        "Request Number",
        "Patient ID",
        "Patient Name",
        "Blood Group",
        "Units Required",
        "Hospital",
        "City",
        "Status",
        "Accepted Donor Name",
        "Accepted Donor ID",
        "Created Date",
        "Accepted Date",
      ];

      const rows = reqs.map((r) => [
        `"${r.requestNumber || r._id}"`,
        `"${r.patientPublicId || (r.patientId && r.patientId.patientId) || ""}"`,
        `"${(r.patientName || (r.patientId && r.patientId.name) || "").replace(/"/g, '""')}"`,
        `"${r.bloodGroup || ""}"`,
        r.unitsRequired || 1,
        `"${(r.hospitalName || "").replace(/"/g, '""')}"`,
        `"${r.city || "Salem"}"`,
        `"${r.status || ""}"`,
        `"${(r.acceptedByDonorName || (r.acceptedByDonorId && r.acceptedByDonorId.name) || "").replace(/"/g, '""')}"`,
        `"${r.acceptedByDonorPublicId || (r.acceptedByDonorId && r.acceptedByDonorId.donorId) || ""}"`,
        `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : ""}"`,
        `"${r.acceptedAt ? new Date(r.acceptedAt).toLocaleDateString("en-IN") : ""}"`,
      ].join(","));

      csvContent = [headers.join(","), ...rows].join("\n");
      filename = `bloodguard_requests_${Date.now()}.csv`;
    }

    // 4. Export Blood Group Donor Summary
    else if (type === "blood-groups") {
      const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

      const headers = [
        "Blood Group",
        "Total Registered",
        "Available Donors",
        "Eligible Donors (56d)",
        "Unavailable Donors",
        "Ineligible Donors",
        "Total Requests",
        "Accepted Requests",
        "Fulfilled Requests",
      ];

      const rows = await Promise.all(
        bloodGroups.map(async (bg) => {
          const [total, avail, elig, reqTotal, reqAcc, reqFul] = await Promise.all([
            User.countDocuments({ roles: "donor", bloodGroup: bg }),
            User.countDocuments({ roles: "donor", bloodGroup: bg, isAvailable: true }),
            User.countDocuments({
              roles: "donor",
              bloodGroup: bg,
              isAvailable: true,
              $or: [
                { lastDonationDate: null },
                { lastDonationDate: { $exists: false } },
                { lastDonationDate: { $lte: fiftySixDaysAgo } },
              ],
            }),
            EmergencyRequest.countDocuments({ bloodGroup: bg }),
            EmergencyRequest.countDocuments({ bloodGroup: bg, status: "accepted" }),
            EmergencyRequest.countDocuments({ bloodGroup: bg, status: "fulfilled" }),
          ]);
          return [
            `"${bg}"`,
            total,
            avail,
            elig,
            total - avail,
            avail - elig,
            reqTotal,
            reqAcc,
            reqFul,
          ].join(",");
        }),
      );

      csvContent = [headers.join(","), ...rows].join("\n");
    }

    // 4. Export Individual Donor Profile & Request History
    else if (type === "donor-profile" && id) {
      const donor = await User.findById(id).select("-passwordHash").lean();
      if (!donor) return res.status(404).json({ error: "Donor not found" });

      const received = await DonorReceivedRequest.find({ donorId: id })
        .populate("requestId", "hospitalName unitsRequired bloodGroup status createdAt")
        .sort({ sequence: 1 })
        .lean();

      const headers = [
        "Donor Reference",
        "Patient Request Number",
        "Blood Group",
        "Units Required",
        "Hospital",
        "Status",
        "Acceptance Reference",
        "Received Date",
        "Accepted Date",
        "Released Date",
        "Release Reason",
      ];

      const rows = received.map((r) => [
        `"${r.donorReference || ""}"`,
        `"${r.patientRequestNumber || ""}"`,
        `"${r.requestId?.bloodGroup || ""}"`,
        r.requestId?.unitsRequired || 1,
        `"${(r.requestId?.hospitalName || "").replace(/"/g, '""')}"`,
        `"${r.status || ""}"`,
        `"${r.acceptanceReference || ""}"`,
        `"${r.receivedAt ? new Date(r.receivedAt).toLocaleDateString("en-IN") : ""}"`,
        `"${r.acceptedAt ? new Date(r.acceptedAt).toLocaleDateString("en-IN") : ""}"`,
        `"${r.releasedAt ? new Date(r.releasedAt).toLocaleDateString("en-IN") : ""}"`,
        `"${(r.releaseReason || "").replace(/"/g, '""')}"`,
      ].join(","));

      csvContent = [headers.join(","), ...rows].join("\n");
      filename = `donor_${donor.donorId || id}_history.csv`;
    }

    // 5. Export Individual Patient History
    else if (type === "patient-history" && id) {
      const patient = await User.findById(id).select("-passwordHash").lean();
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const reqs = await EmergencyRequest.find({ patientId: id })
        .populate("acceptedByDonorId", "name phone donorId")
        .sort({ createdAt: -1 })
        .lean();

      const headers = [
        "Request Number",
        "Blood Group",
        "Units",
        "Hospital",
        "City",
        "Urgency",
        "Status",
        "Accepted Donor",
        "Donor Phone",
        "Created Date",
      ];

      const rows = reqs.map((r) => [
        `"${r.requestNumber || r._id}"`,
        `"${r.bloodGroup || ""}"`,
        r.unitsRequired || 1,
        `"${(r.hospitalName || "").replace(/"/g, '""')}"`,
        `"${r.city || "Salem"}"`,
        `"${r.urgency || ""}"`,
        `"${r.status || ""}"`,
        `"${(r.acceptedByDonorName || "").replace(/"/g, '""')}"`,
        `"${r.acceptedByDonorPhone || ""}"`,
        `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : ""}"`,
      ].join(","));

      csvContent = [headers.join(","), ...rows].join("\n");
      filename = `patient_${patient.patientId || id}_history.csv`;
    }

    else {
      return res.status(400).json({ error: `Unknown export type: ${type}` });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("\uFEFF" + csvContent);
  } catch (err) {
    console.error("[Admin Export Error]", err.message);
    return res.status(500).json({ error: "Failed to export data." });
  }
});

module.exports = router;
