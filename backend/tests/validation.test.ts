import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Validation Middleware & Schemas', () => {
  const app = createApp();

  describe('Parent OTP Request Validation', () => {
    it('rejects invalid mobile numbers with 422 VALIDATION_ERROR', async () => {
      const invalidPhones = ['12345', '98290', 'abcdefghij', '5829012345', '98290123456', ''];

      for (const phone of invalidPhones) {
        const res = await request(app)
          .post('/api/v1/auth/parent/request-otp')
          .send({ phone });

        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(res.body.error.details)).toBe(true);
      }
    });

    it('accepts valid 10-digit Indian mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/request-otp')
        .send({ phone: '9829012345' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('9829012345');
      expect(res.body.data.expiresInSeconds).toBe(300);
      // Ensure no OTP secret is exposed!
      expect(res.body.data.otp).toBeUndefined();
    });
  });

  describe('Parent OTP Verification Validation', () => {
    it('rejects invalid OTP formats with 422', async () => {
      const invalidOtps = ['123', '12345', '1234567', 'abcdef', '12a456', ''];

      for (const otp of invalidOtps) {
        const res = await request(app)
          .post('/api/v1/auth/parent/verify-otp')
          .send({ phone: '9829012345', otp });

        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('rejects incorrect OTP code with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/verify-otp')
        .send({ phone: '9829012345', otp: '000000' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Invalid or expired OTP code');
    });
  });

  describe('Staff Login Validation', () => {
    it('rejects invalid email formats', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects short passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'staff@companya.in', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Malformed JSON Handling', () => {
    it('returns 400 INVALID_JSON on broken syntax', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/request-otp')
        .set('Content-Type', 'application/json')
        .send('{"phone": 9829012345'); // missing closing brace

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });
  });
});

