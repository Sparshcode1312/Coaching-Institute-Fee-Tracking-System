import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Authentication & Parent-Student Relationship Flow', () => {
  const app = createApp();

  describe('Parent Phone OTP Authentication Workflow', () => {
    it('initiates OTP challenge and does not expose OTP in response', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/request-otp')
        .send({ phone: '9829010412' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBeDefined();
      expect(res.body.data.otp).toBeUndefined(); // Security: never expose OTP in HTTP responses
    });

    it('verifies valid OTP, establishes session, and returns linked student for STU-0412', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/verify-otp')
        .send({ phone: '9829010412', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('parent');
      expect(res.body.data.linkedStudents).toBeDefined();
      expect(res.body.data.linkedStudents.length).toBe(1);
      expect(res.body.data.linkedStudents[0].rollNumber).toBe('STU-0412');
      expect(res.body.data.linkedStudents[0].fullName).toBe('Aarav Meena');
      expect(res.body.data.linkedStudents[0].batchName).toBe('JEE 2027 Morning');
    });

    it('verifies valid OTP and returns linked student for STU-0587', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/verify-otp')
        .send({ phone: '9829010587', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linkedStudents[0].rollNumber).toBe('STU-0587');
      expect(res.body.data.linkedStudents[0].fullName).toBe('Ishita Sharma');
      expect(res.body.data.linkedStudents[0].batchName).toBe('JEE 2027 Evening');
    });

    it('verifies valid OTP and returns linked student for STU-0219', async () => {
      const res = await request(app)
        .post('/api/v1/auth/parent/verify-otp')
        .send({ phone: '9829010219', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.linkedStudents[0].rollNumber).toBe('STU-0219');
      expect(res.body.data.linkedStudents[0].fullName).toBe('Mohit Gurjar');
      expect(res.body.data.linkedStudents[0].batchName).toBe('NEET 2027 Morning');
    });
  });

  describe('Session Token & Profile Inspection (/auth/me)', () => {
    it('returns 401 UNAUTHORIZED when Authorization header is absent', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns authenticated parent profile when valid Bearer token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer test-token-parent-9829010412');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('parent');
      expect(res.body.data.phone).toBe('9829010412');
    });
  });

  describe('Accounts Executive Authentication & Role Restrictions', () => {
    it('authenticates valid accounts executive credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'CompanyA@2026' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('accounts_executive');
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects invalid staff credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: 'accounts@companya.in', password: 'WrongPassword@99' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Rate Limiting & Abuse Protection', () => {
    it('throttles rapid OTP requests exceeding maximum attempt limit', async () => {
      const targetPhone = '9829099991';

      // 5 allowed attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/parent/request-otp')
          .send({ phone: targetPhone });
        expect(res.status).toBe(200);
      }

      // 6th attempt must trigger 429 TOO_MANY_REQUESTS
      const blockedRes = await request(app)
        .post('/api/v1/auth/parent/request-otp')
        .send({ phone: targetPhone });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.body.error.message).toContain('Too many requests');
    });
  });
});

