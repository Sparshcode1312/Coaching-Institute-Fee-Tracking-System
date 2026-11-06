# Chunk 5 — Automation, Refunds, Reporting & AI Architecture Report

## 1. Executive Summary

This document details the backend implementation for **Chunk 5** of the Coaching Institute Fee Tracking System and Parent Portal for Company A, Jaipur.

All systems operate on integer paise, enforce immutability, integrate with the PostgreSQL schema and in-memory persistence stores, and comply with all safety boundaries.

---

## 2. Implemented Modules & Architecture

### 2.1. Automatic Reminder Engine (`src/modules/reminders/`)
- **Configurable Scheduling**: Standard 5-point schedule around fee due dates:
  - `T_MINUS_7`: 7 days prior to due date
  - `T_MINUS_3`: 3 days prior to due date
  - `T_ZERO`: On the due date
  - `T_PLUS_3`: 3 days overdue
  - `T_PLUS_7`: 7 days overdue
- **Bilingual Message Templates**:
  - **English**: *"Dear Parent, your child's fee instalment of ₹30,000 is approaching its due date. Please complete the payment using your secure payment link."*
  - **Hindi**: *"नमस्ते! आपके बच्चे की फीस किस्त ₹30,000 की भुगतान तिथि नजदीक है। कृपया समय पर भुगतान करें।"*
  - Overdue variants with exact due dates and days overdue.
- **Pre-Flight Settlement Check**:
  - Immediately before dispatching any queued reminder, the engine fetches the authoritative instalment status from the ledger.
  - If settled (`outstandingPaise <= 0`), the reminder is **cancelled** on the fly and no message is sent.
  - If partially settled, the template is recalculated with the remaining balance.
- **Payment Verification Hook**:
  - Verified payments immediately trigger `reminderService.handlePaymentVerified()`.
  - Fully settled instalments cancel all pending reminder jobs.
  - Partially paid instalments recalculate future reminder amounts.
- **Deduplication & Retry Mechanism**:
  - Unique composite key `(instalmentId, stage)` prevents duplicate jobs.
  - Upstream gateway failures trigger retries up to 3 attempts with exponential backoff before failing safely.
- **Mock Message Provider**:
  - Dispatches to `MOCK_WHATSAPP_SMS` with status `DELIVERED_MOCK`.
  - Transparently labels mock deliveries; does not claim live carrier delivery.

### 2.2. Versioned Statutory Refund Policy Engine (`src/modules/refunds/`)
- **Policy Version**: `POLICY-V1-2026`.
- **Cutoff Window Tiers**:
  - **Tier 1 (Within 15 days)**: 100% tuition refundable minus non-refundable fees.
  - **Tier 2 (16–30 days)**: 75% tuition refundable minus deductions.
  - **Tier 3 (31–60 days)**: 50% tuition refundable minus deductions.
  - **Tier 4 (>60 days)**: 0% refund (ineligible).
- **Approved Written Policy Deductions**:
  - Non-refundable Registration / Administrative Fee: Fixed ₹5,000 (`500000` paise).
  - Study Material / Academic Kit: Fixed ₹3,000 (`300000` paise) if kit is retained; ₹0 if returned in verified condition.
  - Prorated Daily Tuition: `(netTuition * usedCourseDays) / totalCourseDays`.
- **Statutory 10-Day Deadline Tracking**:
  - Automatically calculates deadline (`withdrawalDate + 10 days`).
  - Sets `isWithin10DayDeadline` flag for accounts compliance alerts.
- **Financial Safety**:
  - Net refund is strictly capped at total verified payments received.
  - Separation of refund calculation from disbursement.
  - Multi-stage approval workflow (`CALCULATED` → `REQUESTED` → `APPROVED` → `DISBURSED`).

### 2.3. Real Database-Driven Reporting & Dues Ageing (`src/modules/reports/`)
- **Executive Metrics**:
  - Total Billed (`₹3,60,000` baseline for sample cohort)
  - Total Collected (`₹45,000` verified collections)
  - Total Outstanding (`₹3,15,000` strictly derived from `billed - collected`)
  - Overdue Outstanding (`₹15,000` from Ishita Sharma STU-0587 overdue instalment)
  - Collection Rate (`12.5%`)
- **Zero Double-Counting Principle**:
  - Student fee assignments are evaluated strictly once.
  - Overdue amounts use actual remaining balance (`outstandingPaise`), never the original instalment face value.
- **Ageing Brackets**:
  - Not Due
  - 1–30 Days Overdue
  - 31–60 Days Overdue
  - >60 Days Overdue (Critical)

### 2.4. Structured Tally ERP Export (`src/modules/accounts/tally.service.ts`)
- **Configurable Ledger Mapping**:
  - Debit: Bank Account (`Bank Account (HDFC)`) or Cash (`Cash in Hand`)
  - Credit: Coaching Fee Income (`Coaching Fee Income`)
  - Refunds: Student Fee Refund A/c
- **Reconciliation Engine**:
  - Validates `sum(Debit) === sum(Credit) === sum(Collections)`.
  - Computes `ledgerReconciliationDifference` (must be 0.00).
- **Export Formats**:
  - **CSV**: Structured column format for batch import.
  - **XML**: Standard Tally Envelope XML schema format.
  - Explicit disclaimer: CSV/XML export format for manual or scheduled batch import; no live direct ODBC connection claimed.

