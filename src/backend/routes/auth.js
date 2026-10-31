const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { generateToken, authenticateToken } = require("../middleware/auth");
const { normalizeIndianPhone, generatePublicId } = require("../utils/phone");

// Helper to check ID collision in database
async function isPatientIdTaken(candidate, excludeUserId = null) {
  const query = { patientId: candidate };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const existing = await User.findOne(query).select("_id").lean();
  return Boolean(existing);
}

async function isDonorIdTaken(candidate, excludeUserId = null) {
  const query = { donorId: candidate };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const existing = await User.findOne(query).select("_id").lean();
  return Boolean(existing);
}

async function isAdminIdTaken(candidate, excludeUserId = null) {
  const query = { adminId: candidate };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const existing = await User.findOne(query).select("_id").lean();
  return Boolean(existing);
}

// ── POST /api/auth/register ──────────────────────────────────
router.post("/register", async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    roles: incomingRoles,
    bloodGroup,
    dateOfBirth,
    lastDonationDate,
    isAvailable = true,
    state = "Tamil Nadu",
    district = "Salem",
    city = "Salem",
    hospitalAffiliation,
  } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      error: "Name, email, phone, and password are required.",
    });
  }

  // Parse and normalize roles: accept either roles array or role string
  let parsedRoles = [];
  if (Array.isArray(incomingRoles) && incomingRoles.length > 0) {
    parsedRoles = [...new Set(incomingRoles)];
  } else if (typeof role === "string" && role.trim()) {
    if (role === "both" || role === "patient,donor") {
      parsedRoles = ["patient", "donor"];
    } else {
      parsedRoles = [role.trim().toLowerCase()];
    }
  }

  if (parsedRoles.length === 0) {
    return res.status(400).json({
      error: 'Please select an account type: "patient", "donor", or both.',
    });
  }

  // Security: users cannot register themselves as admin
  if (parsedRoles.includes("admin")) {
    return res.status(403).json({
      error: "Administrator accounts cannot be registered publicly.",
    });
  }

  // Validate only allowed roles
  const allowedRegistrationRoles = ["patient", "donor"];
  const isValid = parsedRoles.every((r) =>
    allowedRegistrationRoles.includes(r),
  );
  if (!isValid) {
    return res.status(400).json({
      error: 'Invalid role selection. Must be "patient", "donor", or both.',
    });
  }

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({
      error: "Phone must be a valid 10-digit Indian mobile number.",
    });
  }

  const isDonor = parsedRoles.includes("donor");
  const isPatient = parsedRoles.includes("patient");

  if (isDonor && !bloodGroup) {
    return res.status(400).json({
      error: "Blood group is required for donor registration.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long.",
    });
  }

  // Uniqueness check: email & phone
  const existingEmail = await User.findOne({
    email: email.toLowerCase().trim(),
  }).lean();
  if (existingEmail) {
    return res.status(409).json({
      error: "An account with this email already exists.",
    });
  }

  const existingPhone = await User.findOne({ phone: normalizedPhone }).lean();
  if (existingPhone) {
    return res.status(409).json({
      error:
        "An account with this phone number already exists. Please sign in.",
    });
  }

  // Generate public Patient ID ("PD" + last 5 digits) and Donor ID ("DN" + last 5 digits)
  // Safely handles collisions with deterministic fallback (-2, -3, etc.)
  let patientId = null;
  if (isPatient) {
    patientId = await generatePublicId(
      normalizedPhone,
      "PD",
      isPatientIdTaken,
    );
  }

  let donorId = null;
  if (isDonor) {
    donorId = await generatePublicId(normalizedPhone, "DN", isDonorIdTaken);
  }

  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: normalizedPhone,
    passwordHash: password, // Hashed by pre-save hook
    roles: parsedRoles,
    patientId,
    donorId,
    state: (state && state.trim()) || "Tamil Nadu",
    district: (district && district.trim()) || "Salem",
    city: (city && city.trim()) || "Salem",
    bloodGroup: isDonor ? bloodGroup : undefined,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : undefined,
    isAvailable: isDonor ? Boolean(isAvailable) : undefined,
    hospitalAffiliation,
  });

  await user.save();

  const token = generateToken(user._id);

  return res.status(201).json({
    message: "Registration successful.",
    token,
    user: user.toJSON(),
  });
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Legacy data migration: ensure roles array and public IDs exist
  let needsSave = false;
  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    user.roles = [user.get("role") || "donor"];
    needsSave = true;
  }

  const isAdmin = user.roles.includes("admin");

  if (isAdmin) {
    // Admin gets a special adminId: "AD" + last 5 digits of mobile stored in DB
    if (!user.adminId) {
      user.adminId = await generatePublicId(
        user.phone,
        "AD",
        (id) => isAdminIdTaken(id, user._id),
      );
      needsSave = true;
    }
  } else {
    // Only patient/donor accounts get phone-based IDs
    if (user.roles.includes("patient") && !user.patientId) {
      user.patientId = await generatePublicId(
        user.phone,
        "PD",
        (id) => isPatientIdTaken(id, user._id),
      );
      needsSave = true;
    }

    if (user.roles.includes("donor") && !user.donorId) {
      user.donorId = await generatePublicId(
        user.phone,
        "DN",
        (id) => isDonorIdTaken(id, user._id),
      );
      needsSave = true;
    }
  }

  if (needsSave) {
    await User.updateOne({ _id: user._id }, { $set: {
      roles: user.roles,
      ...(user.adminId  ? { adminId:  user.adminId  } : {}),
      ...(user.patientId ? { patientId: user.patientId } : {}),
      ...(user.donorId   ? { donorId:   user.donorId   } : {}),
    }});
    // Reload to get clean object
    const reloaded = await User.findById(user._id);
    if (reloaded) Object.assign(user, reloaded.toObject());
  }

  const token = generateToken(user._id);

  return res.json({
    message: "Login successful.",
    token,
    user: user.toJSON(),
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found." });

  const isAdmin = user.roles.includes("admin");
  let needsSave = false;

  if (isAdmin) {
    if (!user.adminId) {
      user.adminId = await generatePublicId(
        user.phone,
        "AD",
        (id) => isAdminIdTaken(id, user._id),
      );
      needsSave = true;
    }
  } else {
    if (user.roles.includes("patient") && !user.patientId) {
      user.patientId = await generatePublicId(
        user.phone,
        "PD",
        (id) => isPatientIdTaken(id, user._id),
      );
      needsSave = true;
    }
    if (user.roles.includes("donor") && !user.donorId) {
      user.donorId = await generatePublicId(
        user.phone,
        "DN",
        (id) => isDonorIdTaken(id, user._id),
      );
      needsSave = true;
    }
  }

  if (needsSave) await User.updateOne({ _id: user._id }, { $set: {
    ...(user.adminId   ? { adminId:   user.adminId   } : {}),
    ...(user.patientId ? { patientId: user.patientId } : {}),
    ...(user.donorId   ? { donorId:   user.donorId   } : {}),
  }});

  return res.json({ user: user.toJSON() });
});

