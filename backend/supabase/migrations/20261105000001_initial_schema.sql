-- =============================================================================
-- Migration: 20261105000001_initial_schema.sql
-- Description: Core Schema for Coaching Institute Fee Tracking System & Parent Portal
-- Client: Company A, Jaipur
-- Author: Senior Backend Engineer & Database Architect
-- Standard: PostgreSQL 15+ (Supabase) | Integer Paise Currency (BIGINT)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Immutable audit & transaction guard: prevents UPDATE and DELETE on financial ledgers
CREATE OR REPLACE FUNCTION prevent_modification_or_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial and audit records are immutable. Direct UPDATE or DELETE is strictly prohibited on table %', TG_TABLE_NAME;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. ORGANIZATIONAL & ACADEMIC HIERARCHY
-- =============================================================================

-- 2.1 Centres (4 coaching branches in Jaipur)
CREATE TABLE IF NOT EXISTS centres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Jaipur',
    address TEXT,
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER trg_centres_updated_at
    BEFORE UPDATE ON centres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.2 Batches
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    stream VARCHAR(50) NOT NULL CHECK (stream IN ('JEE', 'NEET', 'FOUNDATION')),
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_batches_centre ON batches(centre_id);
CREATE TRIGGER trg_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. USERS, PROFILES & ACCESS CONTROL
-- =============================================================================

-- 3.1 Profiles (Extends Supabase auth.users or standalone user registry)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- References auth.users(id) in Supabase Auth
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150),
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('parent', 'accounts_executive', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 Parents Profile Extension
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    alternate_phone VARCHAR(20),
    residential_address TEXT,
    occupation VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3.3 Accounts Executives Profile Extension
CREATE TABLE IF NOT EXISTS accounts_executives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    assigned_centre_ids UUID[] NOT NULL DEFAULT '{}', -- Multi-centre data isolation
    designation VARCHAR(100) NOT NULL DEFAULT 'Accounts Executive',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =============================================================================
-- 4. STUDENTS & GUARDIAN RELATIONSHIPS
-- =============================================================================

-- 4.1 Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number VARCHAR(50) NOT NULL UNIQUE, -- STU-0412, STU-0587, STU-0219
    full_name VARCHAR(150) NOT NULL,
    centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    enrolment_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (enrolment_status IN ('ACTIVE', 'PROVISIONAL', 'DROPOUT_RISK', 'WITHDRAWN', 'COMPLETED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_students_centre_batch ON students(centre_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_students_enrolment_status ON students(enrolment_status);
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Parent-Student Relationships (Strict security boundary for Parent Portal)
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(30) NOT NULL CHECK (relationship_type IN ('FATHER', 'MOTHER', 'LEGAL_GUARDIAN')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REVOKED')),
    verified_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_parent_student UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_psr_parent ON parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_psr_student ON parent_student_relationships(student_id);

-- 4.3 Parental Consents
CREATE TABLE IF NOT EXISTS parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('COMMUNICATION_WHATSAPP', 'TERMS_AND_CONDITIONS', 'FEE_POLICY_ACKNOWLEDGEMENT')),
    is_granted BOOLEAN NOT NULL DEFAULT true,
    ip_address VARCHAR(45),
    consented_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_parent_consent UNIQUE (parent_id, student_id, consent_type)
);

-- =============================================================================
-- 5. FEE STRUCTURE, PLANS, DISCOUNTS & ASSIGNMENTS
-- =============================================================================

-- 5.1 Fee Plans (Annual fee blueprint, e.g., ₹1,20,000 in 3 or 4 instalments)
CREATE TABLE IF NOT EXISTS fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    stream VARCHAR(50) NOT NULL CHECK (stream IN ('JEE', 'NEET', 'FOUNDATION')),
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    total_annual_fee_paise BIGINT NOT NULL CHECK (total_annual_fee_paise > 0),
    instalment_count INT NOT NULL CHECK (instalment_count BETWEEN 1 AND 12),
    schedule_blueprint JSONB NOT NULL, -- Array of { instalmentNumber, percentShare, relativeDueDays }
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5.2 Fee Discounts (Scholarships & Concessions)
CREATE TABLE IF NOT EXISTS fee_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('MERIT_SCHOLARSHIP', 'SIBLING', 'STAFF_WARD', 'DISCRETIONARY')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5.3 Student Fee Assignments (Active fee plan instance bound to a student)
CREATE TABLE IF NOT EXISTS student_fee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
    fee_plan_id UUID NOT NULL REFERENCES fee_plans(id) ON DELETE RESTRICT,
    gross_fee_paise BIGINT NOT NULL CHECK (gross_fee_paise > 0),
    total_discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_discount_paise >= 0),
    net_fee_paise BIGINT NOT NULL CHECK (net_fee_paise >= 0),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_net_fee CHECK (net_fee_paise = gross_fee_paise - total_discount_paise)
);

