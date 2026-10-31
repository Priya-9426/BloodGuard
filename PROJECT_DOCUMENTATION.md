# Smart Blood Donor Finder with Fraud Detection and Automated Emergency Alerts
## Comprehensive Engineering Mini-Project Documentation & Viva Kit

---

### Table of Contents
1. [Project Title & Abstract](#1-project-title--abstract)
2. [Introduction & Background](#2-introduction--background)
3. [Problem Statement](#3-problem-statement)
4. [Project Objectives](#4-project-objectives)
5. [Scope & Strict Non-Functional Constraints](#5-scope--strict-non-functional-constraints)
6. [System Architecture & Data Flow](#6-system-architecture--data-flow)
7. [Detailed Methodology & Core Algorithms](#7-detailed-methodology--core-algorithms)
8. [Module-by-Module Description](#8-module-by-module-description)
9. [Database Schema (MongoDB)](#9-database-schema-mongodb)
10. [Hardware & Software Requirements](#10-hardware--software-requirements)
11. [Viva Q&A Defense Guide](#11-viva-qa-defense-guide)

---

### 1. Project Title & Abstract

#### **Project Title**
**Smart Blood Donor Finder with Fraud Detection and Automated Emergency Alerts** (BloodGuard)

#### **Abstract**
In emergency medical scenarios, timely access to compatible blood donors is a critical determinant of patient survival. Conventional platforms operate as passive directories requiring manual outreach, resulting in critical delays during the golden hour of trauma care. Furthermore, existing systems lack safeguards to detect fraudulent bulk demands or spam.

This project introduces a secure, automated web application built on a **Broadcast Notification Architecture** combined with **Machine Learning-Driven Fraud Detection**. Incoming emergency blood requests are evaluated in real time by an **Isolation Forest anomaly detection algorithm** trained on request velocity, unit demand, profile completeness, and submission timestamps. Genuine requests pass through deterministic **Eligibility Filtering** (verifying exact ABO/Rh blood group compatibility, donor active availability status, and adherence to the medical 56-day whole blood refractory interval). 

Unlike conventional recommendation systems, the platform strictly avoids donor ranking, artificial scoring, or sequential dispatch; instead, it leverages **Firebase Cloud Messaging (FCM)** to broadcast push notifications simultaneously to **all** eligible matching donors. The first donor to accept is directly connected to the patient or medical facility, drastically minimizing emergency latency.

---

### 2. Introduction & Background
Blood donation coordination platforms bridge the gap between voluntary donors and patients requiring urgent transfusions. When emergencies such as road accidents, major surgeries, or postpartum hemorrhages occur, hospitals frequently face acute blood shortages. 

Traditional digital registries list donor phone numbers, placing the burden on anxious relatives or busy healthcare workers to call multiple donors sequentially. If the first several contacts do not answer or are currently unavailable, valuable minutes or hours are lost. 

BloodGuard re-architects emergency blood coordination by combining real-time multicast push notifications with intelligent anomaly detection, ensuring swift, equitable, and secure emergency responses.

---

### 3. Problem Statement
Existing blood donor systems exhibit four major operational flaws:
1. **Passive Directory Latency**: Relies on manual, sequential phone calls.
2. **No Automated Broadcast Mechanism**: Inability to alert all matching donors at the same moment.
3. **Vulnerability to Fake & Abusive Requests**: Lack of automated screening leads to donor fatigue from fraudulent bulk requests.
4. **Unenforced Donation Intervals**: Outdated registries frequently contact donors who have donated recently and are medically ineligible.

---

### 4. Project Objectives
- **Reduce Emergency Identification Time**: Broadcast emergency alerts to all matching donors at once.
- **Maximize Donor Reach**: Ensure no eligible matching donor is overlooked.
- **Automate Fraud Detection**: Flag suspicious submissions using Isolation Forest before alert dispatch.
- **Enforce Medical Safety**: Programmatically check the mandatory 56-day whole blood refractory interval.
- **Provide Administrative Oversight**: Equip hospital officers with a dedicated Fraud Review Center, Hospital Master Registry, and Location Analytics dashboard.

---

### 5. Scope & Strict Non-Functional Constraints
- **In-Scope**:
  - Role-based authentication (Patient, Donor, Admin).
  - Real-time emergency request creation with urgency tagging.
  - Unsupervised anomaly detection via Isolation Forest.
  - Deterministic multi-constraint eligibility filtering.
  - Simultaneous push notification broadcast via Firebase Cloud Messaging.
  - First-to-respond acceptance locking mechanism.
  - Multi-state hospital master registry across 41 cities and location reports.
- **Explicit Out-of-Scope (Design Principles)**:
  - ❌ **NO Donor Ranking or Scoring**: Zero algorithmic bias; all eligible donors are treated equally.
  - ❌ **NO Sequential or Cascading Alerts**: Alerts are dispatched simultaneously to all matching donors.
  - ❌ **NO GPS / Continuous Location Tracking**: Protects donor privacy and battery life.

---

### 6. System Architecture & Data Flow

```
[ Patient / Medical Staff ]
            │
            ▼ (Submits Emergency Request)
[ Express REST API Backend ]
            │
            ▼ (Feature Vector Ingestion)
[ Isolation Forest ML Engine ] ──(Anomaly Score > 0.55)──► [ Admin Fraud Review Queue ]
            │                                                           │
     (Anomaly Score <= 0.55)                                    (Admin Approves)
            │                                                           │
            ▼◄──────────────────────────────────────────────────────────┘
[ Deterministic Eligibility Filter ]
  ├─ 1. Exact Blood Group Match
  ├─ 2. Active Toggle == AVAILABLE
  └─ 3. (Current Date - Last Donation Date) >= 56 Days
            │
            ▼ (Retrieves Eligible Device Tokens)
[ Firebase Cloud Messaging (FCM) ]
            │
            ▼ (Simultaneous Push Broadcast)
[ ALL Matching Eligible Donors (Parallel Delivery) ]
            │
            ▼ (First Donor Accepts Request)
[ Status -> ACCEPTED & Direct Connection Established ]
```

---

### 7. Detailed Methodology & Core Algorithms

#### **Phase 1: Feature Vector Construction for Anomaly Detection**
When a patient submits a request, the system extracts a 5-dimensional feature vector:
$$X = [f_{\text{freq\_24h}},\, u_{\text{units}},\, p_{\text{profile\_complete}},\, t_{\text{hour\_sin}},\, t_{\text{hour\_cos}},\, r_{\text{rare\_group\_flag}}]$$

#### **Phase 2: Isolation Forest Anomaly Scoring**
Isolation Forest isolates anomalies by building an ensemble of Isolation Trees ($iTrees$). Because anomalies have distinct attribute values, they require fewer partitions to isolate:
$$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
Where $E(h(x))$ is the average path length across all $iTrees$, and $c(n)$ is the average path length of unsuccessful searches in a Binary Search Tree of size $n$:
$$c(n) = 2\ln(n - 1) + 0.5772156649 - \frac{2(n - 1)}{n}$$

- **Decision Rule**:
  - If $s(x, n) > 0.55$: Tagged `SUSPICIOUS`, quarantined, and sent to Admin Review.
  - If $s(x, n) \le 0.55$: Classified `NORMAL` and promoted to the broadcast engine.

#### **Phase 3: Deterministic Eligibility Constraint Check**
$$\text{Eligible}(d) = \left( d.\text{blood\_group} = r.\text{blood\_group} \right) \land \left( d.\text{is\_available} = \text{true} \right) \land \left( \Delta t_{\text{donation}} \ge 56 \text{ days} \right)$$

---

### 8. Module-by-Module Description

1. **Authentication Module**: Secure JWT-based access with encrypted password storage and role authorization (`Patient`, `Donor`, `Admin`).
2. **Donor Profile & Availability Module**: Manages blood group records, last donation dates, and real-time availability toggle controls.
3. **Patient Emergency Request Module**: Standardized intake form with unit requirements, urgency tagging, and hospital coordinates.
4. **AI Fraud Detection Module**: Isolation Forest microservice that computes anomaly scores and attaches diagnostic indicator tags.
5. **Eligibility & Broadcast Engine**: Multicast Firebase Cloud Messaging dispatcher.
6. **Admin Dashboard & Fraud Review Center**: Real-time queue for inspecting, approving, or rejecting flagged suspicious requests.
7. **Hospital Registry & Location Reports Module**: Multi-state healthcare registry covering 41 cities with verification workflow and location analytics.

---

### 9. Database Schema (MongoDB)

```json
// USERS COLLECTION
{
  "_id": "ObjectId",
  "name": "Alex Morgan",
  "email": "alex.donor@example.com",
  "phone": "+1 (555) 876-5432",
  "role": "donor",
  "blood_group": "O+",
  "date_of_birth": "1996-04-12",
  "last_donation_date": "2026-05-15T00:00:00.000Z",
  "is_available": true,
  "fcm_token": "fcm_device_token_string",
  "created_at": "2026-01-10T08:00:00.000Z"
}

// EMERGENCY_REQUESTS COLLECTION
{
  "_id": "ObjectId",
  "request_id": "REQ-2026-8801",
  "patient_id": "ObjectId(Users)",
  "patient_name": "Sarah Jenkins",
  "contact_phone": "+1 (555) 234-5678",
  "blood_group": "O+",
  "units_required": 2,
  "urgency": "CRITICAL",
  "hospital_name": "City Emergency Trauma Center, Bay 4",
  "additional_notes": "Immediate whole blood required for bypass surgery.",
  "status": "broadcasting",
  "anomaly_score": 0.14,
  "fraud_indicators": [],
  "is_flagged": false,
  "eligible_donors_notified_count": 14,
  "accepted_by_donor_id": null,
  "created_at": "2026-08-18T17:14:00.000Z"
}
```

---

### 10. Hardware & Software Requirements

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js v18+, Express.js REST Framework
- **Database**: MongoDB v6.0+
- **Machine Learning**: Python 3.9+, Scikit-Learn, NumPy (Isolation Forest)
- **Push Notification Service**: Firebase Cloud Messaging (FCM Admin SDK)
- **Minimum Hardware**: 4 GB RAM, 2.0 GHz Dual-Core CPU, 10 GB Storage

---

### 11. Viva Q&A Defense Guide

#### **Q1: Why did you choose a Broadcast Notification model instead of an AI Donor Ranking or Recommendation system?**
> **Answer:** "In life-or-death emergencies, every second counts. Donor ranking creates an artificial sequential bottleneck where requests are sent in stages or prioritized based on arbitrary historical scores. Furthermore, scoring introduces algorithmic bias and relies on invasive continuous GPS tracking. Our broadcast architecture treats all medically eligible donors equally and dispatches the alert simultaneously via Firebase Cloud Messaging, allowing whichever donor is immediately available to respond without delay."

#### **Q2: Why is Isolation Forest used for fraud detection instead of a supervised classifier like Random Forest or Logistic Regression?**
> **Answer:** "In real-world emergency platforms, fraudulent and abusive blood requests are rare, unlabelled, and diverse (anomalies). Supervised models require large, balanced datasets of confirmed fraudulent requests, which are rarely available. Isolation Forest is an unsupervised algorithm specifically designed for anomaly detection. It isolates abnormal data points (such as sudden bulk unit demands, high 24-hour request velocity, or off-hour bursts) because anomalies require significantly fewer random partition splits in decision trees than normal requests."

#### **Q3: How does the system ensure donors who donated recently are not alerted?**
> **Answer:** "The backend implements a strict mathematical eligibility filter prior to broadcast. It checks the condition `(Current_Date - Last_Donation_Date) >= 56 days` (the clinically established standard for whole blood regeneration). Any donor who has donated within the last 56 days is filtered out before the Firebase notification payload is constructed."

#### **Q4: What happens if two donors click 'Accept Request' at the same time?**
> **Answer:** "The database uses an atomic transaction on the request document. When the first request acceptance arrives, the status transitions from `BROADCASTING` to `ACCEPTED`, binding the donor ID. Any concurrent acceptance attempt detects the updated state, prevents duplicate binding, and presents a polite message that the request has already been fulfilled by another donor."
