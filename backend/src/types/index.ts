// =============================================================================
// Core Domain Types & DTO Interfaces
// =============================================================================

export type UserRole = 'parent' | 'accounts_executive' | 'super_admin';

export type EnrolmentStatus = 'ACTIVE' | 'PROVISIONAL' | 'DROPOUT_RISK' | 'WITHDRAWN' | 'COMPLETED';

export type InstalmentStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED';

export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'USER_DROPPED' | 'REFUNDED';

export type PaymentMode = 'ONLINE' | 'UPI' | 'CARD' | 'NETBANKING' | 'CASH' | 'CHEQUE' | 'DEMAND_DRAFT' | 'NEFT_RTGS';

export type GatewayName = 'MOCK' | 'RAZORPAY' | 'OFFLINE_CASH' | 'OFFLINE_CHEQUE' | 'OFFLINE_BANK_TRANSFER';

export type RelationshipType = 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN';

export interface AuthenticatedUser {
  id: string; // profiles.id or auth_user_id
  authUserId: string;
  phone: string;
  email?: string;
  fullName: string;
  role: UserRole;
  assignedCentres?: string[]; // IDs of centres accessible if accounts_executive
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

