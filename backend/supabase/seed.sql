-- =============================================================================
-- Seed: seed.sql
-- Description: Idempotent Seed Data for Company A, Jaipur
-- Compliance: Strictly preserves the 3 provided student records.
--             No fabricated personal info, phone numbers, or unverified parents.
-- =============================================================================

-- 1. SEED 4 CENTRES IN JAIPUR (Dynamic and un-invented branch codes)
INSERT INTO centres (id, code, name, city, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'JPR-C1', 'Jaipur Centre 1', 'Jaipur', true),
    ('c2222222-2222-2222-2222-222222222222', 'JPR-C2', 'Jaipur Centre 2', 'Jaipur', true),
    ('c3333333-3333-3333-3333-333333333333', 'JPR-C3', 'Jaipur Centre 3', 'Jaipur', true),
    ('c4444444-4444-4444-4444-444444444444', 'JPR-C4', 'Jaipur Centre 4', 'Jaipur', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, city = EXCLUDED.city, is_active = EXCLUDED.is_active;

-- 2. SEED FEE PLANS (Aligned to average annual fee ₹1,20,000)
-- 4-Instalment Plan: 4 milestones of ₹30,000 (3,000,000 paise each)
INSERT INTO fee_plans (id, code, name, stream, academic_year, total_annual_fee_paise, instalment_count, schedule_blueprint, is_active)
VALUES (
    ('f1111111-1111-1111-1111-111111111111'),
    'PLAN-JEE-4INST',
    'Standard JEE 4-Instalment Fee Plan',
    'JEE',
    '2026-2027',
    12000000, -- ₹1,20,000
    4,
    '[
        {"instalmentNumber": 1, "amountPaise": 3000000, "description": "1st Instalment (Admission & Q1)"},
        {"instalmentNumber": 2, "amountPaise": 3000000, "description": "2nd Instalment (Q2)"},
        {"instalmentNumber": 3, "amountPaise": 3000000, "description": "3rd Instalment (Q3)"},
        {"instalmentNumber": 4, "amountPaise": 3000000, "description": "4th Instalment (Final)"}
    ]'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;

-- 3-Instalment Plan: 3 milestones of ₹40,000 (4,000,000 paise each)
INSERT INTO fee_plans (id, code, name, stream, academic_year, total_annual_fee_paise, instalment_count, schedule_blueprint, is_active)
VALUES (
    ('f2222222-2222-2222-2222-222222222222'),
    'PLAN-NEET-3INST',
    'Standard NEET 3-Instalment Fee Plan',
    'NEET',
    '2026-2027',
    12000000, -- ₹1,20,000
    3,
    '[
        {"instalmentNumber": 1, "amountPaise": 4000000, "description": "1st Instalment (Admission & Term 1)"},
        {"instalmentNumber": 2, "amountPaise": 4000000, "description": "2nd Instalment (Term 2)"},
        {"instalmentNumber": 3, "amountPaise": 4000000, "description": "3rd Instalment (Term 3)"}
    ]'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;

-- 3. SEED BATCHES (Exact batches from sample data)
INSERT INTO batches (id, centre_id, code, name, stream, academic_year, start_date, end_date, is_active)
VALUES
    (
        'b1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111',
        'BATCH-JEE-2027-MORN',
        'JEE 2027 Morning',
        'JEE',
        '2026-2027',
        '2026-06-01',
        '2027-05-31',
        true
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        'c1111111-1111-1111-1111-111111111111',
        'BATCH-JEE-2027-EVE',
        'JEE 2027 Evening',
        'JEE',
        '2026-2027',
        '2026-06-01',
        '2027-05-31',
        true
    ),
    (
        'b3333333-3333-3333-3333-333333333333',
        'c2222222-2222-2222-2222-222222222222',
        'BATCH-NEET-2027-MORN',
        'NEET 2027 Morning',
        'NEET',
        '2026-2027',
        '2026-06-01',
        '2027-05-31',
        true
    )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, stream = EXCLUDED.stream, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;

-- 4. SEED THE THREE EXACT STUDENTS SUPPLIED IN ASSIGNMENT
-- Student 1: STU-0412 | Aarav Meena | JEE 2027 Morning
INSERT INTO students (id, roll_number, full_name, centre_id, batch_id, enrolment_status, admission_date)
VALUES (
    's0412000-0000-0000-0000-000000000412',
    'STU-0412',
    'Aarav Meena',
    'c1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'ACTIVE',
    '2026-06-15'
)
ON CONFLICT (roll_number) DO UPDATE
SET full_name = EXCLUDED.full_name, enrolment_status = EXCLUDED.enrolment_status;

-- Student 2: STU-0587 | Ishita Sharma | JEE 2027 Evening
INSERT INTO students (id, roll_number, full_name, centre_id, batch_id, enrolment_status, admission_date)
VALUES (
    's0587000-0000-0000-0000-000000000587',
    'STU-0587',
    'Ishita Sharma',
    'c1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'ACTIVE',
    '2026-06-20'
)
ON CONFLICT (roll_number) DO UPDATE
SET full_name = EXCLUDED.full_name, enrolment_status = EXCLUDED.enrolment_status;

-- Student 3: STU-0219 | Mohit Gurjar | NEET 2027 Morning
INSERT INTO students (id, roll_number, full_name, centre_id, batch_id, enrolment_status, admission_date)
VALUES (
    's0219000-0000-0000-0000-000000000219',
    'STU-0219',
    'Mohit Gurjar',
    'c2222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'ACTIVE',
    '2026-07-01'
)
ON CONFLICT (roll_number) DO UPDATE
SET full_name = EXCLUDED.full_name, enrolment_status = EXCLUDED.enrolment_status;

-- 5. SEED STUDENT FEE ASSIGNMENTS
INSERT INTO student_fee_assignments (id, student_id, fee_plan_id, gross_fee_paise, total_discount_paise, net_fee_paise)
VALUES
    ('a0412000-0000-0000-0000-000000000412', 's0412000-0000-0000-0000-000000000412', 'f1111111-1111-1111-1111-111111111111', 12000000, 0, 12000000),
    ('a0587000-0000-0000-0000-000000000587', 's0587000-0000-0000-0000-000000000587', 'f1111111-1111-1111-1111-111111111111', 12000000, 0, 12000000),
    ('a0219000-0000-0000-0000-000000000219', 's0219000-0000-0000-0000-000000000219', 'f2222222-2222-2222-2222-222222222222', 12000000, 0, 12000000)
ON CONFLICT (student_id) DO NOTHING;

-- 6. SEED THE EXACT INSTALMENTS SPECIFIED IN ASSIGNMENT
-- Student 1: STU-0412 | Aarav Meena | Due: 2026-10-10 | Fee: ₹30,000 | Settled: ₹30,000 (PAID)
INSERT INTO fee_instalments (id, student_fee_assignment_id, student_id, instalment_number, base_amount_paise, discount_amount_paise, net_payable_paise, settled_amount_paise, due_date, grace_until, status)
VALUES (
    'i0412000-0000-0000-0000-000000000412',
    'a0412000-0000-0000-0000-000000000412',
    's0412000-0000-0000-0000-000000000412',
    1,
    3000000, -- ₹30,000
    0,
    3000000,
    3000000, -- ₹30,000 Settled
    '2026-10-10',
    '2026-10-15',
    'PAID'
)
ON CONFLICT (student_id, instalment_number) DO UPDATE
SET settled_amount_paise = EXCLUDED.settled_amount_paise, status = EXCLUDED.status;

-- Student 2: STU-0587 | Ishita Sharma | Due: 2026-10-10 | Fee: ₹30,000 | Settled: ₹15,000 (PARTIALLY_PAID)
INSERT INTO fee_instalments (id, student_fee_assignment_id, student_id, instalment_number, base_amount_paise, discount_amount_paise, net_payable_paise, settled_amount_paise, due_date, grace_until, status)
VALUES (
    'i0587000-0000-0000-0000-000000000587',
    'a0587000-0000-0000-0000-000000000587',
    's0587000-0000-0000-0000-000000000587',
    1,
    3000000, -- ₹30,000
    0,
    3000000,
    1500000, -- ₹15,000 Settled
    '2026-10-10',
    '2026-10-15',
    'PARTIALLY_PAID'
)
ON CONFLICT (student_id, instalment_number) DO UPDATE
SET settled_amount_paise = EXCLUDED.settled_amount_paise, status = EXCLUDED.status;

-- Student 3: STU-0219 | Mohit Gurjar | Due: 2026-11-15 | Fee: ₹40,000 | Settled: ₹0 (DUE / UPCOMING)
INSERT INTO fee_instalments (id, student_fee_assignment_id, student_id, instalment_number, base_amount_paise, discount_amount_paise, net_payable_paise, settled_amount_paise, due_date, grace_until, status)
VALUES (
    'i0219000-0000-0000-0000-000000000219',
    'a0219000-0000-0000-0000-000000000219',
    's0219000-0000-0000-0000-000000000219',
    1,
    4000000, -- ₹40,000
    0,
    4000000,
    0,       -- ₹0 Settled
    '2026-11-15',
    '2026-11-20',
    'DUE'
)
ON CONFLICT (student_id, instalment_number) DO UPDATE
SET settled_amount_paise = EXCLUDED.settled_amount_paise, status = EXCLUDED.status;

-- 7. SEED TRANSACTION & RECEIPT HISTORY FOR SETTLED AMOUNTS
-- Payment for Aarav Meena (STU-0412) - ₹30,000 Paid
INSERT INTO payments (id, transaction_ref, student_id, gateway_name, payment_mode, amount_paise, status, captured_at)
VALUES (
    'p0412000-0000-0000-0000-000000000412',
    'TXN-20261008-0412',
    's0412000-0000-0000-0000-000000000412',
    'OFFLINE_BANK_TRANSFER',
    'NEFT_RTGS',
    3000000,
    'SUCCESS',
    '2026-10-08 14:30:00+05:30'
)
ON CONFLICT (transaction_ref) DO NOTHING;

INSERT INTO payment_allocations (id, payment_id, fee_instalment_id, allocated_amount_paise)
VALUES (
    'pal04120-0000-0000-0000-000000000412',
    'p0412000-0000-0000-0000-000000000412',
    'i0412000-0000-0000-0000-000000000412',
    3000000
)
ON CONFLICT (payment_id, fee_instalment_id) DO NOTHING;

INSERT INTO receipts (id, receipt_number, payment_id, student_id, amount_paise, receipt_date, verification_hash)
VALUES (
    'r0412000-0000-0000-0000-000000000412',
    'REC-2026-C1-000412',
    'p0412000-0000-0000-0000-000000000412',
    's0412000-0000-0000-0000-000000000412',
    3000000,
    '2026-10-08',
    'sha256_mock_hash_0412_aarav_meena_verified'
)
ON CONFLICT (receipt_number) DO NOTHING;

-- Payment for Ishita Sharma (STU-0587) - ₹15,000 Paid (Partial)
INSERT INTO payments (id, transaction_ref, student_id, gateway_name, payment_mode, amount_paise, status, captured_at)
VALUES (
    'p0587000-0000-0000-0000-000000000587',
    'TXN-20261009-0587',
    's0587000-0000-0000-0000-000000000587',
    'MOCK',
    'UPI',
    1500000,
    'SUCCESS',
    '2026-10-09 11:15:00+05:30'
)
ON CONFLICT (transaction_ref) DO NOTHING;

INSERT INTO payment_allocations (id, payment_id, fee_instalment_id, allocated_amount_paise)
VALUES (
    'pal05870-0000-0000-0000-000000000587',
    'p0587000-0000-0000-0000-000000000587',
    'i0587000-0000-0000-0000-000000000587',
    1500000
)
ON CONFLICT (payment_id, fee_instalment_id) DO NOTHING;

INSERT INTO receipts (id, receipt_number, payment_id, student_id, amount_paise, receipt_date, verification_hash)
VALUES (
    'r0587000-0000-0000-0000-000000000587',
    'REC-2026-C1-000587',
    'p0587000-0000-0000-0000-000000000587',
    's0587000-0000-0000-0000-000000000587',
    1500000,
    '2026-10-09',
    'sha256_mock_hash_0587_ishita_sharma_verified'
)
ON CONFLICT (receipt_number) DO NOTHING;

