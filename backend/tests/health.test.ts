import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Health Check API', () => {
  const app = createApp();

  it('GET /health returns 200 with standard response envelope', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.database).toBeDefined();
    expect(typeof res.body.data.database.isConfigured).toBe('boolean');
    expect(typeof res.body.data.database.connected).toBe('boolean');
    expect(res.body.meta.timestamp).toBeDefined();
  });

  it('GET /api/v1/health returns 200 and matches root health check', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('GET /non-existent-route returns 404 NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Endpoint GET /api/v1/unknown-endpoint not found');
  });
});

