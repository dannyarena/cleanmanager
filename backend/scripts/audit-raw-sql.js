#!/usr/bin/env node
/**
 * Script di audit per scansionare pattern SQL pericolosi
 * Milestone 5 - Audit & blocco query pericolose
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurazione audit
const CONFIG = {
  // Pattern pericolosi da cercare
  dangerousPatterns: [
    /\$queryRaw/g,
    /\$executeRaw/g,
    /prisma\.\$queryRaw/g,
    /prisma\.\$executeRaw/g
  ],
  
  // File e directory nella whitelist
  whitelist: [
    'migrations/',
    'seeds/',
    'scripts/backfill',
    'utils/rawSqlWrapper.ts',
    'utils/tenantSafeRaw.ts',
    'scripts/audit-raw-sql.js' // Questo script stesso
  ],
  
  // Directory da scansionare
  scanDirectories: [
    'src/',
    'controllers/',
    'services/',
    'routes/'
  ],
  
  // Estensioni file da controllare
  fileExtensions: ['.ts', '.js']
};

class RawSqlAuditor {
  constructor() {
    this.violations = [];
    this.scannedFiles = 0;
    this.whitelistedFiles = 0;
  }
  
  /**
   * Verifica se un file è nella whitelist
   */
  isWhitelisted(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return CONFIG.whitelist.some(pattern => 
      normalizedPath.includes(pattern)
    );
  }
  
  /**
   * Scansiona un singolo file per pattern pericolosi
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      CONFIG.dangerousPatterns.forEach(pattern => {
        let match;
        let lineNumber = 0;
        
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              pattern: pattern.source,
              content: line.trim(),
              severity: 'ERROR'
            });
          }
        });
      });
      
    } catch (error) {
      console.warn(`⚠️  Impossibile leggere file: ${filePath}`);
    }
  }
  
  /**
   * Scansiona ricorsivamente una directory
   */
  scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️  Directory non trovata: ${dirPath}`);
      return;
    }
    
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Ricorsione nelle sottodirectory
        this.scanDirectory(fullPath);
      } else if (stat.isFile()) {
        // Controlla estensione file
        const ext = path.extname(fullPath);
        if (CONFIG.fileExtensions.includes(ext)) {
          this.scannedFiles++;
          
          if (this.isWhitelisted(fullPath)) {
            this.whitelistedFiles++;
            console.log(`✅ Whitelisted: ${fullPath}`);
          } else {
            this.scanFile(fullPath);
          }
        }
      }
    });
  }
  
  /**
   * Esegue l'audit completo
   */
  runAudit() {
    console.log('🔍 Avvio audit query raw SQL...');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    // Scansiona tutte le directory configurate
    CONFIG.scanDirectories.forEach(dir => {
      const fullPath = path.resolve(dir);
      console.log(`📁 Scansionando: ${fullPath}`);
      this.scanDirectory(fullPath);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.printResults(duration);
    
    // Exit code per CI/CD
    return this.violations.length === 0 ? 0 : 1;
  }
  
  /**
   * Stampa i risultati dell'audit
   */
  printResults(duration) {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 RISULTATI AUDIT');
    console.log('=' .repeat(50));
    
    console.log(`⏱️  Tempo esecuzione: ${duration}ms`);
    console.log(`📄 File scansionati: ${this.scannedFiles}`);
    console.log(`✅ File whitelisted: ${this.whitelistedFiles}`);
    console.log(`❌ Violazioni trovate: ${this.violations.length}`);
    
    if (this.violations.length > 0) {
      console.log('\n🚨 VIOLAZIONI RILEVATE:');
      console.log('-' .repeat(50));
      
      this.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.severity}`);
        console.log(`   File: ${violation.file}`);
        console.log(`   Linea: ${violation.line}`);
        console.log(`   Pattern: ${violation.pattern}`);
        console.log(`   Codice: ${violation.content}`);
      });
      
      console.log('\n💡 SOLUZIONI:');
      console.log('- Usa i wrapper sicuri in utils/tenantSafeRaw.ts');
      console.log('- Aggiungi il file alla whitelist se necessario');
      console.log('- Richiedi autorizzazione per eccezioni speciali');
      
    } else {
      console.log('\n🎉 Nessuna violazione trovata! Codebase sicuro.');
    }
  }
  
  /**
   * Genera report JSON per CI/CD
   */
  generateJsonReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        scannedFiles: this.scannedFiles,
        whitelistedFiles: this.whitelistedFiles,
        violations: this.violations.length,
        status: this.violations.length === 0 ? 'PASS' : 'FAIL'
      },
      violations: this.violations,
      config: CONFIG
    };
    
    const reportPath = path.join(__dirname, '../audit-reports/raw-sql-audit.json');
    
    // Crea directory se non esiste
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report JSON salvato: ${reportPath}`);
  }
}

// Esecuzione script
if (require.main === module) {
  const auditor = new RawSqlAuditor();
  const exitCode = auditor.runAudit();
  
  // Genera report JSON se richiesto
  if (process.argv.includes('--json')) {
    auditor.generateJsonReport();
  }
  
  process.exit(exitCode);
}

module.exports = RawSqlAuditor;