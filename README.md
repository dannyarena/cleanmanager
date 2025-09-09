# 🧹 CleanManager

**Sistema di gestione turni e operatori per aziende di pulizie**

CleanManager è un'applicazione web completa per la gestione di turni, operatori, clienti e siti per aziende di servizi di pulizia. Il sistema supporta multi-tenancy, ruoli utente differenziati e gestione completa delle attività operative.

## 🚀 Avvio Rapido

### Prerequisiti
- Node.js 18+ e npm/pnpm
- PostgreSQL (opzionale, usa SQLite di default)
- Docker (opzionale, per PostgreSQL)

### Avvio con Script Automatico
```powershell
# Avvia tutto (database, backend, frontend)
.\start.ps1

# Arresta tutti i servizi
.\stop.ps1
```

### Accesso all'Applicazione
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database**: PostgreSQL su porta 5432

### Credenziali Demo
| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@cleanmanager.demo | password123 |
| Manager | manager@cleanmanager.demo | password123 |
| Operatore 1 | operatore1@cleanmanager.demo | password123 |
| Operatore 2 | operatore2@cleanmanager.demo | password123 |

## 📋 Funzionalità Implementate (MVP)

- **🔐 Autenticazione e Autorizzazione**
  - Login con email/password, JWT tokens,
  - Ruoli: Admin, Manager, Operatore
  - Isolamento multi-tenant completo

- **👥 Gestione Utenti e Operatori**
  - Creazione e modifica operatori
  - Assegnazione ruoli e permessi
  - Badge colorati per ruoli

- **🏢 Gestione Clienti e Siti**
  - Anagrafica clienti completa
  - Gestione siti per cliente
  - Ricerca e filtri avanzati
  - Sistema checklist per sito

- **📅 Gestione Turni**
  - Creazione turni singoli e ricorrenti
  - Calendario settimanale interattivo
  - Assegnazione operatori e siti
  - Ricorrenze daily/weekly con gestione eccezioni

- **📊 Dashboard e KPI**
  - Turni oggi, operatori attivi
  - Checklist da completare
  - Statistiche e trend in tempo reale
  - Attività recenti

- **🎨 Design System Completo**
  - Componenti UI riutilizzabili
  - Hover effects e transizioni fluide
  - Stati vuoti con illustrazioni SVG
  - Tabelle con righe alternate
  - Sistema di validazione unificato

## 🛠️ Setup Manuale (Alternativo)

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Script disponibili

- `npm run dev` - Avvia il server di sviluppo
- `npm run build` - Crea la build di produzione
- `npm run preview` - Anteprima della build di produzione
- `npm run lint` - Esegue ESLint per controllare il codice
- `npm run lint:fix` - Corregge automaticamente gli errori ESLint
- `npm run type-check` - Controlla i tipi TypeScript

## 📁 Struttura del progetto

```
cleanmanager/
├── public/
│   └── vite.svg
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .eslintrc.cjs
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## 🎨 Personalizzazione

### Variabili CSS
Il progetto utilizza variabili CSS personalizzate definite in `src/index.css`:

```css
:root {
  --primary-color: #646cff;
  --primary-hover: #535bf2;
  --border-radius: 8px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Alias di percorso
È configurato l'alias `@` per puntare alla cartella `src`:

```typescript
import Component from '@/components/Component'
```

## 🔧 Configurazione

### Vite
La configurazione di Vite si trova in `vite.config.ts` e include:
- Plugin React
- Alias di percorso
- Configurazione del server di sviluppo
- Opzioni di build

### TypeScript
Il progetto è configurato con TypeScript strict mode per massima sicurezza dei tipi.

### ESLint
ESLint è configurato con regole per React e TypeScript per mantenere la qualità del codice.

## 🤝 Contribuire

1. Fai un fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le tue modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza


## 🆘 Supporto

Se hai domande o problemi, apri una issue nel repository.

---

**Buon coding! 🚀**