const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("express-async-errors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const adminRoutes = require("./routes/admin");
const donorRoutes = require("./routes/donor");
const hospitalRoutes = require("./routes/hospitals");
const EmergencyRequest = require("./models/EmergencyRequest");
const User = require("./models/User");
const { errorHandler } = require("./middleware/errorHandler");
const { generatePublicId } = require("./utils/phone");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// ── Global Middleware ────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(limiter);

// ── Static: Serve the React build; retain legacy page fallback ─
const legacyFrontendPath = path.join(__dirname, "..", "..");
const builtFrontendPath = path.join(legacyFrontendPath, "dist");
const frontendPath = fs.existsSync(path.join(builtFrontendPath, "index.html"))
  ? builtFrontendPath
  : legacyFrontendPath;
app.use(express.static(frontendPath));
app.get("/legacy", (req, res) => {
  const legacyFile = path.join(legacyFrontendPath, "index.legacy.html");
  if (fs.existsSync(legacyFile)) {
    return res.sendFile(legacyFile);
  }
  res.sendFile(path.join(legacyFrontendPath, "index.html"));
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/hospitals", hospitalRoutes);

// Public stats
app.get("/api/public/stats", async (req, res) => {
  const [registeredDonors, fulfilledRequests, activeRequests, totalRequests] =
    await Promise.all([
      User.countDocuments({ roles: "donor" }),
      EmergencyRequest.countDocuments({ status: "fulfilled" }),
      EmergencyRequest.countDocuments({ status: "broadcasting" }),
      EmergencyRequest.countDocuments(),
    ]);
  return res.json({
    registeredDonors,
    fulfilledRequests,
    activeRequests,
    totalRequests,
  });
});

// ── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BloodGuard Backend API",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ── SPA Fallback ─────────────────────────────────────────────
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendPath, "index.html"));
  }
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ── Database Migration & Server Start ────────────────────────
async function migrateLegacyData() {
  try {
    const users = await User.find({});

    for (const u of users) {
      let changed = false;
      const update = {};
      const unset = {};

      // Preserve existing valid roles
      let roles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [];
      if (roles.length === 0) {
        const rawRole = u.get("role");
        if (rawRole === "admin" || u.email === "admin@bloodguard.health") {
          roles = ["admin"];
        } else if (rawRole === "patient") {
          roles = ["patient"];
        } else {
          roles = ["donor"];
        }
        update.roles = roles;
        changed = true;
      }

      const phone = u.phone || "0000000000";

      // 1. Admin
      if (roles.includes("admin")) {
        if (!u.adminId) {
          update.adminId = await generatePublicId(
            phone,
            "AD",
            async (id) => Boolean(await User.findOne({ adminId: id, _id: { $ne: u._id } })),
          );
          changed = true;
        }
        if (u.donorId) {
          unset.donorId = 1;
          changed = true;
        }
        if (u.patientId) {
          unset.patientId = 1;
          changed = true;
        }
      }
      // 2. Patient / Both
      else {
        if (roles.includes("patient") && !u.patientId) {
          update.patientId = await generatePublicId(
            phone,
            "PD",
            async (id) => Boolean(await User.findOne({ patientId: id, _id: { $ne: u._id } })),
          );
          changed = true;
        }
        if (roles.includes("donor") && !u.donorId) {
          update.donorId = await generatePublicId(
            phone,
            "DN",
            async (id) => Boolean(await User.findOne({ donorId: id, _id: { $ne: u._id } })),
          );
          changed = true;
        }
        if (!roles.includes("donor") && u.donorId) {
          unset.donorId = 1;
          changed = true;
        }
        if (!roles.includes("patient") && u.patientId) {
          unset.patientId = 1;
          changed = true;
        }
      }

      if (!u.state) {
        update.state = "Tamil Nadu";
        changed = true;
      }
      if (!u.district) {
        update.district = "Salem";
        changed = true;
      }
      if (!u.city) {
        update.city = "Salem";
        changed = true;
      }

      if (changed) {
        const mongoUpdate = {};
        if (Object.keys(update).length > 0) mongoUpdate.$set = update;
        if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;
        await User.updateOne({ _id: u._id }, mongoUpdate);
      }
    }

    // 1.5 Backfill EmergencyRequests missing state/district/verification status
    const EmergencyRequest = require("./models/EmergencyRequest");
    await EmergencyRequest.updateMany(
      { state: { $exists: false } },
      { $set: { state: "Tamil Nadu", district: "Salem" } },
    );
    await EmergencyRequest.updateMany(
      { hospitalVerificationStatus: { $exists: false } },
      { $set: { hospitalType: "Private", hospitalVerificationStatus: "verified" } },
    );

    // 2. Ensure all 41 cities' verified hospitals exist
    if (hospitalRoutes.ensureAllHospitals) {
      await hospitalRoutes.ensureAllHospitals();
    } else if (hospitalRoutes.ensureSalemHospitals) {
      await hospitalRoutes.ensureSalemHospitals();
    }
  } catch (err) {
    console.error("[Migration Notice]", err.message);
  }
}

async function startServer() {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected:", mongoUri);

    await migrateLegacyData();

    app.listen(PORT, () => {
      console.log(`
======================================================
🩸 BloodGuard Backend API is LIVE!
🚀 API:      http://localhost:${PORT}/api
🌐 Frontend: http://localhost:${PORT}
🛡️  Health:   http://localhost:${PORT}/api/health
======================================================
`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
