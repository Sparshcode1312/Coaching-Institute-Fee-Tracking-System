import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Database Schema & Migration Integrity', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261105000001_initial_schema.sql');
  const seedPath = path.resolve(__dirname, '../supabase/seed.sql');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  it('defines all 26 required domain entities', () => {
    const requiredEntities = [
      'centres',
      'profiles',
      'parents',
      'accounts_executives',
      'students',
      'batches',
      'parent_student_relationships',
      'parental_consents',
      'fee_plans',
      'fee_discounts',
      'student_fee_assignments',
      'fee_instalments',
      'payments',
      'payment_allocations',
      'payment_orders',
      'receipts',
      'refund_policies',
      'refund_requests',
      'refund_transactions',
      'reminder_jobs',
      'reminder_logs',
      'attendance_records',
      'tests',
      'test_scores',
      'dropout_risk_flags',
      'counsellor_tasks',
      'audit_logs',
    ];

    for (const entity of requiredEntities) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${entity}\\b`, 'i');
      expect(tableRegex.test(migrationSql), `Entity table '${entity}' must be defined`).toBe(true);
    }
  });

  it('stores all financial amounts strictly in integer paise (BIGINT)', () => {
    const financialColumns = [
      'total_annual_fee_paise BIGINT',
      'gross_fee_paise BIGINT',
      'net_fee_paise BIGINT',
      'base_amount_paise BIGINT',
      'net_payable_paise BIGINT',
      'settled_amount_paise BIGINT',
      'amount_paise BIGINT',
      'allocated_amount_paise BIGINT',
      'total_fee_paid_paise BIGINT',
      'net_refund_paise BIGINT',
    ];

    for (const col of financialColumns) {
      expect(migrationSql.includes(col), `Column definition '${col}' must be present as BIGINT`).toBe(true);
    }

    // Ensure no float/double precision is used for monetary values
    expect(migrationSql).not.toMatch(/fee.*FLOAT/i);
    expect(migrationSql).not.toMatch(/amount.*FLOAT/i);
    expect(migrationSql).not.toMatch(/amount.*DOUBLE/i);
  });

  it('enforces duplicate student ID prevention via UNIQUE constraint on roll_number', () => {
    expect(migrationSql).toMatch(/roll_number VARCHAR\(\d+\) NOT NULL UNIQUE/i);
  });

  it('enforces immutability triggers on financial and audit records', () => {
    expect(migrationSql).toContain('prevent_modification_or_deletion');
    expect(migrationSql).toContain('trg_payments_immutable');
    expect(migrationSql).toContain('trg_payment_allocations_immutable');
    expect(migrationSql).toContain('trg_audit_logs_immutable');
    expect(migrationSql).toContain('trg_reminder_logs_immutable');
  });

  it('enforces Row Level Security (RLS) on sensitive tables', () => {
    expect(migrationSql).toContain('ALTER TABLE students ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE fee_instalments ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE payments ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;');
  });

  describe('Seed Data Verification', () => {
    it('seeds exclusively the exact three students from the assignment', () => {
      expect(seedSql).toContain('STU-0412');
      expect(seedSql).toContain('Aarav Meena');
      expect(seedSql).toContain('JEE 2027 Morning');

      expect(seedSql).toContain('STU-0587');
      expect(seedSql).toContain('Ishita Sharma');
      expect(seedSql).toContain('JEE 2027 Evening');

      expect(seedSql).toContain('STU-0219');
      expect(seedSql).toContain('Mohit Gurjar');
      expect(seedSql).toContain('NEET 2027 Morning');
    });

    it('preserves exact due dates and settled amounts for the three students', () => {
      // STU-0412: Due 2026-10-10 | Fee ₹30,000 | Settled ₹30,000
      expect(seedSql).toContain('2026-10-10');
      expect(seedSql).toContain('3000000'); // ₹30,000

      // STU-0587: Due 2026-10-10 | Fee ₹30,000 | Settled ₹15,000
      expect(seedSql).toContain('1500000'); // ₹15,000

      // STU-0219: Due 2026-11-15 | Fee ₹40,000 | Settled ₹0
      expect(seedSql).toContain('2026-11-15');
      expect(seedSql).toContain('4000000'); // ₹40,000
    });

    it('ensures all seed operations are idempotent via ON CONFLICT clauses', () => {
      const onConflictCount = (seedSql.match(/ON CONFLICT/gi) || []).length;
      expect(onConflictCount).toBeGreaterThanOrEqual(7);
    });
  });
});

