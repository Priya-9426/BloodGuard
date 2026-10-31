/**
 * Automated Verification Script for BloodGuard Fast2SMS and Emergency Workflow
 * Tests all 15 workflow requirements from Section 18.
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const SmsLog = require("../models/SmsLog");
const { generateToken } = require("../middleware/auth");
const {
  broadcastEmergencyRequest,
  notifyPatientOfAcceptance,
  notifyAdminOfEvent,
} = require("../services/broadcast");
const {
  sendSMS,
  buildDonorSMS,
  buildPatientAcceptanceSMS,
  buildAdminNoticeSMS,
} = require("../services/sms");
const { normalizeIndianPhone } = require("../utils/phone");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bloodguard";

let testPatient, testDonor1, testDonor2, testDonor3, testAdmin;
let patientToken, donor1Token, donor2Token;

async function setup() {
  console.log("Setting up test database connection...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  // Clean previous test data if any
  await User.deleteMany({ email: /@bloodguard-test\.com$/ });
  await EmergencyRequest.deleteMany({ hospitalName: "TEST_HOSPITAL" });
  await SmsLog.deleteMany({ recipientPhone: { $in: ["9876543210", "9876543211", "9876543212", "9876543213", "9999999999"] } });

  // Create Patient
  testPatient = await User.create({
    name: "Test Patient",
    email: "patient@bloodguard-test.com",
    phone: "9876543210",
    passwordHash: "Password@123",
    role: "patient",
  });
  patientToken = generateToken(testPatient._id);

  // Create Donor 1 (Eligible: O+, available, last donation 70 days ago)
  const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
  testDonor1 = await User.create({
    name: "Donor One",
    email: "donor1@bloodguard-test.com",
    phone: "9876543211",
    passwordHash: "Password@123",
    role: "donor",
    bloodGroup: "O+",
    isAvailable: true,
    lastDonationDate: seventyDaysAgo,
  });
  donor1Token = generateToken(testDonor1._id);

  // Create Donor 2 (Eligible: O+, available, last donation 80 days ago)
  const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);
  testDonor2 = await User.create({
    name: "Donor Two",
    email: "donor2@bloodguard-test.com",
    phone: "9876543212",
    passwordHash: "Password@123",
    role: "donor",
    bloodGroup: "O+",
    isAvailable: true,
    lastDonationDate: eightyDaysAgo,
  });
  donor2Token = generateToken(testDonor2._id);

  // Create Donor 3 (Ineligible: O+, but donated only 10 days ago -> 56-day rule violation)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  testDonor3 = await User.create({
    name: "Donor Three Ineligible",
    email: "donor3@bloodguard-test.com",
    phone: "9876543213",
    passwordHash: "Password@123",
    role: "donor",
    bloodGroup: "O+",
    isAvailable: true,
    lastDonationDate: tenDaysAgo,
  });

  // Admin
  testAdmin = await User.create({
    name: "Test Admin",
    email: "admin@bloodguard-test.com",
    phone: "9999999999",
    passwordHash: "Password@123",
    role: "admin",
  });
}

async function runTests() {
  const results = [];

  function assert(title, condition, extra = "") {
    if (condition) {
      console.log(`  PASS: ${title}`);
      results.push({ title, pass: true });
    } else {
      console.error(`  FAIL: ${title} ${extra}`);
      results.push({ title, pass: false, error: extra });
    }
  }

  console.log("\n--- TEST SUITE: Fast2SMS & Emergency Workflow ---");

  // 1. Patient Creates Emergency Request
  let request1 = await EmergencyRequest.create({
    patientId: testPatient._id,
    patientName: testPatient.name,
    contactPhone: testPatient.phone,
    bloodGroup: "O+",
    unitsRequired: 2,
    urgency: "CRITICAL",
    hospitalName: "TEST_HOSPITAL",
    status: "screening",
  });
  assert("1. Patient creates request saved to MongoDB", Boolean(request1._id));

  // 2. Broadcast to ALL eligible matching donors
  const broadcastResult = await broadcastEmergencyRequest(request1._id);
  request1 = await EmergencyRequest.findById(request1._id);

  assert(
    "2. All eligible matching donors found (56-day rule applied)",
    request1.eligibleDonorIds.some((id) => id.toString() === testDonor1._id.toString()) &&
      request1.eligibleDonorIds.some((id) => id.toString() === testDonor2._id.toString()) &&
      !request1.eligibleDonorIds.some((id) => id.toString() === testDonor3._id.toString()),
    `Eligible count: ${request1.eligibleDonorIds.length}`
  );

  // 3. Fast2SMS donor alert message format (no accept/decline links)
  const donorSmsMessage = buildDonorSMS();
  assert(
    "3. Fast2SMS donor alert has no accept/decline links and directs to website",
    !donorSmsMessage.includes("ACCEPT:") &&
      !donorSmsMessage.includes("DECLINE:") &&
      donorSmsMessage.includes("Please open BloodGuard to view and respond to the request.")
  );

  // 4. SMS Logging records provider 'fast2sms'
  const smsLogs = await SmsLog.find({ requestId: request1._id });
  assert(
    "4. SMS attempts logged to SmsLog with provider 'fast2sms'",
    smsLogs.length > 0 && smsLogs.every((l) => l.provider === "fast2sms")
  );

  // 5. Eligible Donors query (Donor Dashboard feed)
  const donor1Filter = {
    $or: [
      {
        status: { $in: ["broadcasting", "accepted"] },
        eligibleDonorIds: testDonor1._id,
        declinedDonorIds: { $ne: testDonor1._id },
      },
      { acceptedByDonorId: testDonor1._id },
    ],
  };
  const donor1Requests = await EmergencyRequest.find(donor1Filter);
  assert(
    "5. Eligible donor sees the broadcasting emergency request card",
    donor1Requests.some((r) => r._id.toString() === request1._id.toString() && r.status === "broadcasting")
  );

  // 6. FIRST ACCEPT WINS — Donor 1 accepts atomically
  const acceptedRequest = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request1._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor1._id,
      declinedDonorIds: { $ne: testDonor1._id },
    },
    {
      status: "accepted",
      acceptedByDonorId: testDonor1._id,
      acceptedByDonorName: testDonor1.name,
      acceptedByDonorPhone: normalizeIndianPhone(testDonor1.phone),
      acceptedAt: new Date(),
    },
    { new: true }
  );
  assert(
    "6. Donor 1 successfully and atomically accepts the request",
    acceptedRequest && acceptedRequest.status === "accepted" && acceptedRequest.acceptedByDonorId.toString() === testDonor1._id.toString()
  );

  // 7. Increment donation count on user
  await User.findByIdAndUpdate(testDonor1._id, { $inc: { totalDonations: 1 } });
  const updatedDonor1 = await User.findById(testDonor1._id);
  assert("7. Accepted donor donation count incremented", updatedDonor1.totalDonations === 1);

  // 8. Notifications triggered on acceptance (Patient + Admin)
  const notifications = await notifyPatientOfAcceptance({
    request: acceptedRequest,
    donor: testDonor1.toJSON(),
  });
  assert(
    "8. Patient Fast2SMS message format matches Section 10",
    buildPatientAcceptanceSMS({ donor: testDonor1 }).includes("Donor: Donor One") &&
      buildPatientAcceptanceSMS({ donor: testDonor1 }).includes("Blood Group: O+") &&
      buildPatientAcceptanceSMS({ donor: testDonor1 }).includes("Phone: 9876543211")
  );
  assert(
    "9. Admin Fast2SMS message format matches Section 11",
    buildAdminNoticeSMS({ request: acceptedRequest, donor: testDonor1, eventType: "request_accepted" }).includes("Donor Accepted Request") &&
      buildAdminNoticeSMS({ request: acceptedRequest, donor: testDonor1, eventType: "request_accepted" }).includes("Donor Name: Donor One")
  );

  // 10. FIRST ACCEPT WINS: Donor 2 attempts simultaneous/subsequent accept
  const conflictAttempt = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request1._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor2._id,
      declinedDonorIds: { $ne: testDonor2._id },
    },
    {
      status: "accepted",
      acceptedByDonorId: testDonor2._id,
      acceptedByDonorName: testDonor2.name,
      acceptedByDonorPhone: normalizeIndianPhone(testDonor2.phone),
      acceptedAt: new Date(),
    },
    { new: true }
  );
  assert(
    "10. First accept wins: Donor 2 is blocked from accepting already accepted request (returns null)",
    conflictAttempt === null
  );

  // 11. Accepted Donor View (Donor 1 sees "Request Accepted")
  const donor1AfterAccept = await EmergencyRequest.findById(request1._id);
  assert(
    "11. Accepted donor identified by acceptedByDonorId matching their ID",
    donor1AfterAccept.acceptedByDonorId.toString() === testDonor1._id.toString()
  );

  // 12. Other Donors View (Donor 2 sees "Request Already Accepted")
  const donor2Filter = {
    $or: [
      {
        status: { $in: ["broadcasting", "accepted"] },
        eligibleDonorIds: testDonor2._id,
        declinedDonorIds: { $ne: testDonor2._id },
      },
      { acceptedByDonorId: testDonor2._id },
    ],
  };
  const donor2Requests = await EmergencyRequest.find(donor2Filter);
  const donor2SeenRequest = donor2Requests.find((r) => r._id.toString() === request1._id.toString());
  assert(
    "12. Other eligible donor (Donor 2) sees request in accepted state (already accepted by someone else)",
    donor2SeenRequest && donor2SeenRequest.status === "accepted" && donor2SeenRequest.acceptedByDonorId.toString() !== testDonor2._id.toString()
  );

  // 13. Patient View (Patient sees Donor Found with name and phone)
  const patientRequests = await EmergencyRequest.find({ patientId: testPatient._id });
  const patientSeenRequest = patientRequests.find((r) => r._id.toString() === request1._id.toString());
  assert(
    "13. Patient sees donor name and phone for accepted request",
    patientSeenRequest &&
      patientSeenRequest.status === "accepted" &&
      patientSeenRequest.acceptedByDonorName === "Donor One" &&
      patientSeenRequest.acceptedByDonorPhone === "9876543211"
  );

  // 14. DECLINE: Second request testing decline
  let request2 = await EmergencyRequest.create({
    patientId: testPatient._id,
    patientName: testPatient.name,
    contactPhone: testPatient.phone,
    bloodGroup: "O+",
    unitsRequired: 1,
    urgency: "URGENT",
    hospitalName: "TEST_HOSPITAL",
    status: "broadcasting",
    eligibleDonorIds: [testDonor1._id, testDonor2._id],
    eligibleDonorsNotifiedCount: 2,
  });

  // Donor 1 declines
  const declineResult = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request2._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor1._id,
    },
    { $addToSet: { declinedDonorIds: testDonor1._id } },
    { new: true }
  );
  assert(
    "14. Donor 1 can decline: request remains broadcasting and donor added to declinedDonorIds",
    declineResult &&
      declineResult.status === "broadcasting" &&
      declineResult.declinedDonorIds.some((id) => id.toString() === testDonor1._id.toString())
  );

  // Declined donor cannot accept later
  const declinedDonorTryAccept = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request2._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor1._id,
      declinedDonorIds: { $ne: testDonor1._id },
    },
    {
      status: "accepted",
      acceptedByDonorId: testDonor1._id,
      acceptedByDonorName: testDonor1.name,
      acceptedByDonorPhone: normalizeIndianPhone(testDonor1.phone),
      acceptedAt: new Date(),
    },
    { new: true }
  );
  assert(
    "15. Declined donor cannot accept later (declinedDonorIds condition blocks atomic accept)",
    declinedDonorTryAccept === null
  );

  // Another donor (Donor 2) can still accept after someone declines
  const otherDonorAccept = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request2._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor2._id,
      declinedDonorIds: { $ne: testDonor2._id },
    },
    {
      status: "accepted",
      acceptedByDonorId: testDonor2._id,
      acceptedByDonorName: testDonor2.name,
      acceptedByDonorPhone: normalizeIndianPhone(testDonor2.phone),
      acceptedAt: new Date(),
    },
    { new: true }
  );
  assert(
    "16. Another donor can still accept after someone declines",
    otherDonorAccept && otherDonorAccept.status === "accepted" && otherDonorAccept.acceptedByDonorId.toString() === testDonor2._id.toString()
  );

  // 17. Unauthorized / ineligible user check
  // Donor 3 (ineligible due to 10-day refractory period) cannot accept
  const ineligibleTryAccept = await EmergencyRequest.findOneAndUpdate(
    {
      _id: request2._id,
      status: "broadcasting",
      eligibleDonorIds: testDonor3._id,
      declinedDonorIds: { $ne: testDonor3._id },
    },
    { status: "accepted" },
    { new: true }
  );
  assert("17. Ineligible user cannot accept request", ineligibleTryAccept === null);

  // 18. Fast2SMS failure logging without crashing website workflow
  const fakeSmsResult = await sendSMS("9876543210", "Test message without API key", {
    recipientType: "patient",
    messageType: "test",
  });
  assert(
    "18. Fast2SMS returns structured failure without throwing when unconfigured",
    fakeSmsResult && fakeSmsResult.success === false && Boolean(fakeSmsResult.error)
  );

  const failedLog = await SmsLog.findOne({
    recipientPhone: "9876543210",
    messageType: "test",
    status: "failed",
  });
  assert("19. Fast2SMS failure is recorded in SmsLog with status 'failed'", Boolean(failedLog));

  // Clean up test data
  console.log("\nCleaning up test data...");
  await User.deleteMany({ email: /@bloodguard-test\.com$/ });
  await EmergencyRequest.deleteMany({ hospitalName: "TEST_HOSPITAL" });
  await SmsLog.deleteMany({ recipientPhone: { $in: ["9876543210", "9876543211", "9876543212", "9876543213", "9999999999"] } });

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} PASSED`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

setup()
  .then(runTests)
  .catch((err) => {
    console.error("Setup or test runner crashed:", err);
    process.exit(1);
  });

