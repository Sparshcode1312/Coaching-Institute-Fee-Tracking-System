import { getSupabaseAdmin } from '../../config/supabase.js';
import { isLiveSupabaseConfigured } from '../../config/env.js';

export interface StudentRecord {
  id: string;
  rollNumber: string;
  fullName: string;
  enrolmentStatus: string;
  centreId: string;
  centreCode: string;
  centreName: string;
  batchId: string;
  batchCode: string;
  batchName: string;
  stream: string;
  parentPhone?: string;
}

export interface FeeAssignmentRecord {
  id: string;
  studentId: string;
  feePlanId: string;
  feePlanCode: string;
  feePlanName: string;
  instalmentCount: number;
  grossFeePaise: bigint;
  totalDiscountPaise: bigint;
  netFeePaise: bigint;
}

export interface InstalmentRecord {
  id: string;
  studentFeeAssignmentId: string;
  studentId: string;
  instalmentNumber: number;
  baseAmountPaise: bigint;
  discountAmountPaise: bigint;
  netPayablePaise: bigint;
  settledAmountPaise: bigint;
  dueDate: string;
  graceUntil: string;
}

export interface PaymentWithAllocationsRecord {
  id: string;
  transactionRef: string;
  studentId: string;
  gatewayName: string;
  paymentMode: string;
  amountPaise: bigint;
  status: string;
  capturedAt: string | null;
  receipt?: {
    id: string;
    receiptNumber: string;
    receiptDate: string;
    verificationHash: string;
  } | null;
  allocations: Array<{
    instalmentId: string;
    instalmentNumber: number;
    allocatedAmountPaise: bigint;
  }>;
}

