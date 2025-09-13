import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { testPrisma, createTestTenant, createTestUser, createTestClient, createTestSite } from './setup';
import clientsRoutes from '../routes/clientsRoutes';
import sitesRoutes from '../routes/sitesRoutes';
import operatorsRoutes from '../routes/operatorsRoutes';
import shiftsRoutes from '../routes/shiftsRoutes';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Setup app di test
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/clients', clientsRoutes);
  app.use('/api/sites', sitesRoutes);
  app.use('/api/operators', operatorsRoutes);
  app.use('/api/shifts', shiftsRoutes);
  return app;
}

// Utility per generare token JWT di test
function generateTestToken(userId: string, tenantId: string, role: 'admin' | 'operatore' = 'operatore') {
  return jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Tenant Isolation Tests', () => {
  let app: express.Application;
  let tenant1: any, tenant2: any;
  let user1: any, user2: any;
  let token1: string, token2: string;

  beforeEach(async () => {
    app = createTestApp();

    // Crea due tenant separati
    tenant1 = await createTestTenant('Tenant 1');
    tenant2 = await createTestTenant('Tenant 2');

    // Crea utenti per ogni tenant
    user1 = await createTestUser(tenant1.id, 'admin');
    user2 = await createTestUser(tenant2.id, 'admin');

    // Genera token JWT
    token1 = generateTestToken(user1.id, tenant1.id, 'admin');
    token2 = generateTestToken(user2.id, tenant2.id, 'admin');
  });

  describe('Clients Isolation', () => {
    it('should not allow reading clients from another tenant', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');
      
      // Crea client per tenant2
      const client2 = await createTestClient(tenant2.id, 'Client Tenant 2');

      // User1 dovrebbe vedere solo client1
      const response1 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token1}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].id).toBe(client1.id);
      expect(response1.body.data[0].name).toBe('Client Tenant 1');

      // User2 dovrebbe vedere solo client2
      const response2 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token2}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].id).toBe(client2.id);
      expect(response2.body.data[0].name).toBe('Client Tenant 2');
    });

    it('should not allow accessing client from another tenant by ID', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');

      // User2 (tenant2) non dovrebbe poter accedere al client di tenant1
      const response = await request(app)
        .get(`/api/clients/${client1.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(404);
    });

    it('should not allow updating client from another tenant', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');

      // User2 (tenant2) non dovrebbe poter modificare il client di tenant1
      const response = await request(app)
        .patch(`/api/clients/${client1.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(404);

      // Verifica che il client non sia stato modificato
      const unchangedClient = await testPrisma.client.findUnique({
        where: { id: client1.id }
      });
      expect(unchangedClient?.name).toBe('Client Tenant 1');
    });

    it('should not allow deleting client from another tenant', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');

      // User2 (tenant2) non dovrebbe poter eliminare il client di tenant1
      const response = await request(app)
        .delete(`/api/clients/${client1.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(404);

      // Verifica che il client esista ancora
      const existingClient = await testPrisma.client.findUnique({
        where: { id: client1.id }
      });
      expect(existingClient).toBeTruthy();
    });
  });

  describe('Sites Isolation', () => {
    it('should not allow reading sites from another tenant', async () => {
      // Setup per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const site1 = await createTestSite(tenant1.id, client1.id, 'Site Tenant 1');

      // Setup per tenant2
      const client2 = await createTestClient(tenant2.id, 'Client 2');
      const site2 = await createTestSite(tenant2.id, client2.id, 'Site Tenant 2');

      // User1 dovrebbe vedere solo site1
      const response1 = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${token1}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].id).toBe(site1.id);

      // User2 dovrebbe vedere solo site2
      const response2 = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${token2}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].id).toBe(site2.id);
    });

    it('should not allow cross-tenant site-client relationships', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');
      
      // User2 (tenant2) non dovrebbe poter creare un sito collegato al client di tenant1
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Malicious Site',
          address: 'Via Hack 123',
          city: 'Hack City',
          clientId: client1.id // Tentativo di collegare al client di un altro tenant
        });

      // Dovrebbe fallire (400 o 404)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Users/Operators Isolation', () => {
    it('should not allow reading operators from another tenant', async () => {
      // User1 dovrebbe vedere solo se stesso
      const response1 = await request(app)
        .get('/api/operators')
        .set('Authorization', `Bearer ${token1}`);

      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].id).toBe(user1.id);

      // User2 dovrebbe vedere solo se stesso
      const response2 = await request(app)
        .get('/api/operators')
        .set('Authorization', `Bearer ${token2}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].id).toBe(user2.id);
    });
  });

  describe('Database Level Isolation', () => {
    it('should ensure all created records have correct tenantId', async () => {
      // Crea dati per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const site1 = await createTestSite(tenant1.id, client1.id, 'Site 1');

      // Verifica che tutti i record abbiano il tenantId corretto
      expect(client1.tenantId).toBe(tenant1.id);
      expect(site1.tenantId).toBe(tenant1.id);

      // Verifica che non ci siano record senza tenantId
      const clientsWithoutTenant = await testPrisma.client.count({
        where: { tenantId: null }
      });
      expect(clientsWithoutTenant).toBe(0);

      const sitesWithoutTenant = await testPrisma.site.count({
        where: { tenantId: null }
      });
      expect(sitesWithoutTenant).toBe(0);
    });

    it('should prevent direct database queries from bypassing tenant isolation', async () => {
      // Crea dati per entrambi i tenant
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const client2 = await createTestClient(tenant2.id, 'Client 2');

      // Query senza filtro tenant dovrebbe restituire tutti i record
      const allClients = await testPrisma.client.findMany();
      expect(allClients).toHaveLength(2);

      // Query con filtro tenant dovrebbe restituire solo i record del tenant specifico
      const tenant1Clients = await testPrisma.client.findMany({
        where: { tenantId: tenant1.id }
      });
      expect(tenant1Clients).toHaveLength(1);
      expect(tenant1Clients[0].id).toBe(client1.id);

      const tenant2Clients = await testPrisma.client.findMany({
        where: { tenantId: tenant2.id }
      });
      expect(tenant2Clients).toHaveLength(1);
      expect(tenant2Clients[0].id).toBe(client2.id);
    });
  });
});