// ── PATCH /api/auth/me ────────────────────────────────────────
router.patch("/me", authenticateToken, async (req, res) => {
  const allowed = ["name", "city", "hospitalAffiliation", "fcmToken"];
  const updates = {};

  if (req.body.phone !== undefined) {
    const phone = normalizeIndianPhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({
        error: "Phone must be a valid 10-digit Indian mobile number.",
      });
    }
    // Check if phone belongs to another user
    const existing = await User.findOne({
      phone,
      _id: { $ne: req.user._id },
    }).lean();
    if (existing) {
      return res.status(409).json({
        error: "This phone number is already registered to another user.",
      });
    }
    updates.phone = phone;
  }

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (req.body.newPassword) {
    if (!req.body.currentPassword) {
      return res.status(400).json({
        error: "Current password is required to change password.",
      });
    }
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(req.body.currentPassword);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
    if (req.body.newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters.",
      });
    }
    user.passwordHash = req.body.newPassword;
    await user.save();
    return res.json({ message: "Password updated successfully." });
  }

  const updated = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  return res.json({ message: "Profile updated.", user: updated.toJSON() });
});

// ── PATCH /api/auth/availability ──────────────────────────────
router.patch("/availability", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.roles.includes("donor")) {
    return res.status(403).json({
      error: "Only donors can update donation availability.",
    });
  }

  const { isAvailable } = req.body;
  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({
      error: "isAvailable must be a boolean value.",
    });
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { isAvailable },
    { new: true },
  );

  return res.json({
    message: `Availability set to ${isAvailable ? "AVAILABLE" : "UNAVAILABLE"}.`,
    isAvailable: updated.isAvailable,
  });
});

// ── PATCH /api/auth/last-donation ─────────────────────────────
router.patch("/last-donation", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || !user.roles.includes("donor")) {
    return res.status(403).json({
      error: "Only donors can update last donation date.",
    });
  }

  const { lastDonationDate } = req.body;
  if (!lastDonationDate) {
    return res.status(400).json({ error: "lastDonationDate is required." });
  }

  const date = new Date(lastDonationDate);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "Invalid date format." });
  }

  if (date > new Date()) {
    return res.status(400).json({
      error: "Last donation date cannot be in the future.",
    });
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { lastDonationDate: date },
    { new: true },
  );

  return res.json({
    message: "Last donation date updated. 56-day rule recalculated.",
    lastDonationDate: updated.lastDonationDate,
  });
});

router.isPatientIdTaken = isPatientIdTaken;
router.isDonorIdTaken = isDonorIdTaken;

module.exports = router;