const createInitialState = () => ({
  students: new Map<string, StudentRecord>([
    [
      's0412000-0000-0000-0000-000000000412',
      {
        id: 's0412000-0000-0000-0000-000000000412',
        rollNumber: 'STU-0412',
        fullName: 'Aarav Meena',
        enrolmentStatus: 'ACTIVE',
        centreId: 'c1111111-1111-1111-1111-111111111111',
        centreCode: 'JPR-C1',
        centreName: 'Jaipur Centre 1',
        batchId: 'b1111111-1111-1111-1111-111111111111',
        batchCode: 'BATCH-JEE-2027-MORN',
        batchName: 'JEE 2027 Morning',
        stream: 'JEE',
        parentPhone: '9829010412',
      },
    ],
    [
      's0587000-0000-0000-0000-000000000587',
      {
        id: 's0587000-0000-0000-0000-000000000587',
        rollNumber: 'STU-0587',
        fullName: 'Ishita Sharma',
        enrolmentStatus: 'ACTIVE',
        centreId: 'c1111111-1111-1111-1111-111111111111',
        centreCode: 'JPR-C1',
        centreName: 'Jaipur Centre 1',
        batchId: 'b2222222-2222-2222-2222-222222222222',
        batchCode: 'BATCH-JEE-2027-EVE',
        batchName: 'JEE 2027 Evening',
        stream: 'JEE',
        parentPhone: '9829010587',
      },
    ],
    [
      's0219000-0000-0000-0000-000000000219',
      {
        id: 's0219000-0000-0000-0000-000000000219',
        rollNumber: 'STU-0219',
        fullName: 'Mohit Gurjar',
        enrolmentStatus: 'ACTIVE',
        centreId: 'c2222222-2222-2222-2222-222222222222',
        centreCode: 'JPR-C2',
        centreName: 'Jaipur Centre 2',
        batchId: 'b3333333-3333-3333-3333-333333333333',
        batchCode: 'BATCH-NEET-2027-MORN',
        batchName: 'NEET 2027 Morning',
        stream: 'NEET',
        parentPhone: '9829010219',
      },
    ],
  ]),

  assignments: new Map<string, FeeAssignmentRecord>([
    [
      's0412000-0000-0000-0000-000000000412',
      {
        id: 'a0412000-0000-0000-0000-000000000412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        feePlanId: 'f1111111-1111-1111-1111-111111111111',
        feePlanCode: 'PLAN-JEE-4INST',
        feePlanName: 'Standard JEE 4-Instalment Fee Plan',
        instalmentCount: 4,
        grossFeePaise: 12000000n,
        totalDiscountPaise: 0n,
        netFeePaise: 12000000n,
      },
    ],
    [
      's0587000-0000-0000-0000-000000000587',
      {
        id: 'a0587000-0000-0000-0000-000000000587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        feePlanId: 'f1111111-1111-1111-1111-111111111111',
        feePlanCode: 'PLAN-JEE-4INST',
        feePlanName: 'Standard JEE 4-Instalment Fee Plan',
        instalmentCount: 4,
        grossFeePaise: 12000000n,
        totalDiscountPaise: 0n,
        netFeePaise: 12000000n,
      },
    ],
    [
      's0219000-0000-0000-0000-000000000219',
      {
        id: 'a0219000-0000-0000-0000-000000000219',
        studentId: 's0219000-0000-0000-0000-000000000219',
        feePlanId: 'f2222222-2222-2222-2222-222222222222',
        feePlanCode: 'PLAN-NEET-3INST',
        feePlanName: 'Standard NEET 3-Instalment Fee Plan',
        instalmentCount: 3,
        grossFeePaise: 12000000n,
        totalDiscountPaise: 0n,
        netFeePaise: 12000000n,
      },
    ],
  ]),

  instalments: new Map<string, InstalmentRecord>([
    // STU-0412 Aarav Meena: 4 milestones of ₹30,000 = ₹1,20,000
    [
      'i0412000-0000-0000-0000-000000000412',
      {
        id: 'i0412000-0000-0000-0000-000000000412',
        studentFeeAssignmentId: 'a0412000-0000-0000-0000-000000000412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        instalmentNumber: 1,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 3000000n, // ₹30,000 settled
        dueDate: '2026-10-10',
        graceUntil: '2026-10-15',
      },
    ],
    [
      'i0412000-0000-0000-0000-000000000413',
      {
        id: 'i0412000-0000-0000-0000-000000000413',
        studentFeeAssignmentId: 'a0412000-0000-0000-0000-000000000412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        instalmentNumber: 2,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-01-15',
        graceUntil: '2027-01-20',
      },
    ],
    [
      'i0412000-0000-0000-0000-000000000414',
      {
        id: 'i0412000-0000-0000-0000-000000000414',
        studentFeeAssignmentId: 'a0412000-0000-0000-0000-000000000412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        instalmentNumber: 3,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-04-10',
        graceUntil: '2027-04-15',
      },
    ],
    [
      'i0412000-0000-0000-0000-000000000415',
      {
        id: 'i0412000-0000-0000-0000-000000000415',
        studentFeeAssignmentId: 'a0412000-0000-0000-0000-000000000412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        instalmentNumber: 4,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-07-10',
        graceUntil: '2027-07-15',
      },
    ],

    // STU-0587 Ishita Sharma: 4 milestones of ₹30,000 = ₹1,20,000
    [
      'i0587000-0000-0000-0000-000000000587',
      {
        id: 'i0587000-0000-0000-0000-000000000587',
        studentFeeAssignmentId: 'a0587000-0000-0000-0000-000000000587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        instalmentNumber: 1,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 1500000n, // ₹15,000 settled
        dueDate: '2026-10-10',
        graceUntil: '2026-10-15',
      },
    ],
    [
      'i0587000-0000-0000-0000-000000000588',
      {
        id: 'i0587000-0000-0000-0000-000000000588',
        studentFeeAssignmentId: 'a0587000-0000-0000-0000-000000000587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        instalmentNumber: 2,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-01-15',
        graceUntil: '2027-01-20',
      },
    ],
    [
      'i0587000-0000-0000-0000-000000000589',
      {
        id: 'i0587000-0000-0000-0000-000000000589',
        studentFeeAssignmentId: 'a0587000-0000-0000-0000-000000000587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        instalmentNumber: 3,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-04-10',
        graceUntil: '2027-04-15',
      },
    ],
    [
      'i0587000-0000-0000-0000-000000000590',
      {
        id: 'i0587000-0000-0000-0000-000000000590',
        studentFeeAssignmentId: 'a0587000-0000-0000-0000-000000000587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        instalmentNumber: 4,
        baseAmountPaise: 3000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 3000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-07-10',
        graceUntil: '2027-07-15',
      },
    ],

    // STU-0219 Mohit Gurjar: 3 milestones of ₹40,000 = ₹1,20,000
    [
      'i0219000-0000-0000-0000-000000000219',
      {
        id: 'i0219000-0000-0000-0000-000000000219',
        studentFeeAssignmentId: 'a0219000-0000-0000-0000-000000000219',
        studentId: 's0219000-0000-0000-0000-000000000219',
        instalmentNumber: 1,
        baseAmountPaise: 4000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 4000000n,
        settledAmountPaise: 0n,
        dueDate: '2026-11-15',
        graceUntil: '2026-11-20',
      },
    ],
    [
      'i0219000-0000-0000-0000-000000000220',
      {
        id: 'i0219000-0000-0000-0000-000000000220',
        studentFeeAssignmentId: 'a0219000-0000-0000-0000-000000000219',
        studentId: 's0219000-0000-0000-0000-000000000219',
        instalmentNumber: 2,
        baseAmountPaise: 4000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 4000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-02-15',
        graceUntil: '2027-02-20',
      },
    ],
    [
      'i0219000-0000-0000-0000-000000000221',
      {
        id: 'i0219000-0000-0000-0000-000000000219',
        studentFeeAssignmentId: 'a0219000-0000-0000-0000-000000000219',
        studentId: 's0219000-0000-0000-0000-000000000219',
        instalmentNumber: 3,
        baseAmountPaise: 4000000n,
        discountAmountPaise: 0n,
        netPayablePaise: 4000000n,
        settledAmountPaise: 0n,
        dueDate: '2027-05-15',
        graceUntil: '2027-05-20',
      },
    ],
  ]),

  payments: new Map<string, PaymentWithAllocationsRecord>([
    [
      'p0412000-0000-0000-0000-000000000412',
      {
        id: 'p0412000-0000-0000-0000-000000000412',
        transactionRef: 'TXN-20261008-0412',
        studentId: 's0412000-0000-0000-0000-000000000412',
        gatewayName: 'OFFLINE_BANK_TRANSFER',
        paymentMode: 'NEFT_RTGS',
        amountPaise: 3000000n,
        status: 'SUCCESS',
        capturedAt: '2026-10-08T09:00:00Z',
        receipt: {
          id: 'r0412000-0000-0000-0000-000000000412',
          receiptNumber: 'REC-2026-C1-000412',
          receiptDate: '2026-10-08',
          verificationHash: 'sha256_mock_hash_0412_aarav_meena_verified',
        },
        allocations: [
          {
            instalmentId: 'i0412000-0000-0000-0000-000000000412',
            instalmentNumber: 1,
            allocatedAmountPaise: 3000000n,
          },
        ],
      },
    ],
    [
      'p0587000-0000-0000-0000-000000000587',
      {
        id: 'p0587000-0000-0000-0000-000000000587',
        transactionRef: 'TXN-20261009-0587',
        studentId: 's0587000-0000-0000-0000-000000000587',
        gatewayName: 'MOCK',
        paymentMode: 'UPI',
        amountPaise: 1500000n,
        status: 'SUCCESS',
        capturedAt: '2026-10-09T05:45:00Z',
        receipt: {
          id: 'r0587000-0000-0000-0000-000000000587',
          receiptNumber: 'REC-2026-C1-000587',
          receiptDate: '2026-10-09',
          verificationHash: 'sha256_mock_hash_0587_ishita_sharma_verified',
        },
        allocations: [
          {
            instalmentId: 'i0587000-0000-0000-0000-000000000587',
            instalmentNumber: 1,
            allocatedAmountPaise: 1500000n,
          },
        ],
      },
    ],
  ]),
});

