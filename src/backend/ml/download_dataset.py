"""
BloodGuard — UCI Blood Transfusion Dataset Downloader

Dataset: Blood Transfusion Service Center
Source:  UCI Machine Learning Repository
URL:     https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center
Records: 748 donor records
License: CC BY 4.0

IMPORTANT DATA PROVENANCE NOTICE:
  The UCI Blood Transfusion dataset contains:
    - Recency (months since last donation)
    - Frequency (total number of donations)
    - Monetary (total blood donated in c.c.)
    - Time (months since first donation)
    - Whether the donor donated in March 2007 (target variable, 0 or 1)
    
  It does NOT contain:
    - Donor names, phone numbers, or email addresses
    - Blood groups (ABO/Rh typing)
    - Donor availability status
    - Hospital or patient information
    - Emergency request data
    - Fraud labels
    
  This dataset is used ONLY for:
    - Donation behavior analysis (frequency, recency, volume patterns)
    - Calibrating the Isolation Forest training data distributions
    - Academic reference and provenance in the BloodGuard project documentation
    
  BloodGuard-specific fields (blood group, phone, availability, etc.)
  are collected during actual donor registration and stored separately in MongoDB.
"""

import sys
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import urllib.request
import zipfile
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "uci_blood_transfusion.csv"

# UCI ML Repository direct download URL for this dataset
DATASET_URL = "https://archive.ics.uci.edu/static/public/176/blood+transfusion+service+center.zip"

print("=" * 60)
print("BloodGuard — UCI Blood Transfusion Dataset Downloader")
print("=" * 60)
print("\nDataset: Blood Transfusion Service Center")
print("Source:  https://archive.ics.uci.edu/dataset/176")
print("Records: 748 donor records | License: CC BY 4.0")
print()


def download_dataset():
    if OUTPUT_PATH.exists():
        print(f"✅ Dataset already present: {OUTPUT_PATH}")
        print("   Delete the file to re-download.")
        return

    zip_path = SCRIPT_DIR / "uci_temp.zip"
    print("Downloading dataset from UCI ML Repository...")

    try:
        urllib.request.urlretrieve(DATASET_URL, zip_path)
        print("✅ Downloaded successfully.")

        # Extract CSV from zip
        with zipfile.ZipFile(zip_path, 'r') as z:
            # The file inside is typically 'transfusion.data'
            csv_files = [f for f in z.namelist() if f.endswith('.data') or f.endswith('.csv')]
            if not csv_files:
                print("❌ No CSV/data file found in ZIP. Manual download may be required.")
                print(f"   Please download manually from: {DATASET_URL}")
                return

            target_file = csv_files[0]
            print(f"Extracting: {target_file}")

            with z.open(target_file) as src, open(OUTPUT_PATH, 'wb') as dst:
                shutil.copyfileobj(src, dst)

        zip_path.unlink()  # Clean up temp zip

        print(f"✅ Dataset saved to: {OUTPUT_PATH}")

    except Exception as e:
        print(f"❌ Download failed: {e}")
        print()
        print("Manual download instructions:")
        print(f"  1. Visit: https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center")
        print(f"  2. Download the dataset ZIP file")
        print(f"  3. Extract 'transfusion.data' and rename it to:")
        print(f"     {OUTPUT_PATH}")
        if zip_path.exists():
            zip_path.unlink()
        return

    # Show summary
    import csv
    with open(OUTPUT_PATH, 'r') as f:
        rows = list(csv.reader(f))
    print(f"\n✅ Dataset summary:")
    print(f"   Rows: {len(rows) - 1} records (1 header)")
    print(f"   Columns: {rows[0]}")
    print()
    print("DATA PROVENANCE REMINDER:")
    print("  This dataset does NOT contain blood groups, names, phones, or fraud labels.")
    print("  It is used ONLY for donation-behavior analysis and IForest calibration.")


download_dataset()
print("\nNext step: python train_model.py")
