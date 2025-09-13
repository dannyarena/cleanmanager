#!/usr/bin/env node
/**
 * Script di audit per verificare che la regola no-raw-sql sia attiva
 * Scansiona tutti i file TypeScript/JavaScript per query raw SQL non autorizzate
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configurazione whitelist (stessa del .eslintrc.js)
const WHITELIST = [
  'src/utils/tenantSafeRaw.ts',
  'src/test/**',
  'src/tests/**'
];

// Pattern per rilevare query raw SQL
const RAW_SQL_PATTERNS = [
  /\$queryRaw/g,
  /\$executeRaw/g,
  /prisma\.\$queryRaw/g,
  /prisma\.\$executeRaw/g
];

function isWhitelisted(filePath) {
  // Normalizza il path usando sempre forward slash per il confronto
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return WHITELIST.some(pattern => {
    if (pattern.includes('**')) {
      // Gestisce pattern con wildcard
      const regex = new RegExp('^' + pattern.replace('**', '.*').replace('/', '\\/'));
      return regex.test(normalizedPath);
    }
    return normalizedPath.includes(pattern);
  });
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  RAW_SQL_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lines = content.substring(0, match.index).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;
      
      violations.push({
        method: match[0],
        line: lineNumber,
        column: columnNumber,
        message: `Uso di ${match[0]} non autorizzato. Solo i file nella whitelist possono usare query raw SQL.`
      });
    }
  });
  
  return violations;
}

function main() {
  console.log('🔍 Audit regola no-raw-sql attiva...');
  console.log('📋 Whitelist configurata:');
  WHITELIST.forEach(pattern => console.log(`   - ${pattern}`));
  console.log('');
  
  // Trova tutti i file TypeScript e JavaScript
  const files = glob.sync('src/**/*.{ts,js}', { cwd: __dirname + '/..' });
  
  let totalViolations = 0;
  let scannedFiles = 0;
  
  files.forEach(file => {
    const fullPath = path.resolve(__dirname, '..', file);
    const relativePath = path.relative(process.cwd(), fullPath);
    
    scannedFiles++;
    
    if (isWhitelisted(file)) {
      console.log(`✅ ${file} (whitelisted)`);
      return;
    }
    
    const violations = scanFile(fullPath);
    
    if (violations.length > 0) {
      console.log(`❌ ${file}:`);
      violations.forEach(violation => {
        console.log(`   Linea ${violation.line}:${violation.column} - ${violation.message}`);
        totalViolations++;
      });
    } else {
      console.log(`✅ ${file}`);
    }
  });
  
  console.log('');
  console.log(`📊 Risultati audit:`);
  console.log(`   File scansionati: ${scannedFiles}`);
  console.log(`   Violazioni trovate: ${totalViolations}`);
  
  if (totalViolations > 0) {
    console.log('');
    console.log('🚨 AUDIT FALLITO: Trovate query raw SQL non autorizzate!');
    console.log('💡 Usa src/utils/tenantSafeRaw.ts per query sicure o aggiungi il file alla whitelist.');
    process.exit(1);
  } else {
    console.log('');
    console.log('✅ AUDIT SUPERATO: Nessuna query raw SQL non autorizzata trovata.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanFile, isWhitelisted, RAW_SQL_PATTERNS };