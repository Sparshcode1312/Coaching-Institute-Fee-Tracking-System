# Chunk 4 — Senior Frontend Engineer and Product Designer: Delivery Report

## 1. Executive Summary & Design System

The frontend application for Company A, Jaipur has been built using React 18, TypeScript, Vite, HTML5, and custom CSS adhering to the Alwayzz design philosophy:
- **Palette**: Pristine white background (`#FFFFFF`), charcoal surface (`#FAFAFA`), obsidian text (`#0A0A0A`), muted secondary text (`#6B6B6B`), and a single vivid green accent (`#17C964`). Soft borders (`rgba(0,0,0,0.08)`) with zero noisy shadows.
- **Typography**: Google Fonts Inter with preconnect, tight heading letter spacing (`-0.03em`), and tabular numerals (`font-variant-numeric: tabular-nums`) for financial figures.
- **Pure Custom CSS Architecture**: Strictly zero Tailwind CSS, Bootstrap, or Material UI dependencies. Layouts and components are defined via reusable CSS custom properties in `variables.css`, `global.css`, `layout.css`, and `components.css`.
- **Icons**: Lucide React for crisp, lightweight SVG icons.

---

## 2. Parent Portal Architecture

### 2.1. The "Five-Second Rule" Viewport
Designed specifically for mobile devices and non-technical guardians. Within 5 seconds of opening the application, the guardian immediately sees:
1. **Student Name & Identification**: Student full name, roll number, and enrolled batch.
2. **Authoritative Outstanding Dues**: Formatted Indian Rupee balance (e.g. ₹15,000).
3. **Next Due Date & Escalation State**: Formatted date (e.g. 10 Oct 2026) with overdue badge and days overdue calculation.
4. **Primary "Pay Now" Action**: Obsidian black primary action button opening the payment drawer.

### 2.2. Down-Page Ledger & Academic Access
- **Instalment Timeline**: Visual breakdown of milestones (Instalment 1, 2, 3, 4) with amounts, due dates, paid amounts, and discrete payment (`UNPAID`, `PARTIALLY_PAID`, `PAID`) vs due status (`UPCOMING`, `DUE_TODAY`, `OVERDUE`, `SETTLED`).
- **Payment History & Receipts**: Verified transactions list with reference ID, payment method, date, and sequential receipt download access (`REC-2026-C1-000412`).
- **Attendance & Test Scores Preview**: Attendance rate (e.g. 93.75%) and latest test percentile (e.g. 97.2 %ile) with direct navigation to the detailed academic log (`/parent/academic`).
- **Bilingual Support (Hindi & English)**: Complete localized terminology with a 1-tap language toggle (`LanguageSwitcher.tsx`).
- **Multi-Child Guardian Switching**: Parents with multiple wards (e.g. siblings) can switch between student records with one tap.

---

## 3. Accounts Command Centre Architecture

### 3.1. Executive KPI Metrics Bar
- **Total Billed Fee**: Aggregated billed revenue across all centres.
- **Total Collected Fee**: Verified settlements credited to bank accounts.
- **Total Outstanding Balance**: Current unpaid tuition dues.
- **Critical Overdue (>30 Days)**: High-priority dues requiring counsellor or legal intervention.

### 3.2. Student Fee Directory & Ledger Inspector
- **Multi-parameter Filtering**: Instant search by roll number or student name, centre filter (4 Jaipur campuses), batch filter (JEE/NEET), and status filter.
- **Interactive Student Row**: Direct navigation to `/accounts/ledger/:studentId` displaying full chronological audit history.
- **Offline / Cash Fee Collection Modal**: Record physical cash, demand draft, cheque, or NEFT receipts with instrument number and bank name.
- **Statutory Refund Calculator Modal**: Automated calculation based on attendance days and material return status, enforcing non-refundable registration charges and daily prorated tuition deductions.
- **Automated Reminder Dispatcher**: One-click WhatsApp / SMS overdue notification dispatch.

### 3.3. Dues & Ageing Reports (`/accounts/ageing`)
- Buckets: **Current / Not Due**, **1–15 Days**, **16–30 Days**, **31–60 Days**, and **>60 Days (Critical)**.
- Interactive bucket filtering with student list drill-down and direct ledger access.

### 3.4. Unmatched Bank Queue (`/accounts/unmatched`)
- Direct bank NEFT/UPI deposits received without student reference.
- Interactive two-step manual reconciliation modal: select student roll number, view open instalments, and link the deposit.

### 3.5. Tally ERP Export Interface (`/accounts/tally`)
- Date range and centre filtering.
- Syntax-highlighted Tally Envelope XML schema preview.
- One-click XML export download formatted for direct import into Tally ERP 9 / TallyPrime.

---

## 4. Verification & Build Status

- **Frontend Build**: Vite + TypeScript compiled with 0 errors (`dist/assets/index-*.js`, `dist/assets/index-*.css`).
- **Backend Build**: Express + TypeScript compiled with 0 errors.
- **Backend Test Suite**: 63 of 63 automated tests passing.
- **Strict Data Integrity**: Strictly uses the exact 3 sample students (`STU-0412`, `STU-0587`, `STU-0219`).

