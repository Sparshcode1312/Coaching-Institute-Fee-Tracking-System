import { describe, it, expect } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { requireAuth } from '../src/middleware/auth.js';
import { requireRole, requireCentreAccess } from '../src/middleware/roleGuard.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { sendSuccess } from '../src/utils/response.js';

describe('Role Guard & Multi-Centre Data Isolation Middleware', () => {
  const app = express();
  app.use(express.json());

  // Test Route 1: Accounts Executive only
  app.get(
    '/api/test/accounts-only',
    requireAuth,
    requireRole('accounts_executive', 'super_admin'),
    (_req: Request, res: Response) => {
      sendSuccess(res, { access: 'granted_accounts' });
    }
  );

  // Test Route 2: Multi-Centre Isolated Endpoint (e.g. Centre Ledgers)
  app.get(
    '/api/test/centres/:centreId/ledgers',
    requireAuth,
    requireRole('accounts_executive', 'super_admin'),
    requireCentreAccess((req) => req.params.centreId),
    (req: Request, res: Response) => {
      sendSuccess(res, { centreId: req.params.centreId, access: 'granted_centre_isolation' });
    }
  );

  app.use(errorHandler);

  it('blocks parent from accessing accounts executive route with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/test/accounts-only')
      .set('Authorization', 'Bearer test-token-parent-9829010412');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain("Role 'parent' is not authorized");
  });

  it('allows accounts executive to access accounts route', async () => {
    const res = await request(app)
      .get('/api/test/accounts-only')
      .set('Authorization', 'Bearer test-token-accounts-staff');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access).toBe('granted_accounts');
  });

  it('allows accounts executive to access their authorized centre (Centre 1)', async () => {
    const res = await request(app)
      .get('/api/test/centres/c1111111-1111-1111-1111-111111111111/ledgers')
      .set('Authorization', 'Bearer test-token-accounts-staff');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access).toBe('granted_centre_isolation');
  });

  it('blocks accounts executive from accessing unauthorized centre (Centre 2) with 403', async () => {
    const res = await request(app)
      .get('/api/test/centres/c2222222-2222-2222-2222-222222222222/ledgers')
      .set('Authorization', 'Bearer test-token-accounts-staff');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('You are not assigned to centre');
  });

  it('allows super admin to access any centre without restriction', async () => {
    const res = await request(app)
      .get('/api/test/centres/c2222222-2222-2222-2222-222222222222/ledgers')
      .set('Authorization', 'Bearer test-token-admin-root');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access).toBe('granted_centre_isolation');
  });
});

