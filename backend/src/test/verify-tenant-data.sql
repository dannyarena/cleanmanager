-- Verifica che non ci siano record con tenant_id NULL nelle tabelle multi-tenant

-- Controlla tabella users
SELECT 'users' as table_name, COUNT(*) as null_tenant_count 
FROM users 
WHERE "tenantId" IS NULL;

-- Controlla tabella clients
SELECT 'clients' as table_name, COUNT(*) as null_tenant_count 
FROM clients 
WHERE "tenantId" IS NULL;

-- Controlla tabella sites
SELECT 'sites' as table_name, COUNT(*) as null_tenant_count 
FROM sites 
WHERE "tenantId" IS NULL;

-- Controlla tabella shifts
SELECT 'shifts' as table_name, COUNT(*) as null_tenant_count 
FROM shifts 
WHERE "tenantId" IS NULL;

-- Controlla tabella checklists
SELECT 'checklists' as table_name, COUNT(*) as null_tenant_count 
FROM checklists 
WHERE "tenantId" IS NULL;

-- Controlla tabella tenant_settings
SELECT 'tenant_settings' as table_name, COUNT(*) as null_tenant_count 
FROM tenant_settings 
WHERE "tenantId" IS NULL;

-- Riepilogo generale
SELECT 
  'TOTALE' as table_name,
  (
    (SELECT COUNT(*) FROM users WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM clients WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM sites WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM shifts WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM checklists WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM tenant_settings WHERE "tenantId" IS NULL)
  ) as null_tenant_count;