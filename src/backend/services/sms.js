const axios = require("axios");
const https = require("https");
const SmsLog = require("../models/SmsLog");
const { normalizeIndianPhone } = require("../utils/phone");

const FAST2SMS_ENDPOINT = "https://www.fast2sms.com/dev/bulkV2";
const httpsAgent = new https.Agent({ rejectUnauthorized: false, family: 4 });

/**
 * Persist an SMS transmission attempt into MongoDB SmsLog.
 * Never stores API keys or raw credentials in the log.
 */
async function persistSmsLog({
  to,
  message,
  provider = "fast2sms",
  status,
  error,
  context = {},
  response,
}) {
  try {
    let sanitizedResponse = null;
    if (response) {
      const respCopy =
        typeof response === "object" ? { ...response } : { data: response };
      if (respCopy.config?.headers?.authorization) {
        delete respCopy.config.headers.authorization;
      }
      sanitizedResponse = respCopy;
    }

    await SmsLog.create({
      requestId: context.requestId || null,
      donorId: context.donorId || null,
      patientId: context.patientId || null,
      recipientPhone: to,
      recipientType: context.recipientType || "unknown",
      direction: "outbound",
      provider,
      messageType: context.messageType || "broadcast",
      status,
      messageSnippet: (message || "").slice(0, 1000),
      providerResponse: sanitizedResponse,
      errorMessage: error || null,
    });
  } catch (logError) {
    console.error(
      "[SMS Log] Failed to persist delivery log:",
      logError.message,
    );
  }
}

/**
 * Ensure message text is clean ASCII and GSM-7 compatible.
 * Strips or converts emojis and Unicode characters to avoid Fast2SMS 416 wallet errors.
 */
function sanitizeSmsText(text) {
  if (!text) return "";
  let clean = String(text)
    .replace(/🚨/g, "[URGENT]")
    .replace(/👉/g, ">")
    .replace(/🩸/g, "[BloodGuard]")
    .replace(/❤️/g, "")
    .replace(/⚠️/g, "[Notice]")
    .replace(/❌/g, "[X]")
    .replace(/✅/g, "[OK]")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ");

  // Remove any remaining non-ASCII characters
  clean = clean.replace(/[^\x20-\x7E\r\n]/g, "").trim();
  return clean;
}

/**
 * Primary SMS sender using Fast2SMS only.
 * Safely deduplicates messages to prevent sending the same notification twice.
 */
async function sendSMS(to, message, context = {}) {
  const provider = "fast2sms";
  const normalizedTo = normalizeIndianPhone(to);
  if (!normalizedTo) {
    const errorMsg = "Recipient must be a valid 10-digit Indian mobile number.";
    await persistSmsLog({
      to: to || "unknown",
      message,
      provider,
      status: "failed",
      error: errorMsg,
      context,
      response: null,
    });
    return {
      success: false,
      provider,
      error: errorMsg,
    };
  }

  // Idempotence & Deduplication check:
  // If this exact notification was already sent successfully, do not resend unless forceRetry is true
  if (context.requestId && context.messageType && !context.forceRetry) {
    const alreadySent = await SmsLog.findOne({
      requestId: context.requestId,
      recipientPhone: normalizedTo,
      messageType: context.messageType,
      status: "sent",
    });

    if (alreadySent) {
      console.log(
        `[Fast2SMS Dedup] Notification (${context.messageType}) for request ${context.requestId} already sent to ${normalizedTo}. Skipping duplicate.`,
      );
      return {
        success: true,
        skipped: true,
        provider,
        message: "Notification already sent previously. Duplicate skipped.",
      };
    }
  }

  const cleanMessage = sanitizeSmsText(message);
  const result = await sendViaFast2SMS(normalizedTo, cleanMessage, context);

  await persistSmsLog({
    to: normalizedTo,
    message: cleanMessage,
    provider,
    status: result.success ? "sent" : "failed",
    error: result.success ? null : result.error,
    context,
    response: result.response || result,
  });

  return result;
}

