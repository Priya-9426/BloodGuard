/**
 * Whole blood compatibility mapping (ABO/Rh).
 * Key: Patient/Recipient Blood Group
 * Value: Array of acceptable Donor Blood Groups
 */
const COMPATIBLE_DONORS = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
};

/**
 * Return compatible donor blood groups for a given patient blood group.
 */
function getCompatibleDonorGroups(patientBloodGroup) {
  return COMPATIBLE_DONORS[patientBloodGroup] || [patientBloodGroup];
}

module.exports = { COMPATIBLE_DONORS, getCompatibleDonorGroups };
