# Script di Audit di Sicurezza

## Regola Custom: no-raw-sql

### Descrizione
La regola `no-raw-sql` previene l'uso non autorizzato di query raw SQL nel codebase per prevenire vulnerabilità di SQL injection.

### Funzionamento
Lo script `lint-no-raw-sql.js` scansiona tutti i file TypeScript e JavaScript alla ricerca di:
- `$queryRaw`
- `$executeRaw` 
- `prisma.$queryRaw`
- `prisma.$executeRaw`

### Whitelist
I seguenti pattern sono autorizzati ad usare query raw SQL:
- `src/utils/tenantSafeRaw.ts` - Utility per query sicure con validazione tenant
- `src/test/**` - File di test
- `src/tests/**` - File di test

### Comandi Disponibili

```bash
# Esegue l'audit della regola no-raw-sql
npm run lint:no-raw-sql

# Alias per audit di sicurezza
npm run audit:security
```

### Output di Esempio

#### Audit Superato
```
🔍 Audit regola no-raw-sql attiva...
📋 Whitelist configurata:
   - src/utils/tenantSafeRaw.ts
   - src/test/**
   - src/tests/**

✅ src\controllers\clientsController.ts
✅ src\utils\tenantSafeRaw.ts (whitelisted)

📊 Risultati audit:
   File scansionati: 31
   Violazioni trovate: 0

✅ AUDIT SUPERATO: Nessuna query raw SQL non autorizzata trovata.
```

#### Audit Fallito
```
❌ src\controllers\unsafeController.ts:
   Linea 15:26 - Uso di $queryRaw non autorizzato. Solo i file nella whitelist possono usare query raw SQL.

📊 Risultati audit:
   File scansionati: 31
   Violazioni trovate: 1

🚨 AUDIT FALLITO: Trovate query raw SQL non autorizzate!
💡 Usa src/utils/tenantSafeRaw.ts per query sicure o aggiungi il file alla whitelist.
```

### Come Risolvere le Violazioni

1. **Usa l'utility sicura**: Sostituisci le query raw con `tenantSafeRaw()` da `src/utils/tenantSafeRaw.ts`
2. **Aggiungi alla whitelist**: Se il file deve legittimamente usare query raw, aggiungilo alla whitelist nello script

### Integrazione CI/CD
Aggiungi il comando al pipeline di build:
```bash
npm run audit:security
```

Lo script restituisce exit code 1 in caso di violazioni, fermando il build.