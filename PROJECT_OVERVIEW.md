# PROJECT OVERVIEW: Coaching Institute Fee Tracking System & Parent Portal
**Client / Organisation:** Company A, Jaipur  
**Domain:** EdTech / Financial Operations & Student Parent Experience  
**Scale:** 4 Centres, 2,600 Students, 140 Staff Members, ~₹30–34 Crore Annual Revenue  
**Author:** Senior Software Architect, Full-Stack Engineering Lead & Product Designer  
**Status:** Architecture Specification (Chunk 1)  

---

## 1. Executive Summary

Company A is a premier coaching institute operating across 4 centres in Jaipur, Rajasthan, serving approximately 2,600 enrolled students across engineering (JEE) and medical (NEET) entrance preparation streams. With an annual revenue of ₹30–34 crore and an average annual fee of ₹1,20,000 per student (collected in 3 to 4 scheduled instalments), financial operations represent a mission-critical pillar of the institute's sustainability and parent trust.

Currently, financial and academic communications suffer from fragmented legacy workflows:
1. **Desktop-bound software** prevents cross-centre visibility and real-time oversight.
2. **Disconnected Excel spreadsheets** track instalment due dates, causing delayed collections and reconciliation errors.
3. **Manual phone calls and WhatsApp messaging** are required to follow up on overdue amounts and share test score PDFs, placing an unsustainable burden on the 140 staff members.
4. **Ad-hoc refund calculations** lead to parent disputes, lack of audit trails, and financial leakage.
5. **Slow financial reconciliation** delays month-end books and complicates Tally accounting exports.

The new **Coaching Institute Fee Tracking System and Parent Portal** replaces these fragmented tools with a unified, high-integrity, cloud-native web application. It provides:
- A **Parent Portal**: A mobile-first, friction-free portal for parents to authenticate securely, inspect fee schedules, pay outstanding dues instantly via digital payment gateways, download GST-compliant receipts, and review their child's attendance and exam performance.
- An **Accounts Executive & Operations Portal**: A desktop-optimized, high-efficiency command centre for financial executives to monitor collections, manage fee ledgers, process refunds with strict auditability, trigger multi-channel reminders, resolve unmatched offline payments, track dropout risks, and export clean financial vouchers to Tally.

---

## 2. Business Objectives & Success Metrics

| Strategic Objective | Current Bottleneck | Target Metric / Production Solution |
| :--- | :--- | :--- |
| **Cash-Flow Predictability** | Dues tracked in spreadsheets; parents missed due dates. | Reduce Day-Sales-Outstanding (DSO) by 35% through automated multi-stage reminders (T-7, T-1, Due Date, Overdue). |
| **Zero Reconciliation Lag** | Bank statements manually matched against receipts at month end. | Automated webhook-driven payment verification and instant ledger posting; dedicated Unmatched Queue for offline bank transfers (NEFT/RTGS). |
| **Audit-Grade Financial Integrity** | Desktop edits and spreadsheet overwrites lack an audit trail. | Immutable double-entry financial ledger; all monetary values stored strictly in integer paise; distinct separation between payment attempt status and instalment due status. |
| **Transparent Parent Trust** | Scores sent via WhatsApp PDFs; fee balance disputed. | Instant self-serve access to official fee breakdown, payment receipts, attendance percentage, and test score reports. |
| **Operational Efficiency** | 140 staff members tied up in manual outreach and manual refund computation. | Automated refund calculation engine adhering to institutional policy; bulk attendance and test-score ingestion. |
| **Seamless Accounting Bridge** | Manual entry of transactions into Tally ERP/Prime. | One-click standardized XML/CSV Tally export for Receipt and Journal Vouchers. |

---

## 3. Scope of the System

### In-Scope (Phase 1 & Phase 2 Delivery)
1. **Student & Academic Hierarchy**:
   - Management of Centres (4 branches in Jaipur), Streams (JEE, NEET), Batches (e.g., JEE 2027 Morning, JEE 2027 Evening, NEET 2027 Morning), and Academic Years.
   - Comprehensive student profile linking guardian contact details, enrolment status, and batch assignment.
2. **Fee Architecture & Ledger**:
   - Configurable fee structures (Tuition, Admission, Study Material, Examination, Technology charges).
   - Multi-instalment scheduling (3 or 4 milestones per academic session).
   - Concession and discount engine (Merit/Scholarship, Sibling, Staff Quota, Discretionary).
   - Immutable double-entry ledger tracking Debits (Fees Incurred, Reversals) and Credits (Payments Received, Discounts Applied).
3. **Payment Gateway Integration**:
   - Pluggable payment adapter architecture (`PaymentGatewayAdapter`).
   - Mock Gateway Adapter for local deterministic development, automated testing, and QA demonstrations.
   - Production-ready Razorpay Test-Mode Adapter with webhook signature verification, order creation, and idempotent payment capture.
   - Offline payment entry (Cash, Demand Draft, Cheque, Bank Transfer) with receipt voucher generation.
4. **Parent Experience**:
   - Frictionless mobile-first UI with Phone OTP authentication (Supabase Auth / Mock SMS adapter).
   - Student fee dashboard, instalment timeline, breakdown of outstanding vs. paid amounts.
   - One-click online payment checkout.
   - PDF/printable receipt generator with QR verification code.
   - Attendance calendar view and historical test score report cards with subject-wise analytics.
5. **Accounts Management & Governance**:
   - High-density Accounts Executive dashboard with revenue KPIs, collection trends, centre-wise breakdown, and ageing buckets (0–15d, 16–30d, 31–60d, 60+d).
   - Unmatched payment queue for reconciling bank statement UTR numbers.
   - Standardized refund request, policy deduction calculation, and approval workflow.
   - Dropout risk detection engine combining overdue fee days, attendance dips, and exam absences.
   - Tally ERP 9 / TallyPrime XML export engine.

### Out-of-Scope (Deferred to Future Revisions)
- Full Learning Management System (LMS) with video streaming or assignment grading.
- Teacher payroll and operational expense tracking (handled directly in Tally).
- Biometric hardware driver integrations (attendance relies on standard daily CSV/Excel upload).

---

## 4. Architectural Principles & Non-Negotiables

1. **Financial Correctness Over Speed**:
   - All currency values stored as 64-bit integer paise (`BIGINT` in PostgreSQL). Never store float or decimal values for money.
   - Zero destructive updates on financial ledgers. Corrections must be handled via explicit credit notes, debit notes, or reversal transactions.
2. **Separation of Concerns**:
   - An *Instalment* is an obligation with an expected amount, due date, and settlement state (`UPCOMING`, `DUE`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
   - A *Payment* is a transaction attempt with an independent lifecycle (`INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `USER_DROPPED`).
   - A payment transaction settles or partially settles one or more instalments via an explicit allocation ledger.
3. **Strict Zero-Tailwind, Minimalist Visual Standard**:
   - Inspired by the clean, typographic Alwayzz aesthetic.
   - White surface (`#FFFFFF`), stark black typography (`#000000`, `#111827`), restrained green accent (`#17C964`).
   - Custom scoped CSS. Zero Tailwind CSS utility classes.
4. **Strict Grounding in Assignment Reality**:
   - Only the 3 provided student records (`STU-0412`, `STU-0587`, `STU-0219`) are used as baseline sample fixtures.
   - No fabricated phone numbers, centre names, or tax slabs. All missing parameters are treated as explicit configuration points.

