const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const Hospital = require("../models/Hospital");
const DonorToken = require("../models/DonorToken");
const { normalizeIndianPhone, generatePublicId } = require("../utils/phone");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { runFraudDetection } = require("../services/fraudDetection");
const {
  broadcastEmergencyRequest,
  notifyPatientOfAcceptance,
  notifyOtherDonorsAccepted,
  notifyReleaseAndReopened,
  notifyAdminOfEvent,
} = require("../services/broadcast");
const DonorReceivedRequest = require("../models/DonorReceivedRequest");
const {
  recordDonorReceivedRequest,
  recordDonorAcceptance,
  recordDonorRelease,
  recordDonorDecline,
  recordDonorFulfilled,
} = require("../utils/receivedRequests");
const { getCompatibleDonorGroups } = require("../utils/compatibility");

// ── POST /api/requests ────────────────────────────────────────
// Section 3 & 4: Patient Emergency Request Creation with Sequential Request Numbering
router.post(
  "/",
  authenticateToken,
  requireRole("patient", "admin"),
  upload.single("document"),
  async (req, res) => {
    const {
      bloodGroup,
      unitsRequired,
      urgency = "CRITICAL",
      patientName,
      contactPhone,
      hospitalName,
      state = "Tamil Nadu",
      district = "Salem",
      city = "Salem",
      hospitalId,
      hospitalType,
      additionalNotes,
      requiredDate,
    } = req.body;

    if (!bloodGroup || !unitsRequired || !hospitalName) {
      return res.status(400).json({
        error: "Blood group, units required, and hospital name are required.",
      });
    }

    const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ error: "Invalid blood group." });
    }

    const units = parseInt(unitsRequired);
    if (isNaN(units) || units < 1 || units > 20) {
      return res
        .status(400)
        .json({ error: "Units required must be between 1 and 20." });
    }

    const normalizedContactPhone = normalizeIndianPhone(
      contactPhone || req.user.phone,
    );
    if (!normalizedContactPhone) {
      return res.status(400).json({
        error: "Contact phone must be a valid 10-digit Indian mobile number.",
      });
    }

    // Atomic Sequential Request Number generation per patient (Section 3)
    const patientUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { requestCount: 1 } },
      { new: true },
    );

    let patientPublicId = patientUser.patientId;
    if (!patientPublicId) {
      patientPublicId = await generatePublicId(
        patientUser.phone,
        "PD",
        async (id) => {
          const ex = await User.findOne({
            patientId: id,
            _id: { $ne: patientUser._id },
          }).lean();
          return Boolean(ex);
        },
      );
      patientUser.patientId = patientPublicId;
      await patientUser.save();
    }

    const sequenceFormatted = String(patientUser.requestCount || 1).padStart(
      3,
      "0",
    );
    const requestNumber = `${patientPublicId}-REQ-${sequenceFormatted}`;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestsLast24h = await EmergencyRequest.countDocuments({
      patientId: req.user._id,
      createdAt: { $gte: oneDayAgo },
    });

    // Isolation Forest anomaly screening
    const { anomalyScore, isFlagged, fraudIndicators } =
      await runFraudDetection({
        unitsRequired: units,
        bloodGroup,
        contactPhone: normalizedContactPhone,
        requestsLast24h,
      });

    // Resolve Hospital Record & Verification Status
    let resolvedHospitalId = hospitalId || null;
    let resolvedHospitalType = hospitalType || "Private";
    let resolvedVerificationStatus = "verified";

    if (resolvedHospitalId) {
      const hDoc = await Hospital.findById(resolvedHospitalId).lean();
      if (hDoc) {
        resolvedHospitalType = hDoc.type || "Private";
        resolvedVerificationStatus = hDoc.verificationStatus || "verified";
      }
    } else {
      const existingH = await Hospital.findOne({
        name: new RegExp(`^${hospitalName.trim()}$`, "i"),
        city: new RegExp(`^${city.trim()}$`, "i"),
      });

      if (existingH) {
        resolvedHospitalId = existingH._id;
        resolvedHospitalType = existingH.type || "Private";
        resolvedVerificationStatus = existingH.verificationStatus || "verified";
      } else {
        // Register newly typed unlisted hospital with pending verification
        try {
          const newH = new Hospital({
            name: hospitalName.trim(),
            state: state.trim() || "Tamil Nadu",
            district: district.trim() || city.trim() || "Salem",
            city: city.trim() || "Salem",
            type: hospitalType || "Other",
            verificationStatus: "pending",
            isVerified: false,
            isActive: true,
            createdBy: req.user._id,
            adminNotes: `Submitted via patient emergency request ${requestNumber}`,
          });
          await newH.save();
          resolvedHospitalId = newH._id;
          resolvedHospitalType = newH.type;
          resolvedVerificationStatus = "pending";
        } catch (hErr) {
          console.log("[Request Hospital Auto-Register]", hErr.message);
        }
      }
    }

    const emergencyRequest = new EmergencyRequest({
      requestNumber,
      patientId: req.user._id,
      patientPublicId,
      patientName: patientName || req.user.name,
      contactPhone: normalizedContactPhone,
      bloodGroup,
      unitsRequired: units,
      urgency,
      hospitalName: hospitalName.trim(),
      hospitalId: resolvedHospitalId || undefined,
      hospitalType: resolvedHospitalType,
      hospitalVerificationStatus: resolvedVerificationStatus,
      state: state.trim() || "Tamil Nadu",
      district: district.trim() || "Salem",
      city: city.trim() || "Salem",
      additionalNotes: additionalNotes ? additionalNotes.trim() : undefined,
      requiredDate: requiredDate ? new Date(requiredDate) : undefined,
      documentPath: req.file ? req.file.filename : null,
      documentOriginalName: req.file ? req.file.originalname : null,
      documentMimeType: req.file ? req.file.mimetype : null,
      status: isFlagged ? "suspicious_review" : "broadcasting",
      anomalyScore,
      fraudIndicators,
      isFlagged,
      auditTrail: [
        {
          action: "request_created",
          performedBy: req.user._id,
          performedByRole: req.user.roles ? req.user.roles[0] : req.user.role,
          timestamp: new Date(),
          details: { requestNumber, isFlagged, anomalyScore },
        },
      ],
    });

    await emergencyRequest.save();

    // Notify admin
    await notifyAdminOfEvent({
      request: emergencyRequest.toObject(),
      eventType: isFlagged ? "request_flagged" : "request_created",
      message: isFlagged
        ? `Flagged emergency request ${requestNumber} requires security review.`
        : `New emergency request ${requestNumber} created for ${emergencyRequest.bloodGroup} at ${emergencyRequest.hospitalName}.`,
    });

    // If not flagged, broadcast simultaneously to ALL eligible donors via Fast2SMS
    let broadcastResult = null;
    if (!isFlagged) {
      try {
        broadcastResult = await broadcastEmergencyRequest(emergencyRequest._id);
      } catch (err) {
        console.error("[Broadcast Error]", err.message);
        await EmergencyRequest.findByIdAndUpdate(emergencyRequest._id, {
          status: "broadcasting",
          broadcastTime: new Date(),
        });
      }
    }

    const updatedRequest = await EmergencyRequest.findById(
      emergencyRequest._id,
    ).lean();

    return res.status(201).json({
      message: isFlagged
        ? "Request flagged for security review. A medical officer will verify shortly."
        : `Request verified! Broadcast sent to ${broadcastResult?.eligibleDonorsCount || 0} eligible ${bloodGroup} donors.`,
      request: updatedRequest,
      requestNumber,
      isFlagged,
      anomalyScore,
      fraudIndicators,
      broadcast: broadcastResult,
    });
  },
);