### 2.5. Academic Bulk CSV Uploads (`src/modules/academic/academic.service.ts`)
- **Attendance Upload**:
  - Expected format: `rollNumber,date,status,remarks`.
  - Validates roll number, batch & centre membership, date format (`YYYY-MM-DD`), and status (`PRESENT`, `ABSENT`, `EXCUSED`).
  - Rejects invalid rows with exact line numbers and reasons.
  - Prevents duplicate imports using composite key `(studentId, date)`.
- **Test Score Upload**:
  - Expected format: `rollNumber,testCode,testName,testDate,physics,chemistry,mathematics,totalMarks,maxMarks`.
  - Validates score ranges (`0 <= marks <= maxMarks`).
  - Computes batch rank & percentile.
  - Prevents duplicate imports using composite key `(studentId, testCode)`.

### 2.6. Explainable Rule-Based AI Dropout-Risk Engine (`src/modules/ai-risk/`)
- **Deterministic Heuristic Engine**:
  - **Financial Factor (Max 40 pts)**: Overdue days (1–15d: 10 pts, 16–30d: 25 pts, >30d: 40 pts).
  - **Attendance Factor (Max 35 pts)**: Attendance rate (75–84%: 15 pts, 60–74%: 25 pts, <60%: 35 pts).
  - **Academic Factor (Max 25 pts)**: Percentile (<50%ile: 25 pts, 50–69%ile: 10 pts, >=70%ile: 0 pts).
  - **Risk Classification**:
    - `0–39`: `LOW`
    - `40–69`: `MEDIUM`
    - `70–100`: `HIGH`
- **Transparent Explainability**:
  - Returns human-readable `contributingReasons` array explaining each contributing factor.
- **Critical Safety Enforcements**:
  1. Never automatically change fees
  2. Never block student access
  3. Never initiate refunds
  4. Never send automated parent messages based on AI flags
  5. ONLY create counsellor review tasks for human evaluation
  6. Allow human counsellors to mark false positives with consultation notes
  7. Record immutable review history

### 2.7. Centralized Audit Logging (`src/modules/audit/audit.service.ts`)
- Tracks: `FEE_PLAN_CREATED`, `DISCOUNT_APPLIED`, `PAYMENT_VERIFIED`, `REFUND_CALCULATED`, `REFUND_APPROVED`, `REFUND_DISBURSED`, `REMINDER_JOB_CREATED`, `REMINDER_DISPATCHED`, `REMINDER_CANCELLED`, `DATA_IMPORTED_ATTENDANCE`, `DATA_IMPORTED_TEST_SCORES`, `AI_RISK_EVALUATED`, `AI_RISK_FALSE_POSITIVE`.
- Privacy Protection: Redacts `password`, `otp`, `token`, `secret`, `signature`, `cvv`, `cardNumber`.

---

## 3. API Endpoints Reference

| Endpoint | Method | Role Required | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/accounts/dashboard/metrics` | `GET` | Accounts Executive | Executive KPI metrics |
| `/api/v1/accounts/dashboard/ageing` | `GET` | Accounts Executive | 4-bucket ageing report |
| `/api/v1/accounts/reminders/logs` | `GET` | Accounts Executive | Dispatched reminders history |
| `/api/v1/accounts/reminders/trigger` | `POST` | Accounts Executive | Manual reminder dispatch |
| `/api/v1/accounts/reminders/process-due` | `POST` | Accounts Executive | Background cycle trigger |
| `/api/v1/accounts/refunds/calculate` | `POST` | Accounts Executive | Policy refund calculator |
| `/api/v1/accounts/refunds/request` | `POST` | Accounts Executive | Submit formal refund request |
| `/api/v1/accounts/refunds/approve` | `POST` | Accounts Executive | Approve refund request |
| `/api/v1/accounts/refunds/reject` | `POST` | Accounts Executive | Reject refund request |
| `/api/v1/accounts/refunds/disburse` | `POST` | Accounts Executive | Record refund disbursement |
| `/api/v1/accounts/refunds/history/:studentId` | `GET` | Accounts Executive | Student refund history |
| `/api/v1/accounts/export/tally` | `GET` | Accounts Executive | Download Tally XML |
| `/api/v1/accounts/export/tally/csv` | `GET` | Accounts Executive | Download Tally CSV + Reconciliation |
| `/api/v1/accounts/ai-risk/evaluate/:studentId` | `GET` | Accounts Executive | Run explainable risk assessment |
| `/api/v1/accounts/ai-risk/false-positive` | `POST` | Accounts Executive | Counsellor false-positive mark |
| `/api/v1/accounts/ai-risk/assessments` | `GET` | Accounts Executive | List all risk evaluations |
| `/api/v1/accounts/ai-risk/counsellor-tasks` | `GET` | Accounts Executive | List counsellor follow-up tasks |
| `/api/v1/accounts/audit/logs` | `GET` | Accounts Executive | Query immutable audit logs |
| `/api/v1/academic/attendance/upload` | `POST` | Staff / Admin | Batch attendance CSV upload |
| `/api/v1/academic/test-scores/upload` | `POST` | Staff / Admin | Batch test score CSV upload |

---

## 4. Test Suite Execution Summary

- **Total Test Files**: 13 files (all 13 passing).
- **Total Automated Tests**: 92 tests (92/92 passing).
- **Build Status**:
  - Backend: `npm --prefix backend run build` (0 TypeScript errors).
  - Frontend: `npm --prefix frontend run build` (0 Vite/TypeScript errors).

