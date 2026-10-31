"""
BloodGuard — Isolation Forest Model Training Script

Trains the Isolation Forest model on synthetic request-level features
derived from behavioral patterns observed in the UCI Blood Transfusion dataset.

IMPORTANT NOTES:
- The UCI Blood Transfusion dataset does NOT contain fraud labels.
  It contains: Recency, Frequency, Monetary (Volume), Time, and Donation outcome.
- We use these aggregate patterns ONLY to generate representative training distributions
  for request-volume and request-frequency features.
- The Isolation Forest is trained on BLOOD REQUEST features — NOT on donor features.
- It NEVER ranks, scores, or filters donors.
"""

import sys
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import joblib
import math
import os
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# ── Paths ─────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
MODEL_PATH = SCRIPT_DIR / "model.pkl"
UCI_DATA_PATH = SCRIPT_DIR / "uci_blood_transfusion.csv"

print("=" * 60)
print("BloodGuard — Isolation Forest Training")
print("=" * 60)


def load_uci_data():
    """
    Load the UCI Blood Transfusion dataset if available.
    UCI dataset columns: Recency, Frequency, Monetary, Time, whether_donated
    These are used ONLY to calibrate the frequency/volume distribution range.
    """
    if UCI_DATA_PATH.exists():
        df = pd.read_csv(UCI_DATA_PATH)
        print(f"✅ UCI dataset loaded: {len(df)} records from {UCI_DATA_PATH.name}")
        # Rename columns for clarity
        df.columns = ['recency_months', 'frequency_donations', 'monetary_cc', 'time_months', 'donated']
        return df
    else:
        print("⚠️  UCI dataset not found. Using synthetic distributions only.")
        print(f"   Expected at: {UCI_DATA_PATH}")
        print("   Run: python download_dataset.py")
        return None


def build_feature_vector(units_requested, requests_last_24h, is_rare_group,
                          has_complete_phone, hour_of_day):
    """Build the 6D feature vector used by the fraud detector."""
    hour_sin = math.sin(2 * math.pi * hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * hour_of_day / 24)
    return [
        units_requested,
        requests_last_24h,
        is_rare_group,
        1 - has_complete_phone,  # Inverted: incomplete profile = 1 (suspicious signal)
        hour_sin,
        hour_cos,
    ]


def generate_training_data(uci_df=None, n_normal=1000, n_anomalous=50, seed=42):
    """
    Generate training samples for the Isolation Forest.
    
    Normal requests: low units (1-3), low frequency, complete profile, daytime hours.
    Anomalous requests: bulk units (5-10), high frequency, incomplete profile, off-hours.

    If UCI data is available, we calibrate n_normal to match proportional donation behavior
    distribution from the dataset (748 records, ~76% positive donation outcome).
    """
    rng = np.random.default_rng(seed)
    
    if uci_df is not None:
        # Use UCI dataset's frequency distribution to calibrate "normal" request frequency range
        freq_stats = uci_df['frequency_donations'].describe()
        print(f"\nUCI Dataset Frequency Stats (used for calibration):")
        print(f"  Mean: {freq_stats['mean']:.1f} | Max: {freq_stats['max']:.0f} | Std: {freq_stats['std']:.1f}")
        # Scale to our request-frequency context (max 24h requests)
        max_normal_freq = min(2, max(1, int(freq_stats['mean'] / 5)))
    else:
        max_normal_freq = 1

    features = []

    # Normal requests
    for _ in range(n_normal):
        units = int(rng.integers(1, 4))                         # 1–3 units (normal range)
        freq = int(rng.integers(0, max_normal_freq + 1))        # 0–1 requests/24h
        is_rare = int(rng.random() < 0.15)                      # 15% are rare blood types
        phone = int(rng.random() < 0.95)                        # 95% complete phone
        hour = int(rng.integers(6, 22))                         # Daytime 6am–10pm
        features.append(build_feature_vector(units, freq, is_rare, phone, hour))

    # Anomalous requests (injected for contrastive training)
    for _ in range(n_anomalous):
        anomaly_type = rng.integers(0, 4)
        if anomaly_type == 0:
            # Bulk unit demand
            units = int(rng.integers(5, 11))
            freq = 0; is_rare = 0; phone = 1; hour = 10
        elif anomaly_type == 1:
            # High request frequency
            units = 2
            freq = int(rng.integers(3, 6))
            is_rare = 0; phone = 1; hour = 12
        elif anomaly_type == 2:
            # Rare group + bulk
            units = int(rng.integers(4, 8))
            is_rare = 1
            freq = 1; phone = 0; hour = 3
        else:
            # Off-hour + incomplete profile
            units = 3; freq = 2
            is_rare = 0; phone = 0
            hour = int(rng.integers(1, 5))
        features.append(build_feature_vector(units, freq, is_rare, phone, hour))

    return np.array(features)


# ── Training ──────────────────────────────────────────────────
uci_df = load_uci_data()
print(f"\nGenerating training data...")
X_train = generate_training_data(uci_df)
print(f"Training samples: {len(X_train)} ({len(X_train) - 50} normal + 50 anomalous)")

model = Pipeline([
    ('scaler', StandardScaler()),
    ('isolation_forest', IsolationForest(
        n_estimators=200,
        contamination=0.05,  # Expect ~5% of requests to be anomalous
        max_samples='auto',
        random_state=42,
        n_jobs=-1,
    ))
])

print(f"\nTraining Isolation Forest...")
model.fit(X_train)

# ── Save Model ────────────────────────────────────────────────
joblib.dump(model, MODEL_PATH)
print(f"✅ Model saved to: {MODEL_PATH}")

# ── Smoke Test ────────────────────────────────────────────────
print("\n── Smoke Tests ──")
test_cases = [
    ("Normal: 2 units, daytime, complete profile",
     build_feature_vector(2, 0, 0, 1, 10)),
    ("Suspicious: 8 units bulk demand",
     build_feature_vector(8, 0, 0, 1, 10)),
    ("Suspicious: 5 requests in 24h",
     build_feature_vector(2, 5, 0, 1, 12)),
    ("Suspicious: Off-hours + incomplete",
     build_feature_vector(3, 2, 0, 0, 3)),
    ("Suspicious: Rare blood + bulk",
     build_feature_vector(6, 0, 1, 0, 2)),
]

for label, vec in test_cases:
    X = np.array([vec])
    raw = model.score_samples(X)[0]
    anomaly_score = max(0.0, min(1.0, (-raw - 0.2) / 0.5))
    prediction = model.predict(X)[0]
    result = "🔴 SUSPICIOUS" if prediction == -1 else "🟢 NORMAL"
    print(f"  {result} (score={anomaly_score:.3f}) | {label}")

print("\n✅ Training complete. Run the FastAPI service:")
print("   cd backend/ml && uvicorn fraud_detector:app --port 5001 --reload")
