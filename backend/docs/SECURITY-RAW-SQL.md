# 🔒 Sicurezza Query Raw SQL - CleanManager

**Milestone 5 - Audit & blocco query pericolose**

Questo documento definisce le policy di sicurezza per l'uso di query raw SQL nel sistema multi-tenant CleanManager.

## 📋 Panoramica

Per garantire l'isolamento completo tra tenant, tutte le query raw SQL (`$queryRaw`, `$executeRaw`) sono soggette a controlli automatici e devono rispettare regole specifiche.

## 🚫 Regole di Sicurezza

### 1. Divieto Generale
- **VIETATO**: Uso diretto di `$queryRaw` e `$executeRaw` fuori dalla whitelist
- **OBBLIGATORIO**: Uso dei wrapper sicuri in `utils/tenantSafeRaw.ts`
- **CONTROLLO**: Pipeline CI blocca automaticamente violazioni

### 2. Filtro Tenant Obbligatorio
Tutte le query devono:
- Includere `WHERE tenant_id = $1` come primo filtro
- Usare `$1` riservato per `tenantId`
- Parametri aggiuntivi iniziano da `$2`

### 3. Validazioni Automatiche
- Query SELECT: devono filtrare per `tenant_id`
- Query UPDATE/DELETE: devono includere `WHERE tenant_id = $1`
- Query INSERT: devono includere campo `tenant_id`

## ✅ Whitelist Autorizzata

### File Consentiti
```
migrations/          # Script di migrazione database
seeds/              # Dati di seed iniziali
scripts/backfill    # Script di backfill dati
utils/rawSqlWrapper.ts    # Wrapper legacy (deprecato)
utils/tenantSafeRaw.ts    # Wrapper sicuri (raccomandato)
scripts/audit-raw-sql.js  # Script di audit
```

### Criteri per Whitelist
1. **Migrazione Database**: Script che operano su struttura DB
2. **Seed Dati**: Popolamento iniziale multi-tenant
3. **Utility Sistema**: Funzioni di manutenzione autorizzate
4. **Script Audit**: Strumenti di controllo sicurezza

## 🛠️ Wrapper Sicuri

### TenantSafeRaw - Raccomandato

```typescript
import { executeTenantSafeRaw } from '../utils/tenantSafeRaw';

// ✅ CORRETTO - Query sicura
const result = await executeTenantSafeRaw(prisma, {
  req, // Request con JWT token
  sql: 'SELECT * FROM shifts WHERE tenant_id = $1 AND date >= $2',
  params: [new Date('2024-01-01')]
});
```

### Query Builder - Alternativa

```typescript
import { TenantSafeQueryBuilder } from '../utils/tenantSafeRaw';

// ✅ CORRETTO - Builder sicuro
const result = await new TenantSafeQueryBuilder(req)
  .select('*')
  .from('shifts')
  .where('date >= $1', new Date())
  .orderBy('date', 'ASC')
  .execute(prisma);
```

## ❌ Esempi Vietati

```typescript
// ❌ VIETATO - Query raw diretta
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;

// ❌ VIETATO - Manca filtro tenant
const result = await prisma.$queryRaw`
  SELECT * FROM shifts WHERE date >= ${date}
`;

// ❌ VIETATO - tenantId non è $1
const result = await prisma.$queryRaw`
  SELECT * FROM shifts WHERE date >= $1 AND tenant_id = $2
`;
```

## 🔍 Controlli Automatici

### ESLint Rule
- **File**: `eslint-rules/no-raw-sql.js`
- **Trigger**: Pre-commit, CI/CD
- **Azione**: Blocca commit con violazioni

### Audit Script
- **File**: `scripts/audit-raw-sql.js`
- **Esecuzione**: Giornaliera (2:00 AM)
- **Report**: JSON in `audit-reports/`

### Pipeline CI
- **File**: `.github/workflows/security-audit.yml`
- **Trigger**: Push, PR, Schedule
- **Azione**: Build failure per violazioni

## 📝 Procedura per Eccezioni

### 1. Richiesta Autorizzazione

**Template Issue GitHub:**
```markdown
## 🔒 Richiesta Eccezione Raw SQL

**File**: `path/to/file.ts`
**Motivo**: Descrizione tecnica necessità
**Query**: 
```sql
SELECT ...
```

**Sicurezza**:
- [ ] Query filtra per tenant_id
- [ ] Parametri sanitizzati
- [ ] Test isolamento inclusi
- [ ] Documentazione aggiornata

**Revisori**: @security-team
```

### 2. Review Sicurezza

**Checklist Revisore:**
- [ ] Necessità tecnica giustificata
- [ ] Alternative sicure valutate
- [ ] Filtro tenant_id presente
- [ ] Test isolamento completi
- [ ] Documentazione adeguata
- [ ] Scadenza eccezione definita

### 3. Approvazione

1. **Aggiorna Whitelist**: Aggiungi file a `CONFIG.whitelist`
2. **Documenta**: Aggiungi entry in questo file
3. **Test**: Esegui audit completo
4. **Monitor**: Pianifica review periodica

## 📊 Monitoring e Audit

### Metriche Sicurezza
- **Violazioni/giorno**: Target = 0
- **File whitelisted**: Monitoraggio crescita
- **Coverage test**: Target = 100%
- **Tempo audit**: < 30 secondi

### Report Periodici
- **Settimanale**: Summary violazioni
- **Mensile**: Review whitelist
- **Trimestrale**: Audit completo sicurezza

### Alert Automatici
- **Slack**: Violazioni in produzione
- **Email**: Fallimenti CI critici
- **Dashboard**: Metriche real-time

## 🚨 Incident Response

### Violazione Rilevata
1. **Immediato**: Blocca deploy
2. **Analisi**: Valuta impatto sicurezza
3. **Remediation**: Fix o rollback
4. **Post-mortem**: Migliora controlli

### Bypass Rilevato
1. **Emergenza**: Stop sistema
2. **Forensics**: Analizza data leakage
3. **Notification**: Clienti interessati
4. **Recovery**: Ripristino sicuro

## 📚 Risorse

- **Wrapper Sicuri**: `src/utils/tenantSafeRaw.ts`
- **Test Sicurezza**: `src/tests/security/tenant-isolation.test.ts`
- **Audit Script**: `scripts/audit-raw-sql.js`
- **Pipeline CI**: `.github/workflows/security-audit.yml`
- **ESLint Rule**: `eslint-rules/no-raw-sql.js`

## 🔄 Changelog

### v1.0.0 - Milestone 5
- ✅ Implementazione controlli automatici
- ✅ Wrapper sicuri per raw SQL
- ✅ Pipeline CI con audit
- ✅ Test isolamento completi
- ✅ Documentazione procedure

---

**⚠️ IMPORTANTE**: Questo documento è parte integrante della sicurezza del sistema. Modifiche richiedono approvazione del security team.