// ── GET /api/requests ─────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  const { user } = req;
  const activeRole = req.headers["x-active-role"] || user.role || "patient";

  let filter = {};

  if (activeRole === "patient") {
    filter.patientId = user._id;
  } else if (activeRole === "donor") {
    filter.$or = [
      {
        status: { $in: ["broadcasting", "accepted"] },
        eligibleDonorIds: user._id,
        declinedDonorIds: { $ne: user._id },
        releasedDonorIds: { $ne: user._id },
      },
      { acceptedByDonorId: user._id },
    ];
  } else if (activeRole === "admin" || (user.roles && user.roles.includes("admin"))) {
    if (req.query.status) filter.status = req.query.status;
    if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
    if (req.query.city) filter.city = new RegExp(req.query.city.trim(), "i");
    if (req.query.flagged === "true") filter.isFlagged = true;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    EmergencyRequest.find(filter)
      .populate("patientId", "name email phone patientId")
      .populate("acceptedByDonorId", "name email phone bloodGroup donorId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmergencyRequest.countDocuments(filter),
  ]);

  // Attach donorReference and mask donor phone for other donors
  if (activeRole === "donor") {
    const receivedRecords = await DonorReceivedRequest.find({
      donorId: user._id,
      requestId: { $in: requests.map((r) => r._id) },
    }).lean();

    const recordMap = new Map();
    receivedRecords.forEach((rec) => {
      recordMap.set(rec.requestId.toString(), rec);
    });

    for (const r of requests) {
      let rec = recordMap.get(r._id.toString());
      if (!rec) {
        // Create stable record if missing
        rec = await recordDonorReceivedRequest(user, r);
      }
      if (rec) {
        r.donorReference = rec.donorReference;
        r.acceptanceReference = rec.acceptanceReference;
      }

      const isWinner =
        r.acceptedByDonorId &&
        (r.acceptedByDonorId._id || r.acceptedByDonorId).toString() ===
          user._id.toString();
      if (!isWinner && r.status === "accepted") {
        r.acceptedByDonorPhone = undefined;
        if (r.acceptedByDonorId && typeof r.acceptedByDonorId === "object") {
          r.acceptedByDonorId.phone = undefined;
        }
      }
    }
  }

  return res.json({
    requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ── GET /api/requests/stats ───────────────────────────────────
router.get("/stats", authenticateToken, async (req, res) => {
  const { user } = req;
  const activeRole = req.headers["x-active-role"] || user.role || "patient";

  if (activeRole === "patient") {
    const [active, pending, fulfilled, total] = await Promise.all([
      EmergencyRequest.countDocuments({
        patientId: user._id,
        status: { $in: ["broadcasting", "accepted"] },
      }),
      EmergencyRequest.countDocuments({
        patientId: user._id,
        status: { $in: ["screening", "suspicious_review"] },
      }),
      EmergencyRequest.countDocuments({
        patientId: user._id,
        status: "fulfilled",
      }),
      EmergencyRequest.countDocuments({ patientId: user._id }),
    ]);
    return res.json({ active, pending, fulfilled, total });
  }

  if (activeRole === "donor") {
    const today = new Date();
    const daysSince = user.lastDonationDate
      ? Math.floor(
          (today - new Date(user.lastDonationDate)) / (1000 * 60 * 60 * 24),
        )
      : 999;
    const isEligible = user.isAvailable && daysSince >= 56;
    const activeAlerts = await EmergencyRequest.countDocuments({
      status: "broadcasting",
      eligibleDonorIds: user._id,
      declinedDonorIds: { $ne: user._id },
      releasedDonorIds: { $ne: user._id },
    });
    return res.json({
      isEligible,
      activeAlerts,
      daysSinceLastDonation: daysSince,
    });
  }

  return res.json({});
});

// ── GET /api/requests/:id ─────────────────────────────────────
router.get("/:id", authenticateToken, async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id)
    .populate("patientId", "name email phone patientId")
    .populate("acceptedByDonorId", "name email phone bloodGroup donorId")
    .lean();

  if (!request) return res.status(404).json({ error: "Request not found." });

  const isPatientOwner =
    request.patientId &&
    (request.patientId._id || request.patientId).toString() ===
      req.user._id.toString();
  const isAdmin = req.user.roles && req.user.roles.includes("admin");
  const isDonorEligible =
    (request.eligibleDonorIds || []).some(
      (dId) => dId.toString() === req.user._id.toString(),
    ) ||
    (request.acceptedByDonorId &&
      (request.acceptedByDonorId._id || request.acceptedByDonorId).toString() ===
        req.user._id.toString());

  if (!isPatientOwner && !isAdmin && !isDonorEligible) {
    return res.status(403).json({ error: "Access denied." });
  }

  return res.json({ request });
});

