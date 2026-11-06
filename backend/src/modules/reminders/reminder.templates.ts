import { ReminderTemplateParams } from './reminder.types.js';

export function formatRupees(paise: bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function renderReminderMessage(params: ReminderTemplateParams): string {
  const amountStr = formatRupees(params.outstandingAmountPaise);

  if (params.language === 'hi') {
    switch (params.stage) {
      case 'T_MINUS_7':
      case 'T_MINUS_3':
        return `नमस्ते! आपके बच्चे (${params.studentName}, रोल नं: ${params.studentRoll}) की फीस किस्त ${params.instalmentNumber} (${amountStr}) की भुगतान तिथि (${params.dueDate}) नजदीक है। कृपया समय पर भुगतान करें। भुगतान लिंक: ${params.paymentLink}`;

      case 'T_ZERO':
        return `नमस्ते! आपके बच्चे (${params.studentName}) की फीस किस्त ${params.instalmentNumber} (${amountStr}) का भुगतान आज (${params.dueDate}) देय है। कृपया आज ही भुगतान पूरा करें। भुगतान लिंक: ${params.paymentLink}`;

      case 'T_PLUS_3':
      case 'T_PLUS_7':
      default:
        return `नमस्ते! आपके बच्चे (${params.studentName}) की फीस किस्त ${params.instalmentNumber} (${amountStr}) की भुगतान तिथि (${params.dueDate}) बीत चुकी है और यह विलंबित है। कृपया तत्काल भुगतान करें। भुगतान लिंक: ${params.paymentLink}`;
    }
  }

  // Default: English
  switch (params.stage) {
    case 'T_MINUS_7':
    case 'T_MINUS_3':
      return `Dear Parent, your child's fee instalment of ${amountStr} for ${params.studentName} (${params.studentRoll}) is approaching its due date (${params.dueDate}). Please complete the payment using your secure payment link: ${params.paymentLink}`;

    case 'T_ZERO':
      return `Dear Parent, your child's fee instalment of ${amountStr} for ${params.studentName} is due today (${params.dueDate}). Please complete the payment using your secure payment link: ${params.paymentLink}`;

    case 'T_PLUS_3':
    case 'T_PLUS_7':
    default:
      return `Dear Parent, your child's fee instalment of ${amountStr} for ${params.studentName} was due on ${params.dueDate} and is currently overdue. Please pay immediately using your secure payment link: ${params.paymentLink}`;
  }
}