/**
 * Fast2SMS Gateway integration.
 * Supports DLT route (when template ID is provided) and Quick SMS route ('q').
 * Strictly validates return === true in Fast2SMS response.
 */
async function sendViaFast2SMS(to, message, context = {}) {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    const error =
      "Fast2SMS is not configured. Set FAST2SMS_API_KEY in backend .env.";
    console.warn(`[Fast2SMS] ${error}`);
    return { success: false, provider: "fast2sms", error };
  }

  // Determine if DLT template ID is configured for this message type
  let templateId = null;
  if (context.messageType === "donor_broadcast") {
    templateId = process.env.FAST2SMS_DLT_TEMPLATE_ID_DONOR;
  } else if (context.messageType === "acceptance_patient") {
    templateId = process.env.FAST2SMS_DLT_TEMPLATE_ID_PATIENT;
  } else if (context.messageType === "admin_notice") {
    templateId = process.env.FAST2SMS_DLT_TEMPLATE_ID_ADMIN;
  }

  const senderId = process.env.FAST2SMS_SENDER_ID;
  const cleanMessage = sanitizeSmsText(message);

  let payload;
  if (templateId) {
    payload = {
      route: "dlt",
      sender_id: senderId || undefined,
      message: templateId,
      variables_values: context.variablesValues || "",
      numbers: to,
    };
  } else {
    payload = {
      route: "q",
      message: cleanMessage,
      numbers: to,
    };
  }

  try {
    const response = await axios.post(FAST2SMS_ENDPOINT, payload, {
      headers: {
        authorization: apiKey.trim(),
        "Content-Type": "application/json",
      },
      timeout: 30000,
      httpsAgent,
    });

    const data = response.data;
    if (data && data.return === true) {
      return {
        success: true,
        provider: "fast2sms",
        requestId: data.request_id || null,
        message: Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message,
        response: data,
      };
    }

    const errorMsg =
      (Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message) ||
      `Fast2SMS rejected request with status ${data?.status_code || response.status}.`;

    console.warn(`[Fast2SMS Error] ${errorMsg}`);
    return {
      success: false,
      provider: "fast2sms",
      error: errorMsg,
      response: data,
    };
  } catch (err) {
    const errData = err.response?.data;
    const errorMsg =
      (Array.isArray(errData?.message)
        ? errData.message.join(", ")
        : errData?.message) ||
      err.message ||
      "Unknown Fast2SMS request failure";

    console.warn(`[Fast2SMS Request Error] ${errorMsg}`);
    return {
      success: false,
      provider: "fast2sms",
      error: errorMsg,
      response: errData || null,
    };
  }
}

/**
 * Section 7: Build emergency SMS alert with direct ACCEPT and REJECT action links.
 * Uses clean ASCII to guarantee delivery without Unicode/wallet errors.
 */
function buildDonorSMS({
  request,
  patientName,
  requestNumber,
  bloodGroup,
  unitsRequired,
  hospitalName,
  city = "Salem",
  acceptUrl,
  rejectUrl,
}) {
  const reqNo =
    requestNumber || request?.requestNumber || request?._id || "EMERGENCY";
  const pName = patientName || request?.patientName || "A patient";
  const bGroup = bloodGroup || request?.bloodGroup || "";
  const units = unitsRequired || request?.unitsRequired || 1;
  const hospital = hospitalName || request?.hospitalName || "Hospital";
  const reqCity = city || request?.city || "Salem";

  return [
    `[BloodGuard Alert] Urgent ${bGroup} Needed`,
    `Patient: ${pName} (${reqNo})`,
    `Blood: ${bGroup} (${units} unit${units > 1 ? "s" : ""})`,
    `Hospital: ${hospital}, ${reqCity}`,
    `Respond directly:`,
    `ACCEPT: ${acceptUrl}`,
    `REJECT: ${rejectUrl}`,
    `- BloodGuard Platform`,
  ].join("\n");
}

/**
 * Section 9: Notify other eligible donors that request is already accepted.
 */
