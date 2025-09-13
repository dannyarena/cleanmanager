-- Backfill script per popolare i tenantId nelle tabelle figlie
-- Eseguire in transazione per sicurezza

BEGIN;

-- ShiftRecurrence ← Shift
UPDATE shift_recurrence 
SET "tenantId" = s."tenantId"
FROM shifts s
WHERE shift_recurrence."shiftId" = s.id 
  AND shift_recurrence."tenantId" IS NULL;

-- ShiftException ← Shift
UPDATE shift_exceptions 
SET "tenantId" = s."tenantId"
FROM shifts s
WHERE shift_exceptions."shiftId" = s.id 
  AND shift_exceptions."tenantId" IS NULL;

-- ShiftExceptionSite ← (ShiftException → Shift)
UPDATE shift_exception_sites 
SET "tenantId" = s."tenantId"
FROM shift_exceptions e
JOIN shifts s ON s.id = e."shiftId"
WHERE shift_exception_sites."shiftExceptionId" = e.id
  AND shift_exception_sites."tenantId" IS NULL;

-- ShiftExceptionOperator ← (ShiftException → Shift)
UPDATE shift_exception_operators 
SET "tenantId" = s."tenantId"
FROM shift_exceptions e
JOIN shifts s ON s.id = e."shiftId"
WHERE shift_exception_operators."shiftExceptionId" = e.id
  AND shift_exception_operators."tenantId" IS NULL;

-- ShiftSite ← Shift
UPDATE shift_sites 
SET "tenantId" = s."tenantId"
FROM shifts s
WHERE shift_sites."shiftId" = s.id 
  AND shift_sites."tenantId" IS NULL;

-- ShiftOperator ← Shift
UPDATE shift_operators 
SET "tenantId" = s."tenantId"
FROM shifts s
WHERE shift_operators."shiftId" = s.id 
  AND shift_operators."tenantId" IS NULL;

-- CheckItem ← Checklist
UPDATE check_items 
SET "tenantId" = cl."tenantId"
FROM checklists cl
WHERE check_items."checklistId" = cl.id 
  AND check_items."tenantId" IS NULL;

-- Verifica che non ci siano più record con tenantId NULL
SELECT 'shift_recurrence' as table_name, COUNT(*) as null_count 
FROM shift_recurrence WHERE "tenantId" IS NULL
UNION ALL
SELECT 'shift_exceptions', COUNT(*) 
FROM shift_exceptions WHERE "tenantId" IS NULL
UNION ALL
SELECT 'shift_exception_sites', COUNT(*) 
FROM shift_exception_sites WHERE "tenantId" IS NULL
UNION ALL
SELECT 'shift_exception_operators', COUNT(*) 
FROM shift_exception_operators WHERE "tenantId" IS NULL
UNION ALL
SELECT 'shift_sites', COUNT(*) 
FROM shift_sites WHERE "tenantId" IS NULL
UNION ALL
SELECT 'shift_operators', COUNT(*) 
FROM shift_operators WHERE "tenantId" IS NULL
UNION ALL
SELECT 'check_items', COUNT(*) 
FROM check_items WHERE "tenantId" IS NULL;

-- Se tutti i conteggi sono 0, fare COMMIT, altrimenti ROLLBACK
COMMIT;