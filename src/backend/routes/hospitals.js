const express = require("express");
const router = express.Router();
const Hospital = require("../models/Hospital");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { LOCATION_DATA } = require("../data/locationData");
const { HOSPITALS_SEED_DATA } = require("../data/hospitalSeedData");

// ── Idempotent Seeder for 5 States & 41 Cities ─────────────────
async function ensureAllHospitals() {
  try {
    let insertedCount = 0;
    for (const h of HOSPITALS_SEED_DATA) {
      const exists = await Hospital.findOne({
        name: new RegExp(`^${h.name.trim()}$`, "i"),
        city: new RegExp(`^${h.city.trim()}$`, "i"),
      });

      if (!exists) {
        await Hospital.create({
          name: h.name.trim(),
          country: h.country || "India",
          state: h.state.trim(),
          district: h.district ? h.district.trim() : h.city.trim(),
          city: h.city.trim(),
          type: h.type || "Private",
          address: h.address || undefined,
          contactPhone: h.contactPhone || undefined,
          sourceUrl: h.sourceUrl || undefined,
          verificationStatus: h.verificationStatus || "verified",
          isVerified: h.verificationStatus === "verified",
          isActive: h.isActive !== false,
          adminNotes: h.adminNotes || undefined,
        });
        insertedCount++;
      }
    }
    if (insertedCount > 0) {
      console.log(`[Hospitals] Idempotently seeded ${insertedCount} verified hospitals across 41 cities.`);
    }
  } catch (err) {
    console.error("[Hospitals Seed Error]", err.message);
  }
}

// ── GET /api/hospitals/hierarchy ──────────────────────────────
router.get("/hierarchy", (req, res) => {
  return res.json({
    country: "India",
    states: LOCATION_DATA.states,
  });
});

// ── GET /api/hospitals/states ─────────────────────────────────
router.get("/states", (req, res) => {
  const states = LOCATION_DATA.states.map((s) => s.name);
  return res.json({ states });
});

// ── GET /api/hospitals/districts ──────────────────────────────
router.get("/districts", (req, res) => {
  const stateQuery = req.query.state ? req.query.state.trim().toLowerCase() : "";
  const stateObj = LOCATION_DATA.states.find(
    (s) => s.name.toLowerCase() === stateQuery,
  );

  if (!stateObj) {
    return res.json({ districts: [] });
  }

  const districts = stateObj.districts.map((d) => d.name);
  return res.json({ districts });
});

// ── GET /api/hospitals/cities ─────────────────────────────────
router.get("/cities", (req, res) => {
  const stateQuery = req.query.state ? req.query.state.trim().toLowerCase() : "";
  const districtQuery = req.query.district
    ? req.query.district.trim().toLowerCase()
    : "";

  const stateObj = LOCATION_DATA.states.find(
    (s) => s.name.toLowerCase() === stateQuery,
  );

  if (!stateObj) {
    return res.json({ cities: [] });
  }

  const districtObj = stateObj.districts.find(
    (d) => d.name.toLowerCase() === districtQuery,
  );

  if (!districtObj) {
    // If district not specifically matched, return all cities in that state
    const allCities = stateObj.districts.flatMap((d) => d.cities);
    return res.json({ cities: [...new Set(allCities)] });
  }

  return res.json({ cities: districtObj.cities });
});

