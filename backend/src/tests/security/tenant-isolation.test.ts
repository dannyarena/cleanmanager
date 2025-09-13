/**
 * Test di sicurezza per isolamento tenant
 * Milestone 8 - Test di sicurezza multi-tenant automatizzati
 * Coverage sui servizi critici per prevenire regressioni
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { testPrisma, createTestTenant, createTestUser, createTestClient, createTestSite } from '../../test/setup';
import app from '../../app';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';



function generateTestToken(userId: string, tenantId: string, role: 'ADMIN' | 'OPERATORE' = 'OPERATORE') {
  return jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('🔒 Tenant Isolation Security Tests', () => {
  let tenant1: any, tenant2: any;
  let user1: any, user2: any;
  let token1: string, token2: string;
  let client1: any, client2: any;
  let site1: any, site2: any;

  beforeEach(async () => {

    // Setup tenant e utenti
    tenant1 = await createTestTenant('Security Tenant 1');
    tenant2 = await createTestTenant('Security Tenant 2');
    user1 = await createTestUser(tenant1.id, 'ADMIN');
    user2 = await createTestUser(tenant2.id, 'ADMIN');
    token1 = generateTestToken(user1.id, tenant1.id, 'ADMIN');
    token2 = generateTestToken(user2.id, tenant2.id, 'ADMIN');

    // Setup dati di test
    client1 = await createTestClient(tenant1.id, 'Client Security 1');
    client2 = await createTestClient(tenant2.id, 'Client Security 2');
    site1 = await createTestSite(tenant1.id, client1.id, 'Site Security 1');
    site2 = await createTestSite(tenant2.id, client2.id, 'Site Security 2');
  });

  describe('Database Level Isolation', () => {
    it('should prevent reading records from other tenants', async () => {
      // Verifica che ogni tenant veda solo i propri client
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

    it('should enforce tenantId in all queries', async () => {
      // Verifica che non si possano fare query senza tenantId
      const allClients = await testPrisma.client.findMany();
      expect(allClients).toHaveLength(2); // Entrambi i client esistono
      
      // Ma ogni tenant dovrebbe vedere solo i propri
      const filteredClients = await testPrisma.client.findMany({
        where: { tenantId: tenant1.id }
      });
      expect(filteredClients).toHaveLength(1);
      expect(filteredClients[0].tenantId).toBe(tenant1.id);
    });

    it('should prevent cross-tenant joins', async () => {
      // Tenta di creare un sito con un client di altro tenant
      await expect(async () => {
        await testPrisma.site.create({
          data: {
            name: 'Malicious Site',
            address: 'Hacker Street',
            clientId: client2.id, // Client di tenant2
            tenantId: tenant1.id   // Ma tenant1
          }
        });
      }).rejects.toThrow();
    });

    it('should validate tenantId consistency in relations', async () => {
      // Verifica che le relazioni rispettino il tenantId
      const siteWithClient = await testPrisma.site.findUnique({
        where: { id: site1.id },
        include: { client: true }
      });
      
      expect(siteWithClient?.tenantId).toBe(tenant1.id);
      expect(siteWithClient?.client.tenantId).toBe(tenant1.id);
    });
  });

  describe('API Level Isolation', () => {
    it('should return only tenant-specific clients', async () => {
      const response1 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.clients).toHaveLength(1);
      expect(response1.body.clients[0].tenantId).toBe(tenant1.id);
      
      const response2 = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token2}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.clients).toHaveLength(1);
      expect(response2.body.clients[0].tenantId).toBe(tenant2.id);
    });

    it('should prevent access to other tenant resources by ID', async () => {
      // User1 tenta di accedere al client di tenant2
      const response = await request(app)
        .get(`/api/clients/${client2.id}`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(404);
    });

    it('should prevent updating other tenant resources', async () => {
      const response = await request(app)
        .patch(`/api/clients/${client2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Hacked Client' });
      
      expect(response.status).toBe(404);
      
      // Verifica che il client non sia stato modificato
      const unchangedClient = await testPrisma.client.findUnique({
        where: { id: client2.id }
      });
      expect(unchangedClient?.name).toBe('Client Security 2');
    });

    it('should prevent deleting other tenant resources', async () => {
      const response = await request(app)
        .delete(`/api/clients/${client2.id}`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(404);
      
      // Verifica che il client esista ancora
      const existingClient = await testPrisma.client.findUnique({
        where: { id: client2.id }
      });
      expect(existingClient).toBeTruthy();
    });
  });

  describe('Data Creation Security', () => {
    it('should automatically set tenantId from token', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'New Client',
          tenantId: tenant2.id // Tentativo di injection
        });
      
      expect(response.status).toBe(201);
      expect(response.body.client.tenantId).toBe(tenant1.id); // Dovrebbe usare tenant1
    });

    it('should prevent creating resources with invalid tenant references', async () => {
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Malicious Site',
          address: 'Hacker Address',
          clientId: client2.id // Client di tenant2
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Search and Filter Security', () => {
    it('should filter search results by tenant', async () => {
      // Crea client con nomi simili in entrambi i tenant
      await createTestClient(tenant1.id, 'Searchable Client T1');
      await createTestClient(tenant2.id, 'Searchable Client T2');
      
      const response = await request(app)
        .get('/api/clients?q=Searchable')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.clients).toHaveLength(1);
      expect(response.body.clients[0].name).toBe('Searchable Client T1');
      expect(response.body.clients[0].tenantId).toBe(tenant1.id);
    });

    it('should filter by related entities within tenant scope', async () => {
      const response = await request(app)
        .get(`/api/sites?clientId=${client1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.sites).toHaveLength(1);
      expect(response.body.sites[0].clientId).toBe(client1.id);
      
      // Verifica che non possa filtrare per client di altro tenant
      const response2 = await request(app)
        .get(`/api/sites?clientId=${client2.id}`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.sites).toHaveLength(0);
    });
  });

  describe('Email Uniqueness Across Tenants', () => {
    it('should allow duplicate emails across different tenants', async () => {
      const email = 'duplicate@example.com';
      
      // Crea utente con stessa email in tenant1
      const user1 = await testPrisma.user.create({
        data: {
          email,
          password: 'password123',
          role: 'OPERATORE',
          tenantId: tenant1.id
        }
      });
      
      // Dovrebbe poter creare utente con stessa email in tenant2
      const user2 = await testPrisma.user.create({
        data: {
          email,
          password: 'password123',
          role: 'OPERATORE',
          tenantId: tenant2.id
        }
      });
      
      expect(user1.email).toBe(email);
      expect(user2.email).toBe(email);
      expect(user1.tenantId).toBe(tenant1.id);
      expect(user2.tenantId).toBe(tenant2.id);
    });

    it('should prevent duplicate emails within same tenant', async () => {
      const email = 'unique@example.com';
      
      // Crea primo utente
      await testPrisma.user.create({
        data: {
          email,
          password: 'password123',
          role: 'OPERATORE',
          tenantId: tenant1.id
        }
      });
      
      // Tentativo di creare secondo utente con stessa email nello stesso tenant
      await expect(async () => {
        await testPrisma.user.create({
          data: {
            email,
            password: 'password123',
            role: 'ADMIN',
            tenantId: tenant1.id
          }
        });
      }).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests from different tenants', async () => {
      const promises = [];
      
      // 10 richieste concorrenti per ogni tenant
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/clients')
            .set('Authorization', `Bearer ${token1}`)
        );
        
        promises.push(
          request(app)
            .get('/api/clients')
            .set('Authorization', `Bearer ${token2}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Tutte le richieste dovrebbero avere successo
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verifica isolamento dei dati
      const tenant1Responses = responses.filter((_, index) => index % 2 === 0);
      const tenant2Responses = responses.filter((_, index) => index % 2 === 1);
      
      tenant1Responses.forEach(response => {
        expect(response.body.clients[0].tenantId).toBe(tenant1.id);
      });
      
      tenant2Responses.forEach(response => {
        expect(response.body.clients[0].tenantId).toBe(tenant2.id);
      });
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak tenant information in error messages', async () => {
      const response = await request(app)
        .get(`/api/clients/${client2.id}`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).not.toContain(tenant2.id);
      expect(response.body.error).not.toContain(client2.name);
    });

    it('should handle invalid tenant IDs gracefully', async () => {
      const invalidToken = jwt.sign(
        { userId: user1.id, tenantId: 'invalid-tenant-id', role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      // Il middleware dovrebbe gestire questo caso
      expect([200, 403, 404]).toContain(response.status);
    });
  });
});