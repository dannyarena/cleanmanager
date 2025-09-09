# Database Setup - CleanManager

## Configurazione Database

Il progetto utilizza **PostgreSQL** con **Prisma ORM** per la gestione del database multi-tenant.

## Schema Database

### Tabelle Principali

- **tenants**: Aziende (multi-tenancy)
- **users**: Utenti con ruoli (Admin, Operatore) e flag Manager
- **clients**: Anagrafiche clienti dell'azienda
- **sites**: Sedi legate ai clienti
- **shifts**: Turni di lavoro
- **shift_recurrence**: Ricorrenze dei turni (daily/weekly)
- **shift_sites**: Relazione N:N tra turni e siti
- **shift_operators**: Relazione N:N tra turni e operatori
- **checklists**: Template checklist per sito
- **check_items**: Voci delle checklist
- **shift_exceptions**: Eccezioni/override per ricorrenze

## Setup Iniziale

### 1. Configurazione Environment

Copia il file `.env.example` in `.env` e configura:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/cleanmanager?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
```

### 2. Installazione Dipendenze

```bash
npm install
```

### 3. Generazione Client Prisma

```bash
npx prisma generate
```

### 4. Migrazione Database

```bash
npx prisma migrate dev --name init
```

### 5. Seeding Dati Demo

```bash
npm run db:seed
```

## Dati Demo Creati

### Utenti
- **Admin**: admin@cleanmanager.demo / password123
- **Manager**: manager@cleanmanager.demo / password123
- **Operatore 1**: operatore1@cleanmanager.demo / password123
- **Operatore 2**: operatore2@cleanmanager.demo / password123

### Struttura Dati
- 1 Tenant: "CleanManager Demo S.r.l."
- 3 Clienti aziendali (Hotel, Uffici, Residenza)
- 6 Siti distribuiti tra i clienti
- 6 Turni con ricorrenze daily/weekly
- 6 Checklist con 4 voci ciascuna
- 2 Eccezioni per dimostrare la funzionalità

## Comandi Utili

```bash
# Visualizza database in Prisma Studio
npx prisma studio

# Reset completo database
npx prisma migrate reset

# Nuova migrazione
npx prisma migrate dev --name nome_migrazione

# Deploy in produzione
npx prisma migrate deploy

# Seeding dati
npm run db:seed
```

## Struttura Multi-Tenant

Ogni tabella (eccetto `tenants`) include `tenantId` per l'isolamento dei dati:

- Tutti i dati sono filtrati automaticamente per `tenantId`
- Le relazioni includono `onDelete: Cascade` per mantenere l'integrità
- Gli utenti appartengono a un solo tenant

## Policy Ricorrenze

- **Generazione lazy**: Le occorrenze sono calcolate al volo per l'intervallo richiesto
- **Frequenze supportate**: DAILY, WEEKLY
- **Opzioni fine**: endDate, count, o senza fine (null)
- **Eccezioni**: Possibilità di cancellare o modificare singole occorrenze

## Sicurezza

- Password hashate con bcrypt
- JWT per autenticazione
- Isolamento dati per tenant
- Validazione input a livello schema