import crypto from 'crypto';
import { isLiveSupabaseConfigured } from '../../config/env.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import { AuditLogEntry, CreateAuditLogInput } from './audit.types.js';

// In-Memory store for audit logs (fast querying & mock fallback)
export const inMemoryAuditStore: AuditLogEntry[] = [];

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'otp',
  'token',
  'secret',
  'signature',
  'cvv',
  'cardnumber',
  'authorization',
  'auth_token',
]);

function sanitizeObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export class AuditService {
  async log(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      actorId: input.actorId || '00000000-0000-0000-0000-000000000000',
      actorRole: input.actorRole || 'SYSTEM',
      action: input.action,
      entityName: input.entityName,
      entityId: input.entityId,
      oldState: (sanitizeObject(input.oldState) as Record<string, unknown>) || null,
      newState: (sanitizeObject(input.newState) as Record<string, unknown>) || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      timestamp: new Date().toISOString(),
    };

    inMemoryAuditStore.push(entry);

    logger.info(`[AUDIT] ${entry.action} on ${entry.entityName}:${entry.entityId}`, {
      action: entry.action,
      actor: `${entry.actorRole}:${entry.actorId}`,
    });

    // Asynchronously attempt Supabase persistence if connected
    if (isLiveSupabaseConfigured()) {
      const admin = getSupabaseAdmin();
      admin
        .from('audit_logs')
        .insert({
          id: entry.id,
          actor_id: entry.actorId !== '00000000-0000-0000-0000-000000000000' ? entry.actorId : null,
          action: entry.action,
          entity_name: entry.entityName,
          entity_id: entry.entityId.length === 36 ? entry.entityId : null,
          old_state: entry.oldState,
          new_state: entry.newState,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          created_at: entry.timestamp,
        })
        .then(({ error }: { error: unknown }) => {
          if (error) {
            logger.debug('Audit log Supabase sync skipped or failed', { error });
          }
        });
    }

    return entry;
  }

  async getLogs(filters?: {
    action?: string;
    entityName?: string;
    entityId?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let result = [...inMemoryAuditStore];

    if (filters?.action) {
      result = result.filter((l) => l.action === filters.action);
    }
    if (filters?.entityName) {
      result = result.filter((l) => l.entityName === filters.entityName);
    }
    if (filters?.entityId) {
      result = result.filter((l) => l.entityId === filters.entityId);
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const limit = filters?.limit || 100;
    return result.slice(0, limit);
  }
}

export const auditService = new AuditService();