let currentState = createInitialState();

export const inMemoryFeeStore = {
  get students() {
    return currentState.students;
  },
  get assignments() {
    return currentState.assignments;
  },
  get instalments() {
    return currentState.instalments;
  },
  get payments() {
    return currentState.payments;
  },
};

export const resetInMemoryFeeStore = () => {
  currentState = createInitialState();
};

export class FeeRepository {
  async getStudentByIdOrRoll(identifier: string): Promise<StudentRecord | null> {
    if (!isLiveSupabaseConfigured()) {
      for (const student of inMemoryFeeStore.students.values()) {
        if (student.id === identifier || student.rollNumber === identifier) {
          return student;
        }
      }
      return null;
    }

    const admin = getSupabaseAdmin();
    const query = admin
      .from('students')
      .select(`
        id,
        roll_number,
        full_name,
        enrolment_status,
        centre:centres ( id, code, name ),
        batch:batches ( id, code, name, stream )
      `);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const { data, error } = isUuid
      ? await query.eq('id', identifier).single()
      : await query.eq('roll_number', identifier).single();

    if (error || !data) return null;

    const s = data as any;
    return {
      id: s.id,
      rollNumber: s.roll_number,
      fullName: s.full_name,
      enrolmentStatus: s.enrolment_status,
      centreId: s.centre.id,
      centreCode: s.centre.code,
      centreName: s.centre.name,
      batchId: s.batch.id,
      batchCode: s.batch.code,
      batchName: s.batch.name,
      stream: s.batch.stream,
    };
  }

