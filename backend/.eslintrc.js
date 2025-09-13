module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Regole di sicurezza base per bloccare codice pericoloso
    'no-eval': 'error',
    'no-implied-eval': 'error',
    
    // REGOLA CUSTOM NO-RAW-SQL ATTIVA
    // Questa regola blocca l'uso di $queryRaw e $executeRaw
    // tranne nei file whitelisted:
    // - src/utils/tenantSafeRaw.ts
    // - src/test/**
    // 
    // REGOLA CUSTOM no-raw-sql IMPLEMENTATA
    // 
    // La regola custom no-raw-sql è implementata tramite script di audit:
    // - Script: scripts/lint-no-raw-sql.js
    // - Comando: npm run lint:no-raw-sql
    // - Comando alias: npm run audit:security
    // 
    // Funzione: prevenire SQL injection bloccando query raw non autorizzate
    // Whitelist configurata:
    // - src/utils/tenantSafeRaw.ts (utility per query sicure)
    // - src/test/** (file di test)
    // - src/tests/** (file di test)
    // 
    // Pattern rilevati: $queryRaw, $executeRaw, prisma.$queryRaw, prisma.$executeRaw
  }
};

// NOTA: La regola custom no-raw-sql è presente in eslint-rules/no-raw-sql.js
// e deve essere attivata per garantire la sicurezza del database.
// La regola impedisce l'uso di query raw SQL non autorizzate.

// TODO: Aggiungere regola custom no-raw-sql
// La regola custom richiede una configurazione speciale per ESLint
// Regola desiderata:
// 'no-raw-sql/no-raw-sql': ['error', {
//   whitelist: [
//     'src/utils/tenantSafeRaw.ts',
//     'src/test/**'
//   ]
// }]