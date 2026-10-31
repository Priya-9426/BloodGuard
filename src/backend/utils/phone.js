function normalizeIndianPhone(value) {
  if (value === undefined || value === null) return null;

  const digits = String(value).replace(/\D/g, "");
  const localNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  return /^[6-9]\d{9}$/.test(localNumber) ? localNumber : null;
}

/**
 * Generate a deterministic public ID from the last 5 digits of the phone number.
 * Patient ID prefix: "PD" -> e.g. "PD12345"
 * Donor ID prefix: "DN" -> e.g. "DN12345"
 * If collision occurs (another user has the same base ID), appends "-2", "-3", etc.
 */
async function generatePublicId(phone, prefix, isTakenFn) {
  const normalized = normalizeIndianPhone(phone) || String(phone).replace(/\D/g, "");
  const last5 = (normalized.length >= 5 ? normalized.slice(-5) : normalized.padStart(5, "0"));
  const baseId = `${prefix}${last5}`;

  if (!isTakenFn) return baseId;

  let candidate = baseId;
  let counter = 1;
  while (await isTakenFn(candidate)) {
    counter++;
    candidate = `${baseId}-${counter}`;
  }
  return candidate;
}

module.exports = { normalizeIndianPhone, generatePublicId };
