# BloodGuard — Data Provenance & Dataset Documentation

## 1. Primary Public Dataset

### Blood Transfusion Service Center Dataset

| Field          | Value                                                                 |
|----------------|-----------------------------------------------------------------------|
| **Dataset Name** | Blood Transfusion Service Center                                   |
| **Source**       | UCI Machine Learning Repository                                    |
| **URL**          | https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center |
| **Records**      | 748 real donor records                                             |
| **License**      | CC BY 4.0                                                          |
| **Citation**     | Yeh, I-Cheng. (2008). Blood Transfusion Service Center. UCI ML Repository. |

### Fields Present in the UCI Dataset

| Column Name       | Description                                   | Data Type |
|-------------------|-----------------------------------------------|-----------|
| `Recency`         | Months since last donation                   | Integer   |
| `Frequency`       | Total number of donations                    | Integer   |
| `Monetary`        | Total blood donated in cubic centimeters     | Integer   |
| `Time`            | Months since first donation                  | Integer   |
| `whether_donated` | Donated in March 2007 (0 = No, 1 = Yes)     | Binary    |

### Fields NOT Present in the UCI Dataset

The following fields are **NOT contained** in the public UCI dataset and are **NOT fabricated**:

- ❌ Donor names or personal identity information
- ❌ Phone numbers, email addresses, or contact information
- ❌ Blood groups (ABO/Rh typing such as A+, O-, B+, etc.)
- ❌ Donor availability status
- ❌ Hospital or patient information
- ❌ Emergency request data
- ❌ Fraud labels or anomaly annotations
- ❌ Geographic location or GPS coordinates
- ❌ Medical prescriptions or hospital documents

### How This Dataset is Used in BloodGuard

1. **Donation Behavior Analysis** — The Recency, Frequency, Monetary, and Time fields provide
   real statistical distributions of donor behavior patterns (e.g., average donation frequency,
   donation lapse intervals, volume patterns).

2. **Isolation Forest Training Calibration** — The dataset's frequency and volume distributions
   are used to calibrate the synthetic training data for the Isolation Forest anomaly detection
   model. This ensures that the model's "normal behavior" baseline reflects real-world
   donation patterns rather than arbitrary numbers.

3. **Academic Reference** — The dataset is cited in project documentation to demonstrate the
   use of a legitimate, publicly documented research dataset.

### What This Dataset is NOT Used For

- ❌ It is **NOT** used to provide blood group information for donors.
- ❌ It is **NOT** used to provide contact details for donors.
- ❌ The `whether_donated` target variable is **NOT** treated as a fraud label.
- ❌ It is **NOT** used to rank, score, or prioritize donors.
- ❌ It is **NOT** used to replace BloodGuard application registration data.

---

## 2. Data Separation Architecture

BloodGuard maintains strict separation between public dataset records and application data:

### MongoDB Collections

| Collection           | Source                   | Purpose                              |
|----------------------|--------------------------|--------------------------------------|
| `users`              | BloodGuard Registration  | App user accounts (name, phone, email, password, blood group, availability) |
| `donor_history_uci`  | UCI Public Dataset       | Imported 748 records (recency, frequency, monetary, time, donated) |
| `emergencyrequests`  | BloodGuard Application   | Patient emergency blood requests     |
| `hospitals`          | BloodGuard Master Data   | Multi-state hospital registry across 41 cities |
| `donortokens`        | BloodGuard Application   | Secure SMS accept/reject tokens      |

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│         ORIGINAL DATASET FIELDS                      │
│  (UCI Blood Transfusion Service Center)              │
│  Recency, Frequency, Monetary, Time, Donated         │
│  → Stored in: donor_history_uci collection           │
│  → Used for: behavior analysis, ML calibration       │
│  → NEVER overwritten by application data             │
└──────────────────────┬──────────────────────────────┘
                       │ Analysis / Calibration
                       ▼
┌─────────────────────────────────────────────────────┐
│         BLOODGUARD APPLICATION FIELDS                │
│  (Collected during donor registration)               │
│  Name, Phone, Email, Password, Blood Group,          │
│  Date of Birth, Last Donation Date, Availability     │
│  → Stored in: users collection                       │
│  → Used for: authentication, matching, broadcast     │
│  → Completely independent from UCI data              │
└─────────────────────────────────────────────────────┘
```

---

## 3. Future Dataset Integration: REDS-II

### About REDS-II

| Field          | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Full Name**  | Retrovirus Epidemiology Donor Study – II (REDS-II)                 |
| **Source**     | National Heart, Lung, and Blood Institute (NHLBI)                  |
| **URL**        | https://biolincc.nhlbi.nih.gov/studies/core/                       |
| **Access**     | Restricted — requires formal data use agreement (DUA)              |

### Integration Readiness

The BloodGuard architecture is designed to accommodate REDS-II data when access is granted:

1. **Separate Collection** — REDS-II data will be stored in its own MongoDB collection
   (e.g., `donor_history_reds`), completely separate from both UCI data and app data.

2. **Schema Extensible** — The `DonorHistory` model pattern used for UCI data can be
   cloned for REDS-II with appropriate field mappings.

3. **No Field Fabrication** — Only fields actually present in the REDS-II dataset will be
   imported. Missing fields will remain as application-specific MongoDB fields.

4. **Access Compliance** — REDS-II access requires IRB approval and signed DUA. The import
   script will include access verification before importing.

---

## 4. Ethical Data Usage Statement

- All public datasets are used in compliance with their stated licenses (CC BY 4.0 for UCI).
- No personal identifying information is fabricated or generated.
- Dataset limitations are clearly documented and communicated.
- The system does not falsely claim that public datasets contain fields they do not contain.
- Application-specific data (blood group, phone, availability) is collected only through
  legitimate user registration on the BloodGuard platform.
