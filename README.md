# BloodGuard — Secure & Intelligent Blood Donor Management Framework

> **A Secure and Intelligent Blood Donor Management Framework with AI-Driven Anomaly Detection and Real-Time Emergency Notifications**  
> *Engineered for Engineering Mini-Project & Academic Review / Viva*

---

## 🌐 Quick Start (Zero-Setup)

The application is fully configured and ready to run:

### Option 1: Run Local Server
```bash
node server.js
```
Then open: **[http://localhost:3000](http://localhost:3000)** in any browser.

### Option 2: Direct File Launch
Simply double-click `index.html` to launch the application directly in your browser without requiring any terminal commands or dependencies.

---

## 🩸 Core Mission & Architectural Philosophy

In emergency medicine, every second counts. Traditional platforms suffer from two fatal flaws:
1. **Passive Directory Model**: Seekers must manually search and dial phone numbers one by one, losing precious time during the "golden hour" of trauma care.
2. **Artificial Ranking Bottlenecks**: Complex recommendation algorithms introduce sequential delays, scoring bias, and invasive GPS tracking.

### What BloodGuard Does:
- **Simultaneous Multicast Broadcast**: Alerts **all matching eligible donors at once** via Firebase Cloud Messaging without artificial ranking or tiered delay.
- **AI-Driven Fraud Detection**: Uses an unsupervised **Isolation Forest** machine learning model to detect suspicious request patterns, unusual bulk volume demands, and off-hour submission bursts.
- **Deterministic 56-Day Rule**: Enforces clinical whole blood donation refractory intervals ($\ge 56$ days) and active availability toggles before dispatching alerts.

---

## 🔒 Architectural Guarantees (Zero Algorithmic Bias)

| Feature | Legacy Systems | BloodGuard Framework |
| :--- | :--- | :--- |
| **Notification Model** | Manual 1-by-1 Phone Calls | **Simultaneous Push Broadcast (FCM)** |
| **Donor Prioritization** | Arbitrary Ranking / Scores | **Zero Scoring (Pure Equality)** |
| **Fraud & Abuse Protection** | None (Spam vulnerable) | **Isolation Forest Anomaly Detection** |
| **Medical Eligibility** | Unchecked / Manual | **Automated 56-Day Interval Check** |
| **Location & Privacy** | Continuous GPS Tracking | **Privacy-Preserving (No GPS Required)** |

---

## 🧩 User Portals & Features

1. **Top Viva Demo Controller**:
   - 1-Click persona switching: **Landing Page**, **Patient (Sarah)**, **Donor Alex [O+ Eligible]**, **Donor David [B+ Ineligible]**, **Admin (Dr. Vance)**.
   - Simulation buttons: `+ Sim Normal Req` and `+ Sim Suspicious Req`.

2. **Patient Portal**:
   - Live counters: Active Broadcasts, Under AI Screening, Fulfilled, Total Lifetime.
   - `+ Create Emergency Request` modal with urgency tagging and hospital ward routing.
   - Real-time **Request Lifecycle Timeline** showing live stages from screening to fulfillment.

3. **Donor Portal**:
   - Prominent **Donation Availability Toggle** (`🟢 AVAILABLE / 🔴 UNAVAILABLE`).
   - Dynamic **Donor Eligibility Card** evaluating the 56-day whole blood refractory period.
   - Urgent **Emergency Broadcast Alert Feed** with 1-click acceptance.

4. **Admin Command Center**:
   - **Fraud Review Center**: Real-time queue displaying Isolation Forest anomaly scores and heuristic triggers (*Bulk Demand*, *Velocity Burst*, *Scarce Blood Spike*) with 1-click **Approve** and **Reject** actions.
   - **Hospital Master Registry & Location Reports**: Multi-state registry across 41 cities with verification workflow and city-level analytics.

---

## 🛠️ Technology Stack

- **Frontend**: React.js 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend Architecture**: Node.js, Express.js REST APIs
- **Database Model**: MongoDB with atomic request-locking transactions
- **AI/ML Service**: Python, Scikit-Learn (Isolation Forest for Anomaly Detection)
- **Push Notification Service**: Firebase Cloud Messaging (FCM Multicast Broadcast)

---

## 📂 Project Directory Structure

```
BloodGuard_Miniproject/
├── index.html                  # Standalone self-contained live application
├── server.js                   # Zero-dependency local Node static server
├── package.json                # Project dependencies & scripts
├── tailwind.config.js          # Healthcare design system configuration
├── tsconfig.json               # TypeScript compiler configuration
├── PROJECT_DOCUMENTATION.md    # Comprehensive academic report & viva guide
├── src/
│   ├── types/index.ts          # TypeScript data models & interfaces
│   ├── context/
│   │   └── BloodGuardContext.tsx # State management store & simulation engine
│   ├── utils/
│   │   └── eligibility.ts      # 56-day rule & Isolation Forest scoring logic
│   ├── data/
│   │   └── initialData.ts      # Realistic clinical seed data
│   ├── components/common/
│   │   ├── Navbar.tsx          # Sticky glassmorphic navigation bar
│   │   ├── Sidebar.tsx         # Role-aware dashboard sidebar
│   │   ├── DemoControlBar.tsx  # Top viva simulation bar
│   │   ├── StatusBadge.tsx     # Healthcare status & stock badges
│   │   ├── RequestTimeline.tsx # Real-time visual lifecycle timeline
│   │   ├── Modal.tsx           # Accessible modal dialog wrapper
│   │   ├── ToastContainer.tsx  # Emergency alert toasts
│   │   └── EmptyState.tsx      # Reusable empty states
│   └── pages/
│       ├── LandingPage.tsx     # Hero, 4-step workflow, features, blood matrix
│       ├── PatientDashboard.tsx # Patient portal & tracking
│       ├── DonorDashboard.tsx   # Donor portal, availability toggle, alerts
│       ├── AdminDashboard.tsx   # Admin oversight, fraud queue, hospital registry
│       ├── AuthPages.tsx        # Split-screen Login & 3-step Registration
│       ├── NotificationsPage.tsx # Categorized notification center
│       ├── HowItWorksPage.tsx   # Architectural walkthrough & comparison
│       └── AboutPage.tsx        # Project mission & anti-ranking ethics
```
