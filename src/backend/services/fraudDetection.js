const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ANOMALY_THRESHOLD = 0.55;

/**
 * Calls the Python Isolation Forest microservice to screen a blood request for anomalies.
 * Returns anomaly score, flagged status, and fraud indicator labels.
 *
 * Features sent to ML model:
 *  - units_requested       → bulk demand signal
 *  - requests_last_24h     → frequency/velocity signal
 *  - is_rare_blood_group   → AB-, B-, O- with high demand = 1, else 0
 *  - has_complete_phone    → contact completeness = 1 if valid phone, else 0
 *  - hour_of_day           → submission hour (0-23) for off-hour detection
 *
 * IMPORTANT: Isolation Forest only screens REQUEST anomalies.
 * It is NEVER used to rank, score, or prioritize donors.
 */
async function runFraudDetection({
  unitsRequired,
  bloodGroup,
  contactPhone,
  requestsLast24h = 0,
}) {
  const RARE_BLOOD_GROUPS = ['AB-', 'B-', 'O-'];
  const hourOfDay = new Date().getHours();

  const features = {
    units_requested: unitsRequired,
    requests_last_24h: requestsLast24h,
    is_rare_blood_group: RARE_BLOOD_GROUPS.includes(bloodGroup) && unitsRequired >= 4 ? 1 : 0,
    has_complete_phone: contactPhone && contactPhone.replace(/\D/g, '').length >= 10 ? 1 : 0,
    hour_of_day: hourOfDay,
  };

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/detect`, { features }, { timeout: 8000 });
    const { anomaly_score, is_anomaly } = response.data;

    const score = Number(anomaly_score.toFixed(2));
    const isFlagged = is_anomaly || score >= ANOMALY_THRESHOLD;

    const indicators = buildFraudIndicators({
      unitsRequired,
      bloodGroup,
      contactPhone,
      requestsLast24h,
      hourOfDay,
    });

    return { anomalyScore: score, isFlagged, fraudIndicators: indicators };
  } catch (err) {
    // If Python service is unreachable, fall back to rule-based detection
    console.warn('[FraudDetection] ML service unavailable. Using rule-based fallback:', err.message);
    return ruleBased({ unitsRequired, bloodGroup, contactPhone, requestsLast24h });
  }
}

/**
 * Rule-based fallback fraud detection (used when Python service is offline).
 * Mirrors the Isolation Forest's expected behavior for demo/dev environments.
 */
function ruleBased({ unitsRequired, bloodGroup, contactPhone, requestsLast24h }) {
  const RARE_BLOOD_GROUPS = ['AB-', 'B-', 'O-'];
  const indicators = buildFraudIndicators({ unitsRequired, bloodGroup, contactPhone, requestsLast24h });

  let score = 0.12;
  if (unitsRequired >= 5) score += 0.42;
  else if (unitsRequired >= 3) score += 0.10;
  if (requestsLast24h >= 2) score += 0.38;
  if (RARE_BLOOD_GROUPS.includes(bloodGroup) && unitsRequired >= 4) score += 0.25;
  if (!contactPhone || contactPhone.replace(/\D/g, '').length < 10) score += 0.28;

  score = Math.min(0.98, Number(score.toFixed(2)));

  return {
    anomalyScore: score,
    isFlagged: score >= ANOMALY_THRESHOLD,
    fraudIndicators: indicators,
  };
}

/**
 * Build human-readable fraud indicator labels.
 */
function buildFraudIndicators({ unitsRequired, bloodGroup, contactPhone, requestsLast24h, hourOfDay }) {
  const RARE_BLOOD_GROUPS = ['AB-', 'B-', 'O-'];
  const indicators = [];

  if (unitsRequired >= 5) {
    indicators.push(`Unusual Bulk Unit Demand (${unitsRequired} units requested)`);
  }
  if (requestsLast24h >= 2) {
    indicators.push(`High Request Velocity (${requestsLast24h + 1} requests in past 24 hours)`);
  }
  if (RARE_BLOOD_GROUPS.includes(bloodGroup) && unitsRequired >= 4) {
    indicators.push(`High Volume Demand for Scarce Blood Group (${bloodGroup})`);
  }
  if (!contactPhone || contactPhone.replace(/\D/g, '').length < 10) {
    indicators.push('Unverified Contact Number or Incomplete Patient Profile');
  }
  if (hourOfDay !== undefined && (hourOfDay >= 1 && hourOfDay <= 5)) {
    indicators.push('Off-Hours Submission (01:00–05:00 local time)');
  }

  return indicators;
}

module.exports = { runFraudDetection };
