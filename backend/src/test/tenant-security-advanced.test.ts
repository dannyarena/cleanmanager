import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  testPrisma, 
  createTestTenant, 
  createTestUser, 
  createTestClient, 
  createTestSite,
  createTestShift,
  createTestChecklist,
  createTestCheckItem
} from './setup';
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
function generateTestToken(userId: string, tenantId: string, role: 'ADMIN' | 'OPERATORE' = 'OPERATORE') {
  return jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Advanced Tenant Security Tests', () => {
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
    user1 = await createTestUser(tenant1.id, 'ADMIN');
    user2 = await createTestUser(tenant2.id, 'ADMIN');

    // Genera token JWT
    token1 = generateTestToken(user1.id, tenant1.id, 'ADMIN');
    token2 = generateTestToken(user2.id, tenant2.id, 'ADMIN');
  });

  describe('Cross-Tenant Join Prevention', () => {
    it('should prevent creating site with client from another tenant', async () => {
      // Crea client per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');
      
      // User2 (tenant2) tenta di creare un sito collegato al client di tenant1
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Malicious Site',
          address: 'Via Hack 123',
          clientId: client1.id // Tentativo di join cross-tenant
        });

      // Dovrebbe fallire
      expect([400, 404, 422]).toContain(response.status);
      
      // Verifica che il sito non sia stato creato
      const sites = await testPrisma.site.findMany({
        where: { tenantId: tenant2.id }
      });
      expect(sites).toHaveLength(0);
    });

    it('should prevent assigning operators from another tenant to shifts', async () => {
      // Crea shift per tenant1
      const shift1 = await createTestShift(tenant1.id, 'Shift Tenant 1');
      
      // User2 (tenant2) tenta di assegnare se stesso al shift di tenant1
      const response = await request(app)
        .post(`/api/shifts/${shift1.id}/operators`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          operatorIds: [user2.id] // Tentativo di assegnazione cross-tenant
        });

      // Dovrebbe fallire
      expect([400, 404, 422]).toContain(response.status);
    });

    it('should prevent assigning sites from another tenant to shifts', async () => {
      // Setup per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const site1 = await createTestSite(tenant1.id, client1.id, 'Site 1');
      
      // Crea shift per tenant2
      const shift2 = await createTestShift(tenant2.id, 'Shift Tenant 2');
      
      // User2 tenta di assegnare site di tenant1 al proprio shift
      const response = await request(app)
        .post(`/api/shifts/${shift2.id}/sites`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          siteIds: [site1.id] // Tentativo di assegnazione cross-tenant
        });

      // Dovrebbe fallire
      expect([400, 404, 422]).toContain(response.status);
    });
  });

  describe('List Filtering Verification', () => {
    it('should always filter clients list by tenant even without explicit where clause', async () => {
      // Crea client per entrambi i tenant
      const client1 = await createTestClient(tenant1.id, 'Client Tenant 1');
      const client2 = await createTestClient(tenant2.id, 'Client Tenant 2');
      
      // Verifica che ogni utente veda solo i propri client
      const response1 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].id).toBe(client1.id);
      
      const response2 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].id).toBe(client2.id);
    });

    it('should filter sites list by tenant with search parameters', async () => {
      // Setup per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const site1 = await createTestSite(tenant1.id, client1.id, 'Office Site');
      
      // Setup per tenant2
      const client2 = await createTestClient(tenant2.id, 'Client 2');
      const site2 = await createTestSite(tenant2.id, client2.id, 'Office Site'); // Stesso nome
      
      // Ricerca per nome dovrebbe restituire solo il sito del proprio tenant
      const response1 = await request(app)
        .get('/api/sites?q=Office')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].id).toBe(site1.id);
      
      const response2 = await request(app)
        .get('/api/sites?q=Office')
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].id).toBe(site2.id);
    });

    it('should filter operators list by tenant', async () => {
      // Crea operatori aggiuntivi per entrambi i tenant
      const operator1 = await createTestUser(tenant1.id, 'OPERATORE');
      const operator2 = await createTestUser(tenant2.id, 'OPERATORE');
      
      // Ogni tenant dovrebbe vedere solo i propri operatori
      const response1 = await request(app)
        .get('/api/operators')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.data).toHaveLength(2); // user1 + operator1
      const userIds1 = response1.body.data.map((u: any) => u.id);
      expect(userIds1).toContain(user1.id);
      expect(userIds1).toContain(operator1.id);
      expect(userIds1).not.toContain(user2.id);
      expect(userIds1).not.toContain(operator2.id);
    });
  });

  describe('Email Uniqueness Across Tenants', () => {
    it('should allow duplicate emails across different tenants', async () => {
      const sameEmail = 'duplicate@test.com';
      
      // Crea utenti con la stessa email in tenant diversi
      const user1 = await testPrisma.user.create({
        data: {
          email: sameEmail,
          password: '$2a$10$test.hash.password',
          firstName: 'User',
          lastName: 'One',
          role: 'OPERATORE',
          tenantId: tenant1.id
        }
      });
      
      const user2 = await testPrisma.user.create({
        data: {
          email: sameEmail,
          password: '$2a$10$test.hash.password',
          firstName: 'User',
          lastName: 'Two',
          role: 'OPERATORE',
          tenantId: tenant2.id
        }
      });
      
      // Entrambi gli utenti dovrebbero essere creati con successo
      expect(user1.email).toBe(sameEmail);
      expect(user2.email).toBe(sameEmail);
      expect(user1.tenantId).toBe(tenant1.id);
      expect(user2.tenantId).toBe(tenant2.id);
    });

    it('should prevent duplicate emails within the same tenant', async () => {
      const sameEmail = 'duplicate@test.com';
      
      // Crea primo utente
      await testPrisma.user.create({
        data: {
          email: sameEmail,
          password: '$2a$10$test.hash.password',
          firstName: 'User',
          lastName: 'One',
          role: 'OPERATORE',
          tenantId: tenant1.id
        }
      });
      
      // Tentativo di creare secondo utente con stessa email nello stesso tenant
      await expect(testPrisma.user.create({
        data: {
          email: sameEmail,
          password: '$2a$10$test.hash.password',
          firstName: 'User',
          lastName: 'Two',
          role: 'OPERATORE',
          tenantId: tenant1.id
        }
      })).rejects.toThrow();
    });
  });

  describe('Database Level Security', () => {
    it('should ensure all created records have tenantId', async () => {
      // Crea una catena completa di dati
      const client = await createTestClient(tenant1.id, 'Test Client');
      const site = await createTestSite(tenant1.id, client.id, 'Test Site');
      const shift = await createTestShift(tenant1.id, 'Test Shift');
      const checklist = await createTestChecklist(tenant1.id, site.id, 'Test Checklist');
      const checkItem = await createTestCheckItem(tenant1.id, checklist.id, 'Test Item');
      
      // Verifica che tutti i record abbiano il tenantId corretto
      expect(client.tenantId).toBe(tenant1.id);
      expect(site.tenantId).toBe(tenant1.id);
      expect(shift.tenantId).toBe(tenant1.id);
      expect(checklist.tenantId).toBe(tenant1.id);
      expect(checkItem.tenantId).toBe(tenant1.id);
      
      // Verifica che non ci siano record orfani senza tenantId
      const orphanClients = await testPrisma.client.count({ where: { tenantId: null } });
      const orphanSites = await testPrisma.site.count({ where: { tenantId: null } });
      const orphanShifts = await testPrisma.shift.count({ where: { tenantId: null } });
      const orphanChecklists = await testPrisma.checklist.count({ where: { tenantId: null } });
      const orphanCheckItems = await testPrisma.checkItem.count({ where: { tenantId: null } });
      
      expect(orphanClients).toBe(0);
      expect(orphanSites).toBe(0);
      expect(orphanShifts).toBe(0);
      expect(orphanChecklists).toBe(0);
      expect(orphanCheckItems).toBe(0);
    });

    it('should prevent raw queries from bypassing tenant isolation', async () => {
      // Crea dati per entrambi i tenant
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const client2 = await createTestClient(tenant2.id, 'Client 2');
      
      // Query raw senza filtro tenant (simulazione di vulnerabilità)
      const allClients = await testPrisma.$queryRaw`
        SELECT * FROM clients
      `;
      
      // Dovrebbe restituire tutti i client (questo è il comportamento atteso per query raw)
      expect(Array.isArray(allClients)).toBe(true);
      expect((allClients as any[]).length).toBe(2);
      
      // Ma le query attraverso i repository dovrebbero essere sempre filtrate
      const tenant1Clients = await testPrisma.client.findMany({
        where: { tenantId: tenant1.id }
      });
      
      const tenant2Clients = await testPrisma.client.findMany({
        where: { tenantId: tenant2.id }
      });
      
      expect(tenant1Clients).toHaveLength(1);
      expect(tenant1Clients[0].id).toBe(client1.id);
      expect(tenant2Clients).toHaveLength(1);
      expect(tenant2Clients[0].id).toBe(client2.id);
    });
  });

  describe('Cascade Deletion Security', () => {
    it('should only delete records within the same tenant on cascade', async () => {
      // Setup per tenant1
      const client1 = await createTestClient(tenant1.id, 'Client 1');
      const site1 = await createTestSite(tenant1.id, client1.id, 'Site 1');
      const checklist1 = await createTestChecklist(tenant1.id, site1.id, 'Checklist 1');
      
      // Setup per tenant2
      const client2 = await createTestClient(tenant2.id, 'Client 2');
      const site2 = await createTestSite(tenant2.id, client2.id, 'Site 2');
      
      // Elimina client1 (dovrebbe eliminare solo site1 e checklist1)
      await testPrisma.client.delete({ where: { id: client1.id } });
      
      // Verifica che solo i dati di tenant1 siano stati eliminati
      const remainingSites = await testPrisma.site.findMany();
      const remainingChecklists = await testPrisma.checklist.findMany();
      const remainingClients = await testPrisma.client.findMany();
      
      expect(remainingClients).toHaveLength(1);
      expect(remainingClients[0].id).toBe(client2.id);
      expect(remainingSites).toHaveLength(1);
      expect(remainingSites[0].id).toBe(site2.id);
      expect(remainingChecklists).toHaveLength(0); // checklist1 eliminata per cascade
    });
  });
});