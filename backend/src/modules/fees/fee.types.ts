import { PaymentStatus } from './fee.calculator.js';
import { DueStatus } from '../../utils/date.js';

export interface FeePlanScheduleBlueprint {
  instalmentNumber: number;
  amountPaise: number;
  description: string;
}

export interface StudentFeeSummaryDTO {
  student: {
    id: string;
    rollNumber: string;
    fullName: string;
    enrolmentStatus: string;
    centre: {
      id: string;
      code: string;
      name: string;
    };
    batch: {
      id: string;
      code: string;
      name: string;
      stream: string;
    };
  };
  feePlan: {
    id: string;
    code: string;
    name: string;
    instalmentCount: number;
  };
  financials: {
    originalFeePaise: number;
    discountsPaise: number;
    finalPayableAmountPaise: number;
    totalAmountPaidPaise: number;
    outstandingBalancePaise: number;
    totalOverdueDays: number;
  };
  instalments: Array<{
    id: string;
    instalmentNumber: number;
    baseAmountPaise: number;
    discountAmountPaise: number;
    netPayablePaise: number;
    allocatedAmountPaise: number;
    outstandingPaise: number;
    dueDate: string;
    graceUntil: string;
    overdueDays: number;
    paymentStatus: PaymentStatus;
    dueStatus: DueStatus;
  }>;
  paymentHistory: Array<{
    id: string;
    transactionRef: string;
    paymentMode: string;
    gatewayName: string;
    amountPaise: number;
    status: string;
    capturedAt: string | null;
    receipt: {
      id: string;
      receiptNumber: string;
      receiptDate: string;
      verificationHash: string;
    } | null;
    allocations: Array<{
      instalmentNumber: number;
      allocatedAmountPaise: number;
    }>;
  }>;
}

