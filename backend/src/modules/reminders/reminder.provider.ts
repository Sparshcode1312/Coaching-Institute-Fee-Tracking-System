import { logger } from '../../utils/logger.js';
import { ReminderChannel, DeliveryStatus } from './reminder.types.js';

export interface SendMessageParams {
  recipientPhone: string;
  channel: ReminderChannel;
  messageBody: string;
  studentRoll: string;
  simulateFailure?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
  provider: string;
  status: DeliveryStatus;
  dispatchedAt: string;
  errorReason?: string;
  isMock: true;
}

export class MockMessageProvider {
  readonly providerName = 'MOCK_WHATSAPP_SMS';

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    const timestamp = new Date().toISOString();
    const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (params.simulateFailure) {
      logger.warn('[MOCK PROVIDER] Simulated upstream gateway failure for testing retries', {
        recipientPhone: params.recipientPhone,
        channel: params.channel,
      });

      return {
        success: false,
        messageId,
        provider: this.providerName,
        status: 'FAILED',
        dispatchedAt: timestamp,
        errorReason: 'SIMULATED_UPSTREAM_NETWORK_TIMEOUT',
        isMock: true,
      };
    }

    logger.info(`[MOCK PROVIDER] Simulated ${params.channel} delivery dispatched to +91${params.recipientPhone}`, {
      messageId,
      studentRoll: params.studentRoll,
      preview: params.messageBody.substring(0, 60) + '...',
      provider: this.providerName,
      isMock: true,
    });

    return {
      success: true,
      messageId,
      provider: this.providerName,
      status: 'DELIVERED_MOCK',
      dispatchedAt: timestamp,
      isMock: true,
    };
  }
}

export const mockMessageProvider = new MockMessageProvider();

