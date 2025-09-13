# Pattern per Query Sicure Multi-Tenant

## Problema Risolto

Il middleware `tenantScope` di Prisma non funziona correttamente con le query `update()` e `delete()` che utilizzano una clausola `where` con un singolo campo `id`. Questo può causare errori di validazione e potenziali problemi di sicurezza multi-tenant.

## Soluzione Implementata

### Pattern CORRETTO ✅

Per operazioni di aggiornamento e eliminazione, utilizzare sempre `updateMany()` e `deleteMany()` con controlli espliciti del `tenantId`:

```typescript
// ❌ SBAGLIATO - Non funziona con tenantScope
const updatedClient = await prisma.client.update({
  where: { id },
  data: updateData
});

// ✅ CORRETTO - Funziona con tenantScope
const updatedClient = await prisma.client.updateMany({
  where: { 
    id,
    tenantId 
  },
  data: updateData
});

if (updatedClient.count === 0) {
  return res.status(404).json({ error: "Risorsa non trovata o non autorizzata" });
}

// Recupera il record aggiornato se necessario
const client = await prisma.client.findFirst({
  where: { id, tenantId },
  include: { /* relazioni necessarie */ }
});
```

### Pattern per Eliminazione

```typescript
// ❌ SBAGLIATO
await prisma.client.delete({
  where: { id }
});

// ✅ CORRETTO
const deletedClient = await prisma.client.deleteMany({
  where: { 
    id,
    tenantId 
  }
});

if (deletedClient.count === 0) {
  return res.status(404).json({ error: "Risorsa non trovata o non autorizzata" });
}
```

### Pattern per Transazioni

Nelle transazioni, applicare lo stesso principio:

```typescript
await prisma.$transaction(async (tx) => {
  // ❌ SBAGLIATO
  await tx.shiftRecurrence.update({
    where: { id: recurrenceId },
    data: updateData
  });
  
  // ✅ CORRETTO
  const updatedRecurrence = await tx.shiftRecurrence.updateMany({
    where: { 
      id: recurrenceId,
      shift: { tenantId }
    },
    data: updateData
  });
  
  if (updatedRecurrence.count === 0) {
    throw new Error("Ricorrenza non trovata o non autorizzata");
  }
});
```

## Quando Applicare Questo Pattern

1. **Sempre** per query `update()` e `delete()` con clausola `where` basata su `id`
2. **Sempre** quando il modello è soggetto a controlli multi-tenant
3. **Sempre** nelle transazioni che modificano dati multi-tenant

## Modelli Interessati

I seguenti modelli richiedono questo pattern:
- `Client`
- `Site` 
- `Shift`
- `ShiftRecurrence`
- `User` (operatori)
- `TenantSettings`
- Altri modelli con `tenantId`

## Controlli di Sicurezza

1. **Verifica del count**: Sempre controllare che `count > 0` dopo `updateMany`/`deleteMany`
2. **Gestione errori**: Restituire 404 se nessun record è stato modificato
3. **Recupero dati**: Utilizzare `findFirst` con `tenantId` per recuperare i dati aggiornati

## Note Tecniche

- Il middleware `tenantScope` funziona correttamente con `findMany`, `findFirst`, `create`, `createMany`
- Il problema si manifesta solo con `update`, `delete`, `upsert` quando la clausola `where` contiene solo `id`
- Le query `updateMany` e `deleteMany` permettono clausole `where` più complesse che includono `tenantId`

## Correzioni Applicate

- ✅ `clientsController.ts` - Corretti `updateClient` e `deleteClient`
- ✅ `sitesController.ts` - Corretti `updateSite` e `deleteSite`  
- ✅ `shiftsController.ts` - Corretti tutti i metodi di aggiornamento e eliminazione turni
- ⏳ `settingsController.ts` - Utilizza `upsert` (sicuro)

## Test di Verifica

Tutti i test CRUD sono stati eseguiti con successo:
- ✅ Creazione clienti e siti
- ✅ Aggiornamento clienti e siti
- ✅ Eliminazione clienti e siti
- ✅ Creazione ed eliminazione turni

Data: 2025-01-22
Versione: 1.0