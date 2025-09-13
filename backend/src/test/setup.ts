import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

// Usa il database principale per i test ma con prefisso per i dati
const TEST_DATABASE_URL = process.env.DATABASE_URL;

// Client Prisma per i test
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL
    }
  }
});

// Setup globale dei test
beforeAll(async () => {
  // Connetti al database di test
  await testPrisma.$connect();
});

// Cleanup globale
afterAll(async () => {
  await testPrisma.$disconnect();
});

// Cleanup tra i test per garantire isolamento
beforeEach(async () => {
  // Pulisci i dati di test prima di ogni test
  // Usa transazioni per evitare problemi di concorrenza
  await testPrisma.$transaction(async (tx) => {
    await tx.shiftException.deleteMany({ where: { shift: { tenant: { name: { startsWith: 'Test' } } } } });
    await tx.checkItem.deleteMany({ where: { checklist: { site: { tenant: { name: { startsWith: 'Test' } } } } } });
    await tx.checklist.deleteMany({ where: { site: { tenant: { name: { startsWith: 'Test' } } } } });
    await tx.shiftOperator.deleteMany({ where: { shift: { tenant: { name: { startsWith: 'Test' } } } } });
    await tx.shiftSite.deleteMany({ where: { shift: { tenant: { name: { startsWith: 'Test' } } } } });
    await tx.shiftRecurrence.deleteMany({ where: { shift: { tenant: { name: { startsWith: 'Test' } } } } });
    await tx.shift.deleteMany({ where: { tenant: { name: { startsWith: 'Test' } } } });
    await tx.site.deleteMany({ where: { tenant: { name: { startsWith: 'Test' } } } });
    await tx.client.deleteMany({ where: { tenant: { name: { startsWith: 'Test' } } } });
    await tx.user.deleteMany({ where: { tenant: { name: { startsWith: 'Test' } } } });
    await tx.tenantSettings.deleteMany({ where: { tenant: { name: { startsWith: 'Test' } } } });
    await tx.tenant.deleteMany({ where: { name: { startsWith: 'Test' } } });
  });
});

// Utility per creare dati di test isolati per tenant
export async function createTestTenant(name: string = 'Test Tenant', slug?: string) {
  const timestamp = Date.now();
  return await testPrisma.tenant.create({
    data: {
      name: `Test-${name}-${timestamp}`,
      slug: slug || `test-${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`
    }
  });
}

export async function createTestUser(tenantId: string, role: 'admin' | 'operatore' = 'operatore', isManager: boolean = false) {
  return await testPrisma.user.create({
    data: {
      email: `user-${Date.now()}-${Math.random()}@test.com`,
      password: '$2a$10$test.hash.password', // Hash di test
      firstName: 'Test',
      lastName: 'User',
      role,
      isManager,
      tenantId
    }
  });
}

export async function createTestClient(tenantId: string, name: string = 'Test Client') {
  return await testPrisma.client.create({
    data: {
      name: `Test-${name}`,
      email: `test-client-${Date.now()}@test.com`,
      phone: '+39 123 456 7890',
      tenantId
    }
  });
}

export async function createTestSite(tenantId: string, clientId: string, name: string = 'Test Site') {
  return await testPrisma.site.create({
    data: {
      name: `Test-${name}-${Date.now()}`,
      address: 'Via Test 123, Test City',
      clientId,
      tenantId
    }
  });
}

// Utility aggiuntive per test di sicurezza multi-tenant
export async function createTestShift(tenantId: string, title: string = 'Test Shift') {
  return await testPrisma.shift.create({
    data: {
      title: `${title}-${Date.now()}`,
      date: new Date(),
      notes: 'Test shift notes',
      tenantId
    }
  });
}

export async function createTestChecklist(tenantId: string, siteId: string, title: string = 'Test Checklist') {
  return await testPrisma.checklist.create({
    data: {
      title: `${title}-${Date.now()}`,
      siteId,
      tenantId
    }
  });
}

export async function createTestCheckItem(tenantId: string, checklistId: string, title: string = 'Test Item') {
  return await testPrisma.checkItem.create({
    data: {
      title: `${title}-${Date.now()}`,
      description: 'Test check item description',
      order: 1,
      checklistId,
      tenantId
    }
  });
}