function buildOtherDonorsAcceptedSMS({ requestNumber }) {
  return [
    "BloodGuard Update:",
    `Request ${requestNumber} has already been accepted by another donor.`,
    "Thank you for your readiness to save lives.",
    "- BloodGuard Platform",
  ].join("\n");
}

/**
 * Section 10: Notify eligible donors when a previously accepted donor released a request.
 */
function buildRequestReopenedSMS({
  request,
  acceptUrl,
  rejectUrl,
}) {
  const reqNo = request.requestNumber || request._id;
  return [
    "BloodGuard Update:",
    `The previously accepted donor is unable to donate.`,
    `Request ${reqNo} for ${request.bloodGroup} at ${request.hospitalName} is available again.`,
    ``,
    `Respond directly:`,
    `ACCEPT: ${acceptUrl}`,
    `REJECT: ${rejectUrl}`,
    `- BloodGuard Platform`,
  ].join("\n");
}

/**
 * Section 11: Patient acceptance notification SMS.
 */
function buildPatientAcceptanceSMS({ request, donor }) {
  const donorPhone = normalizeIndianPhone(donor.phone) || donor.phone;
  const reqNo = request?.requestNumber || request?._id || "";
  return [
    "BloodGuard Acceptance Confirmed:",
    `Request: ${reqNo}`,
    `Donor: ${donor.name} (${donor.donorId || "Donor"})`,
    `Blood Group: ${donor.bloodGroup}`,
    `Phone: ${donorPhone}`,
    "Please coordinate directly with the donor to proceed with the donation.",
  ].join("\n");
}

/**
 * Section 10: Patient notification when donor releases a request.
 */
function buildPatientReleasedSMS({ requestNumber }) {
  return [
    "BloodGuard Update:",
    `The previously accepted donor was unable to donate.`,
    `Your request ${requestNumber} has been reopened and automatically broadcast to other eligible donors.`,
  ].join("\n");
}

/**
 * Section 11: Admin notification SMS.
 */
function buildAdminNoticeSMS({ request, donor, eventType, reason }) {
  const reqNo = request?.requestNumber || request?._id?.toString() || "N/A";

  if (eventType === "request_accepted" && donor) {
    const donorPhone = normalizeIndianPhone(donor.phone) || donor.phone;
    const acceptedTime = request?.acceptedAt
      ? new Date(request.acceptedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    return [
      "BloodGuard Admin Alert:",
      "Donor Accepted Request",
      `Request ID: ${reqNo}`,
      `Patient: ${request?.patientName || "N/A"}`,
      `Donor: ${donor.name} (${donor.donorId || "DN"})`,
      `Donor Phone: ${donorPhone}`,
      `Blood Group: ${request?.bloodGroup || donor.bloodGroup}`,
      `Hospital: ${request?.hospitalName || "N/A"}`,
      `Time: ${acceptedTime}`,
    ].join("\n");
  }

  if (eventType === "request_released") {
    return [
      "BloodGuard Admin Alert:",
      "Donor Released Request",
      `Request ID: ${reqNo}`,
      `Hospital: ${request?.hospitalName || "N/A"}`,
      `Reason: ${reason || "Unable to donate"}`,
      "Request has been reopened for broadcast.",
    ].join("\n");
  }

  return [
    "BloodGuard Admin Alert:",
    `New Request Created${request?.isFlagged ? " (Flagged)" : ""}`,
    `Request ID: ${reqNo}`,
    `Patient: ${request?.patientName || "N/A"}`,
    `Blood Group: ${request?.bloodGroup || "N/A"}`,
    `Hospital: ${request?.hospitalName || "N/A"}`,
    `Units: ${request?.unitsRequired || 1}`,
  ].join("\n");
}

module.exports = {
  sendSMS,
  sanitizeSmsText,
  buildDonorSMS,
  buildOtherDonorsAcceptedSMS,
  buildRequestReopenedSMS,
  buildPatientAcceptanceSMS,
  buildPatientReleasedSMS,
  buildAdminNoticeSMS,
};