// ── GET /api/requests/:id/document ────────────────────────────
// Section 15: Secure Document Viewing & Downloads (Strict Authorization)
router.get("/:id/document", authenticateToken, async (req, res) => {
  const request = await EmergencyRequest.findById(req.params.id).lean();
  if (!request) return res.status(404).json({ error: "Request not found." });

  if (!request.documentPath) {
    return res
      .status(404)
      .json({ error: "No prescription document attached to this request." });
  }

  // Authorization check (Section 15):
  // 1. Patient who created request
  // 2. Administrator
  // 3. Registered donor (eligible, accepted, or matching compatibility)
  const isPatientOwner =
    request.patientId &&
    request.patientId.toString() === req.user._id.toString();
  const isAdmin = req.user.roles && req.user.roles.includes("admin");
  const isDonorUser = req.user.roles && req.user.roles.includes("donor");
  const isEligibleDonor =
    (request.eligibleDonorIds || []).some(
      (dId) => dId.toString() === req.user._id.toString(),
    ) ||
    (request.acceptedByDonorId &&
      request.acceptedByDonorId.toString() === req.user._id.toString()) ||
    (isDonorUser &&
      req.user.bloodGroup &&
      getCompatibleDonorGroups(request.bloodGroup).includes(req.user.bloodGroup));

  if (!isPatientOwner && !isAdmin && !isEligibleDonor && !isDonorUser) {
    return res.status(403).json({
      error:
        "Access denied. You are not authorized to view this medical document.",
    });
  }

  // Prevent path traversal and locate file absolutely
  const safeFilename = path.basename(request.documentPath);
  const possiblePaths = [
    path.resolve(__dirname, "../uploads", safeFilename),
    path.resolve(__dirname, "../../uploads", safeFilename),
    path.resolve(process.cwd(), "uploads", safeFilename),
    path.resolve(process.cwd(), "src/backend/uploads", safeFilename),
    process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR, safeFilename) : null,
  ].filter(Boolean);

  const fullPath = possiblePaths.find((p) => fs.existsSync(p));

  if (!fullPath) {
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
  return res.sendFile(fullPath);
});

