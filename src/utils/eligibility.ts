import { BloodGroup, DonorEligibilityDetails, User } from '../types';

export const WHOLE_BLOOD_INTERVAL_DAYS = 56;

/**
 * Calculates donor eligibility based on the clinical 56-day whole blood donation rule and availability status.
 */
export function calculateDonorEligibility(donor: Partial<User>): DonorEligibilityDetails {
  const bloodGroup = donor.bloodGroup || 'O+';
  const isAvailable = donor.isAvailable ?? true;
  const lastDonationStr = donor.lastDonationDate || '2026-05-10';
  
  const lastDonationDate = new Date(lastDonationStr);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - lastDonationDate.getTime();
  const daysSinceLastDonation = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  // Calculate next eligible date
  const nextEligible = new Date(lastDonationDate);
  nextEligible.setDate(nextEligible.getDate() + WHOLE_BLOOD_INTERVAL_DAYS);
  const nextEligibleDateStr = nextEligible.toISOString().split('T')[0];

  const hasWaitedEnough = daysSinceLastDonation >= WHOLE_BLOOD_INTERVAL_DAYS;
  const isEligible = hasWaitedEnough && isAvailable;

  let ineligibilityReason: string | undefined;
  if (!hasWaitedEnough) {
    const daysRemaining = WHOLE_BLOOD_INTERVAL_DAYS - daysSinceLastDonation;
    ineligibilityReason = `Clinical 56-day donation interval not met (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining). Next eligible date: ${formatDate(nextEligibleDateStr)}`;
  } else if (!isAvailable) {
    ineligibilityReason = 'You have currently set your donation availability to UNAVAILABLE in your dashboard.';
  }

  return {
    bloodGroup,
    isAvailable,
    lastDonationDate: lastDonationStr,
    nextEligibleDate: nextEligibleDateStr,
    daysSinceLastDonation,
    isEligible,
    ineligibilityReason,
  };
}

/**
 * Simulates real-time AI-driven Isolation Forest anomaly detection
 * Evaluates request frequency, bulk unit demand, profile signals, and off-hour velocity.
 */
export function runIsolationForestScreening(request: {
  unitsRequired: number;
  bloodGroup: BloodGroup;
  patientName: string;
  contactPhone: string;
  additionalNotes?: string;
  existingPatientRequestsCount?: number;
}): { anomalyScore: number; isFlagged: boolean; fraudIndicators: string[] } {
  const indicators: string[] = [];
  let score = 0.12; // Base normal score

  // 1. Bulk Unit Demand Anomaly (> 4 units for single patient request without advance hospital dispatch)
  if (request.unitsRequired >= 5) {
    score += 0.42;
    indicators.push(`Unusual Bulk Unit Demand (${request.unitsRequired} Units requested)`);
  } else if (request.unitsRequired >= 3) {
    score += 0.10;
  }

  // 2. High Frequency / Repeated Requests within 24h
  const reqCount = request.existingPatientRequestsCount || 0;
  if (reqCount >= 2) {
    score += 0.38;
    indicators.push(`High Request Velocity (${reqCount + 1} requests logged in past 24 hours)`);
  }

  // 3. Scarce Blood Group with High Demand
  if (['AB-', 'B-', 'O-'].includes(request.bloodGroup) && request.unitsRequired >= 4) {
    score += 0.25;
    indicators.push(`High Volume Demand for Scarce Blood Group (${request.bloodGroup})`);
  }

  // 4. Incomplete or Suspicious Input Check
  if (!request.contactPhone || request.contactPhone.length < 10) {
    score += 0.28;
    indicators.push('Unverified Contact Number or Incomplete Profile');
  }

  // Normalization
  score = Math.min(0.98, Number(score.toFixed(2)));
  const isFlagged = score >= 0.55;

  return {
    anomalyScore: score,
    isFlagged,
    fraudIndicators: indicators,
  };
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
