"""
BloodGuard — Python Isolation Forest Fraud Detection Microservice
FastAPI app exposed on port 5001.

IMPORTANT:
  - Isolation Forest detects REQUEST anomalies only.
  - It is NEVER used to rank, score, or filter donors.
  - All donor matching is done by strict equality (blood group + 56-day rule).
"""

import os
import math
import logging
import numpy as np
import joblib
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="[ML] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BloodGuard Fraud Detection API",
    description="Isolation Forest anomaly detection for emergency blood requests",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Loading ─────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "model.pkl"
_model = None


def get_model():
    """Load or return cached Isolation Forest model."""
    global _model
    if _model is not None:
        return _model
    if MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
        logger.info(f"Model loaded from {MODEL_PATH}")
    else:
        logger.warning(
            "model.pkl not found. Using rule-based anomaly scoring. "
            "Run train_model.py to generate the model."
        )
    return _model


# ── Request Schema ────────────────────────────────────────────
class RequestFeatures(BaseModel):
    """
    Feature vector for one blood request.
    All features are about the REQUEST — never about donors.
    """
    units_requested: int = Field(..., ge=1, le=20, description="Number of blood units requested")
    requests_last_24h: int = Field(..., ge=0, description="Number of requests from this patient in past 24 hours")
    is_rare_blood_group: int = Field(..., ge=0, le=1, description="1 if rare blood group (AB-, B-, O-) with high demand")
    has_complete_phone: int = Field(..., ge=0, le=1, description="1 if valid phone number, 0 otherwise")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of submission (0-23) for off-hour detection")


class DetectRequest(BaseModel):
    features: RequestFeatures


class DetectResponse(BaseModel):
    anomaly_score: float
    is_anomaly: bool
    features_used: dict
    model_type: str


# ── Feature Engineering ───────────────────────────────────────
def build_feature_vector(f: RequestFeatures) -> np.ndarray:
    """
    Build the 6-dimensional feature vector for the Isolation Forest.

    Features:
      [0] units_requested       — bulk demand
      [1] requests_last_24h     — velocity/frequency
      [2] is_rare_blood_group   — scarce group + high demand
      [3] has_complete_phone    — profile completeness (inverted: 0 = incomplete)
      [4] hour_sin              — cyclical hour encoding (sin)
      [5] hour_cos              — cyclical hour encoding (cos)
    """
    hour_sin = math.sin(2 * math.pi * f.hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * f.hour_of_day / 24)

    return np.array([[
        f.units_requested,
        f.requests_last_24h,
        f.is_rare_blood_group,
        1 - f.has_complete_phone,   # Invert: 1 = incomplete profile (suspicious)
        hour_sin,
        hour_cos,
    ]])


# ── Rule-based Fallback (when model not trained yet) ──────────
def rule_based_score(f: RequestFeatures) -> float:
    """
    Deterministic rule-based anomaly score (0.0–1.0).
    Mirrors expected Isolation Forest behavior before training data is available.
    """
    score = 0.12

    if f.units_requested >= 5:
        score += 0.42
    elif f.units_requested >= 3:
        score += 0.10

    if f.requests_last_24h >= 2:
        score += 0.38

    if f.is_rare_blood_group == 1:
        score += 0.25

    if f.has_complete_phone == 0:
        score += 0.28

    # Off-hour spike (1am–5am)
    if 1 <= f.hour_of_day <= 5:
        score += 0.12

    return min(0.98, round(score, 2))


# ── API Endpoints ─────────────────────────────────────────────
THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.55"))


@app.post("/detect", response_model=DetectResponse)
async def detect_anomaly(body: DetectRequest):
    """
    Detect whether an emergency blood request is anomalous.
    Returns anomaly score (0.0–1.0) and boolean is_anomaly flag.
    """
    f = body.features
    model = get_model()

    if model is not None:
        # Use trained Isolation Forest model
        X = build_feature_vector(f)
        # Isolation Forest: predict returns -1 (anomaly) or 1 (normal)
        # score_samples returns raw anomaly score (more negative = more anomalous)
        raw_score = model.score_samples(X)[0]
        prediction = model.predict(X)[0]

        # Normalize to [0, 1]: lower raw score → higher anomaly score
        # Typical range for IForest scores is roughly [-0.7, 0.2]
        anomaly_score = max(0.0, min(1.0, (-raw_score - 0.2) / 0.5))
        anomaly_score = round(anomaly_score, 3)
        is_anomaly = prediction == -1 or anomaly_score >= THRESHOLD
        model_type = "IsolationForest"
    else:
        # Fallback to rule-based scoring
        anomaly_score = rule_based_score(f)
        is_anomaly = anomaly_score >= THRESHOLD
        model_type = "rule_based_fallback"

    logger.info(
        f"Request screened | model={model_type} | score={anomaly_score:.3f} | "
        f"anomaly={is_anomaly} | units={f.units_requested} | freq={f.requests_last_24h}"
    )

    return DetectResponse(
        anomaly_score=anomaly_score,
        is_anomaly=is_anomaly,
        features_used=f.dict(),
        model_type=model_type,
    )


@app.get("/health")
async def health():
    model = get_model()
    return {
        "status": "ok",
        "service": "BloodGuard Fraud Detection API",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH),
        "threshold": THRESHOLD,
    }


@app.get("/")
async def root():
    return {"service": "BloodGuard Fraud Detection", "version": "1.0.0", "docs": "/docs"}
