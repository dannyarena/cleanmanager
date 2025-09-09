# CleanManager - Script di Avvio Unificato
# Questo script avvia database, backend e frontend in sequenza

Write-Host "🧹 CleanManager - Avvio Sistema Completo" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Funzione per verificare se una porta è in uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Funzione per attendere che un servizio sia pronto
function Wait-ForService {
    param([int]$Port, [string]$ServiceName, [int]$MaxWait = 30)
    
    Write-Host "⏳ Attendo che $ServiceName sia pronto sulla porta $Port..." -ForegroundColor Yellow
    
    $waited = 0
    while ($waited -lt $MaxWait) {
        if (Test-Port -Port $Port) {
            Write-Host "✅ $ServiceName è pronto!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        $waited++
    }
    
    Write-Host "❌ Timeout: $ServiceName non è pronto dopo $MaxWait secondi" -ForegroundColor Red
    return $false
}

# Verifica prerequisiti
Write-Host "🔍 Verifica prerequisiti..." -ForegroundColor Blue

# Verifica Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trovato. Installare Node.js prima di continuare." -ForegroundColor Red
    exit 1
}

# Verifica npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm non trovato." -ForegroundColor Red
    exit 1
}

# Verifica Docker (opzionale per database)
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    $hasDocker = $true
} catch {
    Write-Host "⚠️  Docker non trovato. Verrà usato SQLite locale." -ForegroundColor Yellow
    $hasDocker = $false
}

Write-Host ""

# Step 1: Setup Database
Write-Host "📊 Step 1: Setup Database" -ForegroundColor Blue
Write-Host "-------------------------" -ForegroundColor Blue

if ($hasDocker) {
    Write-Host "🐳 Avvio container PostgreSQL..." -ForegroundColor Yellow
    
    # Verifica se il container esiste già
    $containerExists = docker ps -a --format "table {{.Names}}" | Select-String "cleanmanager-db"
    
    if ($containerExists) {
        Write-Host "📦 Container esistente trovato, avvio..." -ForegroundColor Yellow
        docker start cleanmanager-db
    } else {
        Write-Host "📦 Creazione nuovo container PostgreSQL..." -ForegroundColor Yellow
        docker run -d `
            --name cleanmanager-db `
            -e POSTGRES_DB=cleanmanager `
            -e POSTGRES_USER=cleanmanager `
            -e POSTGRES_PASSWORD=cleanmanager123 `
            -p 5432:5432 `
            postgres:15
    }
    
    # Attendi che PostgreSQL sia pronto
    if (Wait-ForService -Port 5432 -ServiceName "PostgreSQL" -MaxWait 60) {
        Write-Host "✅ Database PostgreSQL pronto!" -ForegroundColor Green
    } else {
        Write-Host "❌ Errore nell'avvio di PostgreSQL" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📁 Uso SQLite locale (nessuna configurazione richiesta)" -ForegroundColor Green
}

Write-Host ""

# Step 2: Setup Backend
Write-Host "🔧 Step 2: Setup Backend" -ForegroundColor Blue
Write-Host "------------------------" -ForegroundColor Blue

Set-Location "backend"

# Installa dipendenze se necessario
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installazione dipendenze backend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Errore nell'installazione dipendenze backend" -ForegroundColor Red
        exit 1
    }
}

# Genera Prisma Client
Write-Host "🔄 Generazione Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Errore nella generazione Prisma Client" -ForegroundColor Red
    exit 1
}

# Esegui migrazioni
Write-Host "🗃️  Esecuzione migrazioni database..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Errore nelle migrazioni database" -ForegroundColor Red
    exit 1
}

# Seed database
Write-Host "🌱 Popolamento database con dati demo..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Errore nel seed (potrebbe essere già popolato)" -ForegroundColor Yellow
}

# Avvia backend in background
Write-Host "🚀 Avvio server backend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden

# Attendi che il backend sia pronto
if (Wait-ForService -Port 3000 -ServiceName "Backend API" -MaxWait 30) {
    Write-Host "✅ Backend pronto su http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Errore nell'avvio del backend" -ForegroundColor Red
    exit 1
}

Set-Location ".."
Write-Host ""

# Step 3: Setup Frontend
Write-Host "🎨 Step 3: Setup Frontend" -ForegroundColor Blue
Write-Host "-------------------------" -ForegroundColor Blue

Set-Location "frontend"

# Installa dipendenze se necessario
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installazione dipendenze frontend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Errore nell'installazione dipendenze frontend" -ForegroundColor Red
        exit 1
    }
}

# Avvia frontend
Write-Host "🚀 Avvio server frontend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden

# Attendi che il frontend sia pronto
if (Wait-ForService -Port 5173 -ServiceName "Frontend" -MaxWait 30) {
    Write-Host "✅ Frontend pronto su http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "❌ Errore nell'avvio del frontend" -ForegroundColor Red
    exit 1
}

Set-Location ".."
Write-Host ""

# Riepilogo finale
Write-Host "🎉 CleanManager avviato con successo!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend:   http://localhost:3000" -ForegroundColor Cyan
if ($hasDocker) {
    Write-Host "📊 Database:  PostgreSQL su localhost:5432" -ForegroundColor Cyan
} else {
    Write-Host "📊 Database:  SQLite locale" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "👤 Credenziali demo:" -ForegroundColor Yellow
Write-Host "   Admin:     admin@cleanmanager.it / admin123" -ForegroundColor White
Write-Host "   Manager:   manager@cleanmanager.it / manager123" -ForegroundColor White
Write-Host "   Operatore: operatore@cleanmanager.it / operatore123" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Per fermare tutti i servizi, premere Ctrl+C" -ForegroundColor Red
Write-Host ""

# Apri browser automaticamente
try {
    Start-Process "http://localhost:5173"
    Write-Host "🌐 Browser aperto automaticamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Impossibile aprire il browser automaticamente" -ForegroundColor Yellow
}

# Mantieni lo script in esecuzione
Write-Host "⏳ Sistema in esecuzione... Premere Ctrl+C per terminare" -ForegroundColor Cyan
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Verifica che i servizi siano ancora attivi
        if (!(Test-Port -Port 3000)) {
            Write-Host "❌ Backend non risponde!" -ForegroundColor Red
            break
        }
        if (!(Test-Port -Port 5173)) {
            Write-Host "❌ Frontend non risponde!" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "\n🛑 Arresto sistema..." -ForegroundColor Yellow
}

Write-Host "\n👋 CleanManager arrestato. Arrivederci!" -ForegroundColor Cyan