-- 5.4 Fee Instalments (Explicit milestone obligations)
CREATE TABLE IF NOT EXISTS fee_instalments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_assignment_id UUID NOT NULL REFERENCES student_fee_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    instalment_number INT NOT NULL CHECK (instalment_number >= 1),
    base_amount_paise BIGINT NOT NULL CHECK (base_amount_paise > 0),
    discount_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_paise >= 0),
    net_payable_paise BIGINT NOT NULL CHECK (net_payable_paise >= 0),
    settled_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (settled_amount_paise >= 0),
    due_date DATE NOT NULL,
    grace_until DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UPCOMING'
        CHECK (status IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_student_instalment_num UNIQUE (student_id, instalment_number),
    CONSTRAINT chk_settlement_bounds CHECK (settled_amount_paise <= net_payable_paise),
    CONSTRAINT chk_grace_after_due CHECK (grace_until >= due_date)
);

CREATE INDEX IF NOT EXISTS idx_fee_instalments_status_due ON fee_instalments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_fee_instalments_student ON fee_instalments(student_id);
CREATE TRIGGER trg_fee_instalments_updated_at
    BEFORE UPDATE ON fee_instalments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. PAYMENTS, ORDERS, ALLOCATIONS & RECEIPTS
-- =============================================================================

-- 6.1 Payment Orders (Gateway Order Intent, e.g. Razorpay / Mock Order)
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref VARCHAR(64) NOT NULL UNIQUE,
    gateway_order_id VARCHAR(100),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    target_instalment_id UUID REFERENCES fee_instalments(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED', 'ATTEMPTED', 'PAID', 'EXPIRED')),
    idempotency_key VARCHAR(100) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_student ON payment_orders(student_id);

-- 6.2 Payments (Immutable transaction records)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(64) NOT NULL UNIQUE,
    payment_order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    gateway_name VARCHAR(30) NOT NULL DEFAULT 'MOCK'
        CHECK (gateway_name IN ('MOCK', 'RAZORPAY', 'OFFLINE_CASH', 'OFFLINE_CHEQUE', 'OFFLINE_BANK_TRANSFER')),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    payment_mode VARCHAR(30) NOT NULL
        CHECK (payment_mode IN ('ONLINE', 'UPI', 'CARD', 'NETBANKING', 'CASH', 'CHEQUE', 'DEMAND_DRAFT', 'NEFT_RTGS')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED'
        CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'USER_DROPPED', 'REFUNDED')),
    cheque_instrument_number VARCHAR(50),
    cheque_bank_name VARCHAR(100),
    cheque_clearing_date DATE,
    gateway_payload JSONB,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enforce immutability on payments: UPDATE or DELETE prohibited once created
CREATE TRIGGER trg_payments_immutable
    BEFORE UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

