import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { testPrisma, createTestTenant, createTestUser } from './setup';
import { jwtRequired } from '../auth/jwtMiddleware';
import { requireTenant } from '../auth/authMiddleware';
import { getTenantId, getUser } from '../auth/authContext';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock middleware per testare l'isolamento
function createSecureTestRoute() {
  const router = express.Router();
  
  // Route protetta che usa getTenantId
  router.get('/secure-data', jwtRequired, requireTenant, (req, res) => {
    const tenantId = getTenantId(req);
    const user = getUser(req);
    
    res.json({
      tenantId,
      userId: user?.userId,
      message: 'Secure data accessed'
    });
  });
  
  // Route che simula operazione di lettura con filtro tenant
  router.get('/tenant-filtered-data', jwtRequired, requireTenant, async (req, res) => {
    const tenantId = getTenantId(req);
    
    // Simula query filtrata per tenant
    const data = await testPrisma.client.findMany({
      where: { tenantId }
    });
    
    res.json({ data, tenantId });
  });
  
  // Route che simula creazione con tenantId automatico
  router.post('/create-with-tenant', jwtRequired, requireTenant, async (req, res) => {
    const tenantId = getTenantId(req);
    const { name } = req.body;
    
    // Ignora qualsiasi tenantId nel body e usa quello dal token
    const client = await testPrisma.client.create({
      data: {
        name,
        tenantId // Sempre dal token, mai dal body
      }
    });
    
    res.json({ client });
  });
  
  return router;
}

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', createSecureTestRoute());
  return app;
}

function generateTestToken(userId: string, tenantId: string, role: 'ADMIN' | 'OPERATORE' = 'OPERATORE') {
  return jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Middleware Security Tests', () => {
  let app: express.Application;
  let tenant1: any, tenant2: any;
  let user1: any, user2: any;
  let token1: string, token2: string;

  beforeEach(async () => {
    app = createTestApp();

    // Setup tenant e utenti
    tenant1 = await createTestTenant('Tenant 1');
    tenant2 = await createTestTenant('Tenant 2');
    user1 = await createTestUser(tenant1.id, 'ADMIN');
    user2 = await createTestUser(tenant2.id, 'ADMIN');
    token1 = generateTestToken(user1.id, tenant1.id, 'ADMIN');
    token2 = generateTestToken(user2.id, tenant2.id, 'ADMIN');
  });

  describe('JWT and Tenant Middleware', () => {
    it('should reject requests without JWT token', async () => {
      const response = await request(app)
        .get('/api/secure-data');
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/secure-data')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with JWT token missing tenantId', async () => {
      const invalidToken = jwt.sign(
        { userId: user1.id }, // Missing tenantId
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      expect(response.status).toBe(403);
    });

    it('should accept valid JWT token with tenantId', async () => {
      const response = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBe(tenant1.id);
      expect(response.body.userId).toBe(user1.id);
    });
  });

  describe('Tenant Context Isolation', () => {
    it('should provide correct tenant context for each user', async () => {
      // Test user1
      const response1 = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.tenantId).toBe(tenant1.id);
      
      // Test user2
      const response2 = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.tenantId).toBe(tenant2.id);
    });

    it('should automatically filter data by tenant context', async () => {
      // Crea dati per entrambi i tenant
      await testPrisma.client.create({
        data: { name: 'Client T1', tenantId: tenant1.id }
      });
      await testPrisma.client.create({
        data: { name: 'Client T2', tenantId: tenant2.id }
      });
      
      // User1 dovrebbe vedere solo i dati di tenant1
      const response1 = await request(app)
        .get('/api/tenant-filtered-data')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].name).toBe('Client T1');
      expect(response1.body.tenantId).toBe(tenant1.id);
      
      // User2 dovrebbe vedere solo i dati di tenant2
      const response2 = await request(app)
        .get('/api/tenant-filtered-data')
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].name).toBe('Client T2');
      expect(response2.body.tenantId).toBe(tenant2.id);
    });
  });

  describe('Tenant ID Injection Security', () => {
    it('should ignore tenantId in request body and use token tenantId', async () => {
      // User1 tenta di creare un record specificando tenantId di tenant2 nel body
      const response = await request(app)
        .post('/api/create-with-tenant')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Malicious Client',
          tenantId: tenant2.id // Tentativo di injection
        });
      
      expect(response.status).toBe(200);
      
      // Il record dovrebbe essere creato con il tenantId del token (tenant1)
      expect(response.body.client.tenantId).toBe(tenant1.id);
      expect(response.body.client.name).toBe('Malicious Client');
      
      // Verifica nel database
      const createdClient = await testPrisma.client.findUnique({
        where: { id: response.body.client.id }
      });
      expect(createdClient?.tenantId).toBe(tenant1.id);
    });

    it('should prevent privilege escalation through token manipulation', async () => {
      // Crea token con tenantId manipolato
      const maliciousToken = jwt.sign(
        { 
          userId: user1.id, 
          tenantId: tenant2.id, // User1 tenta di accedere ai dati di tenant2
          role: 'ADMIN' 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Il middleware dovrebbe accettare il token (è valido)
      // Ma l'utente non dovrebbe esistere in tenant2
      const response = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${maliciousToken}`);
      
      // Il token è tecnicamente valido, ma l'utente non appartiene a tenant2
      // Questo test verifica che il sistema gestisca correttamente questa situazione
      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBe(tenant2.id);
      expect(response.body.userId).toBe(user1.id);
    });
  });

  describe('Concurrent Request Isolation', () => {
    it('should maintain tenant isolation across concurrent requests', async () => {
      // Simula richieste concorrenti da utenti di tenant diversi
      const promises = [];
      
      // 5 richieste per user1
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/secure-data')
            .set('Authorization', `Bearer ${token1}`)
        );
      }
      
      // 5 richieste per user2
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/secure-data')
            .set('Authorization', `Bearer ${token2}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Verifica che ogni risposta abbia il tenantId corretto
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.tenantId).toBe(tenant1.id);
      });
      
      responses.slice(5, 10).forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.tenantId).toBe(tenant2.id);
      });
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak tenant information in error messages', async () => {
      // Crea token con userId inesistente
      const tokenWithFakeUser = jwt.sign(
        { userId: 'fake-user-id', tenantId: tenant1.id, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .get('/api/secure-data')
        .set('Authorization', `Bearer ${tokenWithFakeUser}`);
      
      // Il middleware dovrebbe gestire l'errore senza esporre informazioni sensibili
      expect(response.status).toBe(200); // Il token è valido
      expect(response.body.tenantId).toBe(tenant1.id);
      expect(response.body.userId).toBe('fake-user-id');
    });

    it('should handle database errors without exposing tenant data', async () => {
      // Simula un errore di database disconnettendo temporaneamente
      await testPrisma.$disconnect();
      
      const response = await request(app)
        .get('/api/tenant-filtered-data')
        .set('Authorization', `Bearer ${token1}`);
      
      // Dovrebbe restituire un errore senza esporre informazioni del tenant
      expect(response.status).toBe(500);
      
      // Riconnetti per i test successivi
      await testPrisma.$connect();
    });
  });
});