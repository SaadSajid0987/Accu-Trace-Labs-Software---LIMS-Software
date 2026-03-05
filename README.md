# OpenLab LIMS — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+

## 1. Configure Database
Edit **`backend/.env`** with your PostgreSQL credentials:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/openlab
```

Create the database first:
```bash
psql -U postgres -c "CREATE DATABASE openlab;"
```

## 2. Initialize Database Schema & Seed Data
```bash
cd backend
npm run db:init
```
This creates all tables and loads demo users + test catalog.

## 3. Start Backend
```bash
cd backend
npm run dev
```
API runs on `http://localhost:3001`

## 4. Start Frontend
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:5173`

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@openlab.com | password |
| **Technician** | tech@openlab.com | password |
| **Pathologist** | path@openlab.com | password |

---

## Features
- ✅ Role-based dashboards (Admin / Technician / Pathologist)
- ✅ Patient registration with auto-generated IDs (OL-XXXXXX)
- ✅ Dynamic test catalog with normal ranges
- ✅ Job queue: Pending → Collected → Processing → Completed → Verified
- ✅ Real-time abnormal result highlighting (red)
- ✅ Audit log tracks every result change (old value, new value, user, timestamp)
- ✅ Print-ready PDF reports with jsPDF
- ✅ QR & digital signature placeholders in reports

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/patients | List patients |
| GET | /api/samples | Job queue |
| GET | /api/reports/:id | Report data |
| GET | /api/audit | Audit log |