-- 6.3 Payment Allocations (Mapping payments to specific instalments)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    fee_instalment_id UUID NOT NULL REFERENCES fee_instalments(id) ON DELETE RESTRICT,
    allocated_amount_paise BIGINT NOT NULL CHECK (allocated_amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_payment_fee_instalment UNIQUE (payment_id, fee_instalment_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_instalment ON payment_allocations(fee_instalment_id);

-- Enforce immutability on allocations
CREATE TRIGGER trg_payment_allocations_immutable
    BEFORE UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

-- 6.4 Receipts (Official tamper-evident receipts)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(60) NOT NULL UNIQUE, -- e.g. REC-2026-C1-000412
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    verification_hash VARCHAR(128) NOT NULL, -- SHA256 checksum
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id);

-- =============================================================================
-- 7. REFUNDS & WITHDRAWALS
-- =============================================================================

-- 7.1 Refund Policies
CREATE TABLE IF NOT EXISTS refund_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    max_days_from_start INT NOT NULL,
    tuition_refund_percentage NUMERIC(5,2) NOT NULL CHECK (tuition_refund_percentage BETWEEN 0 AND 100),
    is_registration_refundable BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7.2 Refund Requests
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    total_fee_paid_paise BIGINT NOT NULL CHECK (total_fee_paid_paise >= 0),
    deduction_registration_paise BIGINT NOT NULL DEFAULT 0 CHECK (deduction_registration_paise >= 0),
    deduction_tuition_paise BIGINT NOT NULL DEFAULT 0 CHECK (deduction_tuition_paise >= 0),
    deduction_material_paise BIGINT NOT NULL DEFAULT 0 CHECK (deduction_material_paise >= 0),
    net_refund_paise BIGINT NOT NULL CHECK (net_refund_paise >= 0),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED')),
    requested_by UUID REFERENCES profiles(id),
    reviewed_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_student ON refund_requests(student_id);
CREATE TRIGGER trg_refund_requests_updated_at
    BEFORE UPDATE ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7.3 Refund Transactions
CREATE TABLE IF NOT EXISTS refund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_request_id UUID NOT NULL REFERENCES refund_requests(id) ON DELETE RESTRICT,
    payout_ref VARCHAR(100) NOT NULL UNIQUE,
    payout_mode VARCHAR(30) NOT NULL CHECK (payout_mode IN ('ORIGINAL_SOURCE', 'NEFT', 'RTGS', 'CHEQUE')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    disbursed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =============================================================================
-- 8. REMINDERS & COMMUNICATIONS
-- =============================================================================

-- 8.1 Reminder Jobs (Scheduled tasks)
CREATE TABLE IF NOT EXISTS reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_instalment_id UUID NOT NULL REFERENCES fee_instalments(id) ON DELETE CASCADE,
    scheduled_for DATE NOT NULL,
    reminder_stage VARCHAR(30) NOT NULL
        CHECK (reminder_stage IN ('T_MINUS_7', 'T_MINUS_1', 'DUE_DATE', 'OVERDUE_T_PLUS_3', 'OVERDUE_T_PLUS_7', 'CRITICAL_T_PLUS_15')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_reminder_jobs_sched ON reminder_jobs(scheduled_for, status);

-- 8.2 Reminder Logs (Immutable dispatch audit trail)
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_job_id UUID REFERENCES reminder_jobs(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_instalment_id UUID REFERENCES fee_instalments(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP'
        CHECK (channel IN ('WHATSAPP', 'SMS', 'EMAIL')),
    reminder_stage VARCHAR(30) NOT NULL,
    message_content TEXT NOT NULL,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'SENT'
        CHECK (delivery_status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED')),
    external_message_id VARCHAR(100),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_student ON reminder_logs(student_id);

-- Enforce immutability on reminder logs
CREATE TRIGGER trg_reminder_logs_immutable
    BEFORE UPDATE OR DELETE ON reminder_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

-- =============================================================================
-- 9. ACADEMIC MODULE: ATTENDANCE & TEST SCORES
-- =============================================================================

-- 9.1 Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_student_attendance UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, attendance_date DESC);

-- 9.2 Tests
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    stream VARCHAR(50) NOT NULL CHECK (stream IN ('JEE', 'NEET')),
    test_date DATE NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL CHECK (max_marks > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9.3 Test Scores
CREATE TABLE IF NOT EXISTS test_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_marks JSONB NOT NULL, -- e.g. {"physics": 75, "chemistry": 80, "maths": 85}
    total_marks_obtained NUMERIC(6,2) NOT NULL CHECK (total_marks_obtained >= 0),
    batch_rank INT,
    batch_percentile NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_test_student UNIQUE (test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_test_scores_student ON test_scores(student_id);

-- =============================================================================
-- 10. INTELLIGENCE & COUNSELLING: DROPOUT RISK & TASKS
-- =============================================================================

-- 10.1 Dropout Risk Flags
CREATE TABLE IF NOT EXISTS dropout_risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    risk_score NUMERIC(3,2) NOT NULL CHECK (risk_score BETWEEN 0.00 AND 1.00),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK')),
    financial_overdue_days INT NOT NULL DEFAULT 0,
    attendance_percentage_30d NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    academic_percentile_recent NUMERIC(5,2),
    flagged_reason TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_dropout_risk_active ON dropout_risk_flags(student_id, is_active);

-- 10.2 Counsellor Tasks
CREATE TABLE IF NOT EXISTS counsellor_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id),
    priority VARCHAR(20) NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER trg_counsellor_tasks_updated_at
    BEFORE UPDATE ON counsellor_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 11. AUDIT & RECONCILIATION
-- =============================================================================

-- 11.1 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);

-- Enforce immutability on audit logs
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

-- =============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS across protected operational entities
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_instalments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- 12.1 Accounts Executive Policy: Access authorized centres
CREATE POLICY "Accounts executives have access to assigned centres"
    ON students
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role' = 'super_admin')
        OR (
            auth.jwt() ->> 'role' = 'accounts_executive'
            AND centre_id::text = ANY (
                SELECT unnest(assigned_centre_ids)::text
                FROM accounts_executives ae
                JOIN profiles p ON p.id = ae.profile_id
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );

-- 12.2 Parent Policy: Access strictly linked students
CREATE POLICY "Parents can view only verified linked students"
    ON students
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'parent'
        AND id IN (
            SELECT psr.student_id
            FROM parent_student_relationships psr
            JOIN parents par ON par.id = psr.parent_id
            JOIN profiles p ON p.id = par.profile_id
            WHERE p.auth_user_id = auth.uid()
            AND psr.verification_status = 'VERIFIED'
        )
    );

-- 12.3 Parent Policy: View fee instalments for linked students
CREATE POLICY "Parents can view instalments of linked students"
    ON fee_instalments
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'parent'
        AND student_id IN (
            SELECT psr.student_id
            FROM parent_student_relationships psr
            JOIN parents par ON par.id = psr.parent_id
            JOIN profiles p ON p.id = par.profile_id
            WHERE p.auth_user_id = auth.uid()
            AND psr.verification_status = 'VERIFIED'
        )
    );

-- 12.4 Parent Policy: View official receipts for linked students
CREATE POLICY "Parents can view receipts of linked students"
    ON receipts
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'parent'
        AND student_id IN (
            SELECT psr.student_id
            FROM parent_student_relationships psr
            JOIN parents par ON par.id = psr.parent_id
            JOIN profiles p ON p.id = par.profile_id
            WHERE p.auth_user_id = auth.uid()
            AND psr.verification_status = 'VERIFIED'
        )
    );

