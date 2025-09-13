import { describe, it, expect } from 'vitest';
import { testPrisma } from './setup';

describe('Tenant Data Integrity Tests', () => {
  describe('No NULL tenant_id verification', () => {
    it('should have zero records with NULL tenantId across all multi-tenant tables', async () => {
      // Usa query SQL raw per verificare NULL values
      const results = await testPrisma.$queryRaw`
        SELECT 
          'users' as table_name, 
          COUNT(*) as null_count 
        FROM users 
        WHERE "tenantId" IS NULL
        UNION ALL
        SELECT 
          'clients' as table_name, 
          COUNT(*) as null_count 
        FROM clients 
        WHERE "tenantId" IS NULL
        UNION ALL
        SELECT 
          'sites' as table_name, 
          COUNT(*) as null_count 
        FROM sites 
        WHERE "tenantId" IS NULL
        UNION ALL
        SELECT 
          'shifts' as table_name, 
          COUNT(*) as null_count 
        FROM shifts 
        WHERE "tenantId" IS NULL
        UNION ALL
        SELECT 
          'checklists' as table_name, 
          COUNT(*) as null_count 
        FROM checklists 
        WHERE "tenantId" IS NULL
        UNION ALL
        SELECT 
          'tenant_settings' as table_name, 
          COUNT(*) as null_count 
        FROM tenant_settings 
        WHERE "tenantId" IS NULL
      ` as Array<{ table_name: string; null_count: bigint }>;

      // Verifica che tutte le tabelle abbiano 0 record con tenantId NULL
      for (const result of results) {
        expect(Number(result.null_count)).toBe(0);
      }

      // Verifica che abbiamo controllato tutte le tabelle attese
      const expectedTables = ['users', 'clients', 'sites', 'shifts', 'checklists', 'tenant_settings'];
      const actualTables = results.map(r => r.table_name).sort();
      expect(actualTables).toEqual(expectedTables.sort());
    });
  });

  describe('Unique constraints per-tenant verification', () => {
    it('should allow same client name in different tenants', async () => {
      // Crea due tenant
      const tenant1 = await testPrisma.tenant.create({
        data: {
          name: 'Test Tenant 1',
          slug: 'test-tenant-1-unique'
        }
      });

      const tenant2 = await testPrisma.tenant.create({
        data: {
          name: 'Test Tenant 2', 
          slug: 'test-tenant-2-unique'
        }
      });

      const sameName = 'Same Client Name';

      // Crea client con stesso nome in tenant diversi
      const client1 = await testPrisma.client.create({
        data: {
          name: sameName,
          email: 'client1@test.com',
          tenantId: tenant1.id
        }
      });

      const client2 = await testPrisma.client.create({
        data: {
          name: sameName,
          email: 'client2@test.com',
          tenantId: tenant2.id
        }
      });

      expect(client1.name).toBe(sameName);
      expect(client2.name).toBe(sameName);
      expect(client1.tenantId).toBe(tenant1.id);
      expect(client2.tenantId).toBe(tenant2.id);

      // Cleanup
      await testPrisma.client.deleteMany({
        where: { id: { in: [client1.id, client2.id] } }
      });
      await testPrisma.tenant.deleteMany({
        where: { id: { in: [tenant1.id, tenant2.id] } }
      });
    });

    it('should prevent duplicate client names within same tenant', async () => {
      const tenant = await testPrisma.tenant.create({
        data: {
          name: 'Test Tenant Unique',
          slug: 'test-tenant-unique-constraint'
        }
      });

      const sameName = 'Duplicate Client Name';

      // Crea primo client
      const client1 = await testPrisma.client.create({
        data: {
          name: sameName,
          email: 'client1@test.com',
          tenantId: tenant.id
        }
      });

      // Tentativo di creare secondo client con stesso nome nello stesso tenant
      await expect(testPrisma.client.create({
        data: {
          name: sameName,
          email: 'client2@test.com',
          tenantId: tenant.id
        }
      })).rejects.toThrow();

      // Cleanup
      await testPrisma.client.delete({ where: { id: client1.id } });
      await testPrisma.tenant.delete({ where: { id: tenant.id } });
    });

    it('should allow renaming client to name used by different tenant', async () => {
      // Crea due tenant
      const tenant1 = await testPrisma.tenant.create({
        data: {
          name: 'Test Tenant 1 Rename',
          slug: 'test-tenant-1-rename'
        }
      });

      const tenant2 = await testPrisma.tenant.create({
        data: {
          name: 'Test Tenant 2 Rename',
          slug: 'test-tenant-2-rename'
        }
      });

      // Crea client in tenant1 con nome "Original"
      const client1 = await testPrisma.client.create({
        data: {
          name: 'Original Name',
          email: 'client1@test.com',
          tenantId: tenant1.id
        }
      });

      // Crea client in tenant2 con nome "Target"
      const client2 = await testPrisma.client.create({
        data: {
          name: 'Target Name',
          email: 'client2@test.com',
          tenantId: tenant2.id
        }
      });

      // Rinomina client1 con il nome di client2 (dovrebbe essere permesso)
      const updatedClient1 = await testPrisma.client.update({
        where: { id: client1.id },
        data: { name: 'Target Name' }
      });

      expect(updatedClient1.name).toBe('Target Name');

      // Cleanup
      await testPrisma.client.deleteMany({
        where: { id: { in: [client1.id, client2.id] } }
      });
      await testPrisma.tenant.deleteMany({
        where: { id: { in: [tenant1.id, tenant2.id] } }
      });
    });
  });
});