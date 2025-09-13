import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { testPrisma, createTestTenant } from './setup';
import authRouter from '../auth/authRouter';
import bcrypt from 'bcryptjs';

// Setup app di test
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('Login Tenant Tests', () => {
  let app: express.Application;
  let tenant1: any, tenant2: any;
  const duplicateEmail = 'duplicate@test.com';
  const password = 'password123';
  const hashedPassword = bcrypt.hashSync(password, 10);

  beforeEach(async () => {
    app = createTestApp();

    // Crea due tenant separati
    tenant1 = await createTestTenant('Tenant 1', 'tenant1');
    tenant2 = await createTestTenant('Tenant 2', 'tenant2');

    // Crea utenti con la stessa email in entrambi i tenant
    await testPrisma.user.create({
      data: {
        email: duplicateEmail,
        password: hashedPassword,
        firstName: 'User',
        lastName: 'One',
        role: 'ADMIN',
        tenantId: tenant1.id
      }
    });

    await testPrisma.user.create({
      data: {
        email: duplicateEmail,
        password: hashedPassword,
        firstName: 'User',
        lastName: 'Two',
        role: 'ADMIN',
        tenantId: tenant2.id
      }
    });
  });

  describe('Login with duplicate emails', () => {
    it('should reject login without tenantSlug when email exists in multiple tenants', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: duplicateEmail,
          password: password
          // Nessun tenantSlug fornito
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Tenant slug è richiesto');
    });

    it('should accept login with correct tenantSlug for tenant1', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: duplicateEmail,
          password: password,
          tenantSlug: 'tenant1'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(duplicateEmail);
      expect(response.body.user.tenantId).toBe(tenant1.id);
    });

    it('should accept login with correct tenantSlug for tenant2', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: duplicateEmail,
          password: password,
          tenantSlug: 'tenant2'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(duplicateEmail);
      expect(response.body.user.tenantId).toBe(tenant2.id);
    });

    it('should reject login with wrong tenantSlug', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: duplicateEmail,
          password: password,
          tenantSlug: 'nonexistent'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Tenant non trovato');
    });

    it('should accept tenantSlug from x-tenant-slug header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-tenant-slug', 'tenant1')
        .send({
          email: duplicateEmail,
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.tenantId).toBe(tenant1.id);
    });
  });
});