  async getFeeAssignmentByStudentId(studentId: string): Promise<FeeAssignmentRecord | null> {
    if (!isLiveSupabaseConfigured()) {
      return inMemoryFeeStore.assignments.get(studentId) || null;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('student_fee_assignments')
      .select(`
        id,
        student_id,
        gross_fee_paise,
        total_discount_paise,
        net_fee_paise,
        fee_plan:fee_plans ( id, code, name, instalment_count )
      `)
      .eq('student_id', studentId)
      .single();

    if (error || !data) return null;
    const a = data as any;
    return {
      id: a.id,
      studentId: a.student_id,
      feePlanId: a.fee_plan.id,
      feePlanCode: a.fee_plan.code,
      feePlanName: a.fee_plan.name,
      instalmentCount: a.fee_plan.instalment_count,
      grossFeePaise: BigInt(a.gross_fee_paise),
      totalDiscountPaise: BigInt(a.total_discount_paise),
      netFeePaise: BigInt(a.net_fee_paise),
    };
  }

  async getInstalmentsByStudentId(studentId: string): Promise<InstalmentRecord[]> {
    if (!isLiveSupabaseConfigured()) {
      const results: InstalmentRecord[] = [];
      for (const inst of inMemoryFeeStore.instalments.values()) {
        if (inst.studentId === studentId) {
          results.push(inst);
        }
      }
      return results.sort((a, b) => a.instalmentNumber - b.instalmentNumber);
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('fee_instalments')
      .select('*')
      .eq('student_id', studentId)
      .order('instalment_number', { ascending: true });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      studentFeeAssignmentId: d.student_fee_assignment_id,
      studentId: d.student_id,
      instalmentNumber: d.instalment_number,
      baseAmountPaise: BigInt(d.base_amount_paise),
      discountAmountPaise: BigInt(d.discount_amount_paise),
      netPayablePaise: BigInt(d.net_payable_paise),
      settledAmountPaise: BigInt(d.settled_amount_paise),
      dueDate: d.due_date,
      graceUntil: d.grace_until,
    }));
  }

  async getPaymentsByStudentId(studentId: string): Promise<PaymentWithAllocationsRecord[]> {
    if (!isLiveSupabaseConfigured()) {
      const results: PaymentWithAllocationsRecord[] = [];
      for (const p of inMemoryFeeStore.payments.values()) {
        if (p.studentId === studentId) {
          results.push(p);
        }
      }
      return results;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('payments')
      .select(`
        id,
        transaction_ref,
        student_id,
        gateway_name,
        payment_mode,
        amount_paise,
        status,
        captured_at,
        receipts ( id, receipt_number, receipt_date, verification_hash ),
        payment_allocations (
          fee_instalment_id,
          allocated_amount_paise,
          fee_instalments ( instalment_number )
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      transactionRef: p.transaction_ref,
      studentId: p.student_id,
      gatewayName: p.gateway_name,
      paymentMode: p.payment_mode,
      amountPaise: BigInt(p.amount_paise),
      status: p.status,
      capturedAt: p.captured_at,
      receipt: p.receipts?.[0]
        ? {
            id: p.receipts[0].id,
            receiptNumber: p.receipts[0].receipt_number,
            receiptDate: p.receipts[0].receipt_date,
            verificationHash: p.receipts[0].verification_hash,
          }
        : null,
      allocations: (p.payment_allocations || []).map((a: any) => ({
        instalmentId: a.fee_instalment_id,
        instalmentNumber: a.fee_instalments?.instalment_number || 1,
        allocatedAmountPaise: BigInt(a.allocated_amount_paise),
      })),
    }));
  }

  async getInstalmentById(instalmentId: string): Promise<InstalmentRecord | null> {
    if (!isLiveSupabaseConfigured()) {
      return inMemoryFeeStore.instalments.get(instalmentId) || null;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('fee_instalments')
      .select('*')
      .eq('id', instalmentId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      studentFeeAssignmentId: data.student_fee_assignment_id,
      studentId: data.student_id,
      instalmentNumber: data.instalment_number,
      baseAmountPaise: BigInt(data.base_amount_paise),
      discountAmountPaise: BigInt(data.discount_amount_paise),
      netPayablePaise: BigInt(data.net_payable_paise),
      settledAmountPaise: BigInt(data.settled_amount_paise),
      dueDate: data.due_date,
      graceUntil: data.grace_until,
    };
  }

  async updateInstalmentSettledAmount(instalmentId: string, newSettledPaise: bigint): Promise<void> {
    if (!isLiveSupabaseConfigured()) {
      const inst = inMemoryFeeStore.instalments.get(instalmentId);
      if (inst) {
        inst.settledAmountPaise = newSettledPaise;
      }
      return;
    }

    const admin = getSupabaseAdmin();
    await admin
      .from('fee_instalments')
      .update({ settled_amount_paise: Number(newSettledPaise) })
      .eq('id', instalmentId);
  }
}

export const feeRepository = new FeeRepository();
