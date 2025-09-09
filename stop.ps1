# CleanManager - Script di Stop
# Questo script ferma tutti i servizi del sistema CleanManager

Write-Host "🛑 CleanManager - Stop Sistema" -ForegroundColor Red
Write-Host "==============================" -ForegroundColor Red
Write-Host ""

# Funzione per terminare processi Node.js
function Stop-NodeProcesses {
    Write-Host "🔄 Ricerca processi Node.js..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "📋 Trovati $($nodeProcesses.Count) processi Node.js" -ForegroundColor Yellow
        
        foreach ($process in $nodeProcesses) {
            try {
                $process.Kill()
                Write-Host "✅ Terminato processo Node.js (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Impossibile terminare processo PID: $($process.Id)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "ℹ️  Nessun processo Node.js trovato" -ForegroundColor Blue
    }
}

# Funzione per fermare container Docker
function Stop-DockerContainers {
    try {
        $dockerVersion = docker --version
        Write-Host "🐳 Docker trovato, controllo container..." -ForegroundColor Yellow
        
        # Verifica se il container CleanManager esiste ed è in esecuzione
        $containerRunning = docker ps --format "table {{.Names}}" | Select-String "cleanmanager-db"
        
        if ($containerRunning) {
            Write-Host "📦 Arresto container cleanmanager-db..." -ForegroundColor Yellow
            docker stop cleanmanager-db
            Write-Host "✅ Container cleanmanager-db arrestato" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  Container cleanmanager-db non in esecuzione" -ForegroundColor Blue
        }
        
    } catch {
        Write-Host "ℹ️  Docker non disponibile o non installato" -ForegroundColor Blue
    }
}

# Funzione per verificare porte
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

# Step 1: Ferma processi Node.js
Write-Host "🔧 Step 1: Terminazione processi Node.js" -ForegroundColor Blue
Write-Host "------------------------------------------" -ForegroundColor Blue
Stop-NodeProcesses
Write-Host ""

# Step 2: Ferma container Docker
Write-Host "🐳 Step 2: Arresto container Docker" -ForegroundColor Blue
Write-Host "-----------------------------------" -ForegroundColor Blue
Stop-DockerContainers
Write-Host ""

# Step 3: Verifica che le porte siano libere
Write-Host "🔍 Step 3: Verifica porte" -ForegroundColor Blue
Write-Host "-------------------------" -ForegroundColor Blue

$ports = @(
    @{Port=3000; Service="Backend API"},
    @{Port=5173; Service="Frontend Vite"},
    @{Port=5432; Service="PostgreSQL"}
)

foreach ($portInfo in $ports) {
    if (Test-Port -Port $portInfo.Port) {
        Write-Host "⚠️  Porta $($portInfo.Port) ($($portInfo.Service)) ancora in uso" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Porta $($portInfo.Port) ($($portInfo.Service)) libera" -ForegroundColor Green
    }
}

Write-Host ""

# Step 4: Pulizia processi rimasti
Write-Host "🧹 Step 4: Pulizia finale" -ForegroundColor Blue
Write-Host "-------------------------" -ForegroundColor Blue

# Termina eventuali processi npm rimasti
$npmProcesses = Get-Process -Name "npm" -ErrorAction SilentlyContinue
if ($npmProcesses) {
    Write-Host "📋 Terminazione processi npm rimasti..." -ForegroundColor Yellow
    $npmProcesses | ForEach-Object { 
        try {
            $_.Kill()
            Write-Host "✅ Terminato processo npm (PID: $($_.Id))" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Impossibile terminare processo npm PID: $($_.Id)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ℹ️  Nessun processo npm trovato" -ForegroundColor Blue
}

# Attendi un momento per la pulizia
Write-Host "⏳ Attendo pulizia processi..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ CleanManager arrestato completamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Per riavviare il sistema, eseguire: .\start.ps1" -ForegroundColor Cyan
Write-Host ""

# Verifica finale delle porte
Write-Host "🔍 Verifica finale:" -ForegroundColor Blue
$allPortsFree = $true
foreach ($portInfo in $ports) {
    if (Test-Port -Port $portInfo.Port) {
        Write-Host "   ❌ $($portInfo.Service) (porta $($portInfo.Port)) ancora attivo" -ForegroundColor Red
        $allPortsFree = $false
    } else {
        Write-Host "   ✅ $($portInfo.Service) (porta $($portInfo.Port)) arrestato" -ForegroundColor Green
    }
}

if ($allPortsFree) {
    Write-Host "\n🎉 Tutti i servizi sono stati arrestati correttamente!" -ForegroundColor Green
} else {
    Write-Host "\n⚠️  Alcuni servizi potrebbero essere ancora attivi. Riavviare il sistema se necessario." -ForegroundColor Yellow
}

Write-Host "\nPremere un tasto per chiudere..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")