// ── POST /api/requests/:id/accept ────────────────────────────
// Section 8: Web UI Atomic Acceptance (First-accept-wins)
router.post(
  "/:id/accept",
  authenticateToken,
  requireRole("donor"),
  async (req, res) => {
    const donor = await User.findById(req.user._id);
    if (!donor || !donor.roles.includes("donor")) {
      return res.status(404).json({ error: "Donor account not found." });
    }

    if (!donor.isAvailable) {
      return res.status(400).json({
        error: "Set your availability to AVAILABLE before accepting.",
      });
    }

    if (donor.lastDonationDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSince < 56) {
        return res.status(400).json({
          error: `Not eligible: ${56 - daysSince} days remaining in the 56-day refractory period.`,
        });
      }
    }

    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);
    if (!compatibleGroups.includes(donor.bloodGroup)) {
      return res
        .status(403)
        .json({ error: "Your blood group is not compatible with this emergency request." });
    }

    if (
      request.declinedDonorIds.some(
        (id) => id.toString() === donor._id.toString(),
      )
    ) {
      return res
        .status(409)
        .json({ error: "Your decline response was already recorded." });
    }

    if (
      request.releasedDonorIds.some(
        (id) => id.toString() === donor._id.toString(),
      )
    ) {
      return res.status(409).json({
        error:
          "You previously released this request. Another donor must accept.",
      });
    }

    // Atomic first-accept-wins update
    const updated = await EmergencyRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "broadcasting",
        declinedDonorIds: { $ne: donor._id },
        releasedDonorIds: { $ne: donor._id },
      },
      {
        status: "accepted",
        acceptedByDonorId: donor._id,
        acceptedByDonorName: donor.name,
        acceptedByDonorPhone: normalizeIndianPhone(donor.phone),
        acceptedByDonorPublicId:
          donor.donorId || `DN${String(donor.phone).slice(-5)}`,
        acceptedAt: new Date(),
        $push: {
          acceptanceHistory: {
            donorId: donor._id,
            donorName: donor.name,
            donorPhone: donor.phone,
            donorPublicId:
              donor.donorId || `DN${String(donor.phone).slice(-5)}`,
            acceptedAt: new Date(),
          },
          auditTrail: {
            action: "donor_accepted_via_web",
            performedBy: donor._id,
            performedByRole: "donor",
            timestamp: new Date(),
            details: { requestNumber: request.requestNumber },
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      const existing = await EmergencyRequest.findById(req.params.id).lean();
      return res.status(409).json({
        error: `Request Already Accepted. Another donor (${existing?.acceptedByDonorName || "verified donor"}) has already accepted this emergency request.`,
      });
    }

    // Increment donor total donations
    await User.findByIdAndUpdate(donor._id, { $inc: { totalDonations: 1 } });

    // Record stable donor acceptance reference (DN...-ACC-...)
    const acceptanceRef = await recordDonorAcceptance(donor._id, updated._id);
    if (acceptanceRef) {
      updated.acceptanceReference = acceptanceRef;
    }

    // Mark tokens used
    await DonorToken.updateMany(
      { requestId: request._id, donorId: donor._id },
      { used: true },
    );

    // Section 11: Notify patient
    notifyPatientOfAcceptance({
      request: updated,
      donor: donor.toJSON(),
    }).catch((err) => console.error("[SMS Patient Notify Error]", err.message));

    // Section 9: Notify other eligible donors
    notifyOtherDonorsAccepted({
      request: updated,
      winningDonorId: donor._id,
    }).catch((err) => console.error("[SMS Other Donors Error]", err.message));

    return res.json({
      message: `Thank you! You are now connected with ${updated.hospitalName}. Please coordinate your donation.`,
      request: updated,
    });
  },
);