// ── GET /api/hospitals/summary (Admin Only) ───────────────────
router.get(
  "/summary",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const [total, verified, pending, needsReview, inactive] =
      await Promise.all([
        Hospital.countDocuments(),
        Hospital.countDocuments({ verificationStatus: "verified", isActive: true }),
        Hospital.countDocuments({ verificationStatus: "pending" }),
        Hospital.countDocuments({ verificationStatus: "needs_review" }),
        Hospital.countDocuments({ isActive: false }),
      ]);

    // Breakdown by state
    const stateBreakdown = await Hospital.aggregate([
      {
        $group: {
          _id: "$state",
          total: { $sum: 1 },
          verified: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$verificationStatus", "verified"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return res.json({
      total,
      verified,
      pending,
      needsReview,
      inactive,
      stateBreakdown,
    });
  },
);

// ── GET /api/hospitals ────────────────────────────────────────
router.get("/", async (req, res) => {
  await ensureAllHospitals();

  const filter = {};

  // Check if admin or explicit filter
  if (req.query.status) {
    filter.verificationStatus = req.query.status;
  } else if (req.query.all !== "true") {
    // By default for public requests, only verified and active hospitals
    filter.verificationStatus = "verified";
    filter.isActive = true;
  }

  if (req.query.state && req.query.state.trim()) {
    filter.state = new RegExp(`^${req.query.state.trim()}$`, "i");
  }
  if (req.query.district && req.query.district.trim()) {
    filter.district = new RegExp(`^${req.query.district.trim()}$`, "i");
  }
  if (req.query.city && req.query.city.trim()) {
    filter.city = new RegExp(`^${req.query.city.trim()}$`, "i");
  }
  if (req.query.type && req.query.type.trim()) {
    filter.type = new RegExp(`^${req.query.type.trim()}$`, "i");
  }
  if (req.query.search && req.query.search.trim()) {
    filter.name = new RegExp(req.query.search.trim(), "i");
  }

  const hospitals = await Hospital.find(filter)
    .sort({ isVerified: -1, verificationStatus: 1, name: 1 })
    .lean();

  return res.json({ hospitals });
});

// ── POST /api/hospitals/custom (Authenticated User) ───────────
// Allows patients/users to register a custom unlisted hospital (saved as "pending")
router.post("/custom", authenticateToken, async (req, res) => {
  const { name, state, district, city, address, contactPhone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Hospital name is required." });
  }

  const cleanName = name.trim();
  const cleanCity = city ? city.trim() : "Salem";
  const cleanState = state ? state.trim() : "Tamil Nadu";
  const cleanDistrict = district ? district.trim() : cleanCity;

  // Check if identical hospital already exists
  const existing = await Hospital.findOne({
    name: new RegExp(`^${cleanName}$`, "i"),
    city: new RegExp(`^${cleanCity}$`, "i"),
  });

  if (existing) {
    return res.json({
      message: "Hospital already exists.",
      hospital: existing,
    });
  }

  const hospital = new Hospital({
    name: cleanName,
    state: cleanState,
    district: cleanDistrict,
    city: cleanCity,
    type: "Other",
    address: address ? address.trim() : undefined,
    contactPhone: contactPhone ? contactPhone.trim() : undefined,
    verificationStatus: "pending",
    isVerified: false,
    isActive: true,
    createdBy: req.user._id,
    adminNotes: "Submitted via patient request / user registration (Pending Review)",
  });

  await hospital.save();

  return res.status(201).json({
    message: "Hospital submitted and recorded with Pending Verification.",
    hospital,
  });
});

// ── POST /api/hospitals (Admin Only) ──────────────────────────
router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const {
      name,
      state = "Tamil Nadu",
      district = "Salem",
      city = "Salem",
      type = "Private",
      address,
      contactPhone,
      sourceUrl,
      verificationStatus = "verified",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Hospital name is required." });
    }

    const existing = await Hospital.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
      city: new RegExp(`^${city.trim()}$`, "i"),
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "A hospital with this name already exists in this city." });
    }

    const hospital = new Hospital({
      name: name.trim(),
      state: state.trim(),
      district: district.trim(),
      city: city.trim(),
      type: type.trim(),
      address: address ? address.trim() : undefined,
      contactPhone: contactPhone ? contactPhone.trim() : undefined,
      sourceUrl: sourceUrl ? sourceUrl.trim() : undefined,
      verificationStatus,
      isVerified: verificationStatus === "verified",
      isActive: true,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    });

    await hospital.save();

    return res.status(201).json({
      message: "Hospital added successfully.",
      hospital,
    });
  },
);

// ── PATCH /api/hospitals/:id/verify (Admin Only) ──────────────
router.patch(
  "/:id/verify",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { verificationStatus, isActive, adminNotes } = req.body;

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found." });
    }

    if (verificationStatus) {
      hospital.verificationStatus = verificationStatus;
      hospital.isVerified = verificationStatus === "verified";
      if (verificationStatus === "verified") {
        hospital.verifiedBy = req.user._id;
        hospital.verifiedAt = new Date();
      }
    }

    if (typeof isActive === "boolean") {
      hospital.isActive = isActive;
    }

    if (adminNotes !== undefined) {
      hospital.adminNotes = adminNotes.trim();
    }

    await hospital.save();

    return res.json({
      message: `Hospital updated to ${hospital.verificationStatus}.`,
      hospital,
    });
  },
);

// ── PUT /api/hospitals/:id (Admin Only) ───────────────────────
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const {
      name,
      state,
      district,
      city,
      type,
      address,
      contactPhone,
      sourceUrl,
      verificationStatus,
      isActive,
      adminNotes,
    } = req.body;

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found." });
    }

    if (name) hospital.name = name.trim();
    if (state) hospital.state = state.trim();
    if (district) hospital.district = district.trim();
    if (city) hospital.city = city.trim();
    if (type) hospital.type = type.trim();
    if (address !== undefined) hospital.address = address ? address.trim() : undefined;
    if (contactPhone !== undefined) hospital.contactPhone = contactPhone ? contactPhone.trim() : undefined;
    if (sourceUrl !== undefined) hospital.sourceUrl = sourceUrl ? sourceUrl.trim() : undefined;
    if (adminNotes !== undefined) hospital.adminNotes = adminNotes ? adminNotes.trim() : undefined;

    if (verificationStatus) {
      hospital.verificationStatus = verificationStatus;
      hospital.isVerified = verificationStatus === "verified";
      if (verificationStatus === "verified" && !hospital.verifiedAt) {
        hospital.verifiedBy = req.user._id;
        hospital.verifiedAt = new Date();
      }
    }

    if (typeof isActive === "boolean") {
      hospital.isActive = isActive;
    }

    await hospital.save();

    return res.json({
      message: "Hospital updated successfully.",
      hospital,
    });
  },
);

module.exports = router;
module.exports.ensureAllHospitals = ensureAllHospitals;
module.exports.ensureSalemHospitals = ensureAllHospitals; // backward compatibility
