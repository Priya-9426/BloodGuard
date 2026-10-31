# BloodGuard Backend

Node.js + Express + MongoDB backend for the BloodGuard Emergency Blood Coordination Platform.

## Prerequisites

- **Node.js** 18+ — https://nodejs.org
- **MongoDB** 6+ — https://www.mongodb.com/try/download/community
- **Python** 3.9+ — https://www.python.org (for Isolation Forest microservice)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
```

Set `FAST2SMS_API_KEY`, `FAST2SMS_SENDER_ID`, `FAST2SMS_DLT_TEMPLATE_ID_DONOR`,
`FAST2SMS_DLT_TEMPLATE_ID_PATIENT`, `FAST2SMS_DLT_TEMPLATE_ID_ADMIN`, and `ADMIN_PHONE`
in `.env`. Enter Indian mobile numbers as 10 digits without `+91`. Fast2SMS is the
configured SMS provider. If FAST2SMS_API_KEY is missing or invalid, SMS attempts
are logged as failed in SmsLog without disrupting website operations. No fake success
responses are ever returned.

### 3. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update MONGO_URI in .env)
```

### 4. Start the Backend

```bash
node server.js
```

The server starts on **http://localhost:4000** and serves the frontend UI.

### 5. (Optional) Start Python Fraud Detection Service

```bash
cd ml
pip install -r requirements.txt
python download_dataset.py    # Download UCI dataset
python train_model.py         # Train Isolation Forest model
uvicorn fraud_detector:app --port 5001 --reload
```

### 6. (Optional) Import UCI Dataset

```bash
node scripts/import_uci_dataset.js
```

## API Endpoints

### Authentication

| Method | Endpoint                  | Description                |
| ------ | ------------------------- | -------------------------- |
| POST   | `/api/auth/register`      | Register new patient/donor |
| POST   | `/api/auth/login`         | Login (returns JWT)        |
| GET    | `/api/auth/me`            | Get current user profile   |
| PATCH  | `/api/auth/me`            | Update profile             |
| PATCH  | `/api/auth/availability`  | Toggle donor availability  |
| PATCH  | `/api/auth/last-donation` | Update last donation date  |

### Emergency Requests

| Method | Endpoint                    | Description                            |
| ------ | --------------------------- | -------------------------------------- |
| POST   | `/api/requests`             | Create request (with document upload)  |
| GET    | `/api/requests`             | List requests (role-filtered)          |
| GET    | `/api/requests/stats`       | Dashboard statistics                   |
| GET    | `/api/requests/:id`         | Get request detail                     |
| POST   | `/api/requests/:id/accept`  | Donor accepts (atomic first-wins)      |
| POST   | `/api/requests/:id/decline` | Donor declines without closing request |
| POST   | `/api/requests/:id/fulfill` | Mark as fulfilled                      |

### Admin

| Method | Endpoint                           | Description             |
| ------ | ---------------------------------- | ----------------------- |
| GET    | `/api/admin/stats`                 | Dashboard statistics    |
| GET    | `/api/admin/requests`              | All requests            |
| POST   | `/api/admin/requests/:id/approve`  | Approve flagged request |
| POST   | `/api/admin/requests/:id/reject`   | Reject flagged request  |
| GET    | `/api/admin/requests/:id/document` | View uploaded document  |
| GET    | `/api/admin/users`                 | All users               |
| PATCH  | `/api/admin/users/:id`             | Update user             |
| GET    | `/api/admin/location-stats`        | Location & hospital metrics |
| GET    | `/api/hospitals`                   | Hospital registry & lookup |
| GET    | `/api/admin/analytics`             | Request/donor analytics    |
| GET    | `/api/admin/dataset/uci-stats`     | UCI dataset analytics   |

### Donor SMS Token Links

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| GET    | `/api/donors/token-accept/:token` | Accept via SMS (no login) |
| GET    | `/api/donors/token-reject/:token` | Reject via SMS (no login) |

## Default Admin Account

- **Email:** admin@bloodguard.health
- **Password:** Admin@123456

⚠️ Change the admin password immediately after first login!

## Architecture

```
Frontend (index.html)
    │  REST API + Multipart Upload
    ▼
backend/server.js (Express, port 4000)
    ├── routes/    → API endpoints
    ├── models/    → Mongoose schemas (MongoDB)
    ├── services/  → FCM, SMS, Broadcast, Fraud Detection
    ├── middleware/ → JWT Auth, Multer Upload, Error Handler
    └── ml/        → Python Isolation Forest (FastAPI, port 5001)
```