// ── POST /api/requests/:id/decline ───────────────────────────
router.post(
  "/:id/decline",
  authenticateToken,
  requireRole("donor"),
  async (req, res) => {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    if (request.status !== "broadcasting") {
      return res.status(409).json({
        error: "This request is no longer available for a donor response.",
      });
    }

    const declined = await EmergencyRequest.findOneAndUpdate(
      { _id: request._id, status: "broadcasting" },
      {
        $addToSet: { declinedDonorIds: req.user._id },
        $push: {
          auditTrail: {
            action: "donor_declined_via_web",
            performedBy: req.user._id,
            performedByRole: "donor",
            timestamp: new Date(),
            details: { requestNumber: request.requestNumber },
          },
        },
      },
      { new: true },
    );

    await DonorToken.updateMany(
      { requestId: request._id, donorId: req.user._id },
      { used: true },
    );

    await recordDonorDecline(req.user._id, request._id);

    return res.json({
      message: "Your response has been recorded. The request remains open for other donors.",
      request: declined,
    });
  },
);

// ── POST /api/requests/:id/release ───────────────────────────
// Section 10: Release and Reopen Request
router.post("/:id/release", authenticateToken, async (req, res) => {
  const { reason = "Unable to donate at this time" } = req.body;
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  if (request.status !== "accepted") {
    return res.status(400).json({
      error: `Cannot release request with status "${request.status}". Only accepted requests can be released.`,
    });
  }

  // Authorization: accepted donor or admin
  const isAcceptedDonor =
    request.acceptedByDonorId &&
    request.acceptedByDonorId.toString() === req.user._id.toString();
  const isAdmin = req.user.roles && req.user.roles.includes("admin");

  if (!isAcceptedDonor && !isAdmin) {
    return res.status(403).json({
      error: "Only the accepted donor or an administrator can release this request.",
    });
  }

  const previousDonorId = request.acceptedByDonorId;

  // Atomically release acceptance and record history
  const updated = await EmergencyRequest.findOneAndUpdate(
    { _id: req.params.id, status: "accepted" },
    {
      status: "broadcasting",
      acceptedByDonorId: null,
      acceptedByDonorName: null,
      acceptedByDonorPhone: null,
      acceptedByDonorPublicId: null,
      acceptedAt: null,
      $addToSet: { releasedDonorIds: previousDonorId },
      $push: {
        acceptanceHistory: {
          donorId: previousDonorId,
          donorName: request.acceptedByDonorName,
          donorPhone: request.acceptedByDonorPhone,
          donorPublicId: request.acceptedByDonorPublicId,
          acceptedAt: request.acceptedAt,
          releasedAt: new Date(),
          releasedBy: req.user._id,
          releasedByRole: req.user.roles ? req.user.roles[0] : req.user.role,
          releaseReason: reason.trim(),
        },
        auditTrail: {
          action: "request_released_and_reopened",
          performedBy: req.user._id,
          performedByRole: req.user.roles ? req.user.roles[0] : req.user.role,
          timestamp: new Date(),
          details: { reason, previousDonorId },
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    return res.status(409).json({
      error: "Request is no longer in accepted state.",
    });
  }

  // Section 10: Re-broadcast and notify patient and admin
  await recordDonorRelease(previousDonorId, updated._id, reason);

  notifyReleaseAndReopened({ request: updated, reason }).catch((err) =>
    console.error("[Release Notify Error]", err.message),
  );

  return res.json({
    message: "Request successfully released and reopened for broadcast.",
    request: updated,
  });
});

// ── POST /api/requests/:id/fulfill ───────────────────────────
router.post(
  "/:id/fulfill",
  authenticateToken,
  requireRole("patient", "admin"),
  async (req, res) => {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    if (
      !req.user.roles.includes("admin") &&
      request.patientId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ error: "You can only fulfill your own requests." });
    }

    if (!["accepted", "broadcasting"].includes(request.status)) {
      return res.status(400).json({
        error: `Cannot fulfill a request with status: ${request.status}.`,
      });
    }

    request.status = "fulfilled";
    request.auditTrail.push({
      action: "request_fulfilled",
      performedBy: req.user._id,
      performedByRole: req.user.roles[0],
      timestamp: new Date(),
    });
    await request.save();

    if (request.acceptedByDonorId) {
      await recordDonorFulfilled(request.acceptedByDonorId, request._id);
    }

    return res.json({
      message: "Request marked as fulfilled. Thank you!",
      request,
    });
  },
);

// ── POST /api/requests/:id/cancel ────────────────────────────
router.post(
  "/:id/cancel",
  authenticateToken,
  requireRole("patient", "admin"),
  async (req, res) => {
    const filter = {
      _id: req.params.id,
      status: { $in: ["screening", "suspicious_review", "broadcasting"] },
    };
    if (!req.user.roles.includes("admin")) {
      filter.patientId = req.user._id;
    }

    const request = await EmergencyRequest.findOneAndUpdate(
      filter,
      {
        status: "rejected",
        $push: {
          auditTrail: {
            action: "request_cancelled",
            performedBy: req.user._id,
            performedByRole: req.user.roles[0],
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!request) {
      return res.status(409).json({
        error: "Request not found, not owned by you, or no longer cancellable.",
      });
    }

    await DonorToken.updateMany({ requestId: request._id }, { used: true });
    return res.json({ message: "Request cancelled.", request });
  },
);

module.exports = router;
