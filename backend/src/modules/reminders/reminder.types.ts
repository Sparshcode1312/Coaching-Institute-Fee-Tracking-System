export type ReminderStage =
  | 'T_MINUS_7'
  | 'T_MINUS_3'
  | 'T_ZERO'
  | 'T_PLUS_3'
  | 'T_PLUS_7';

export type ReminderChannel = 'WHATSAPP' | 'SMS';

export type ReminderJobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type DeliveryStatus =
  | 'DELIVERED_MOCK'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUPPRESSED_ALREADY_PAID';

export interface ReminderJob {
  id: string;
  instalmentId: string;
  studentId: string;
  scheduledFor: string; // YYYY-MM-DD
  stage: ReminderStage;
  status: ReminderJobStatus;
  channel: ReminderChannel;
  language: 'en' | 'hi';
  amountPaise: bigint;
  dueDate: string;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

export interface ReminderLog {
  id: string;
  jobId?: string | null;
  studentId: string;
  studentRoll: string;
  studentName: string;
  recipientPhone: string;
  channel: ReminderChannel;
  stage: ReminderStage;
  language: 'en' | 'hi';
  outstandingAmountPaise: bigint;
  dueDate: string;
  paymentLink: string;
  messageBody: string;
  status: DeliveryStatus;
  provider: string;
  dispatchedAt: string;
  failureReason?: string | null;
}

export interface ReminderTemplateParams {
  studentName: string;
  studentRoll: string;
  instalmentNumber: number;
  dueDate: string;
  outstandingAmountPaise: bigint;
  paymentLink: string;
  stage: ReminderStage;
  language: 'en' | 'hi';
}

