export type AuditAction =
  | 'FEE_PLAN_CREATED'
  | 'FEE_PLAN_UPDATED'
  | 'DISCOUNT_APPLIED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_FAILED'
  | 'REFUND_CALCULATED'
  | 'REFUND_REQUESTED'
  | 'REFUND_APPROVED'
  | 'REFUND_REJECTED'
  | 'REFUND_DISBURSED'
  | 'REMINDER_JOB_CREATED'
  | 'REMINDER_DISPATCHED'
  | 'REMINDER_CANCELLED'
  | 'REMINDER_RECALCULATED'
  | 'DATA_IMPORTED_ATTENDANCE'
  | 'DATA_IMPORTED_TEST_SCORES'
  | 'USER_ROLE_CHANGED'
  | 'AI_RISK_EVALUATED'
  | 'AI_RISK_REVIEWED'
  | 'AI_RISK_FALSE_POSITIVE';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export interface CreateAuditLogInput {
  actorId?: string;
  actorRole?: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

