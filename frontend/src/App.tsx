import { useState, useEffect } from 'react'
import './App.css'

interface WelcomeData {
  message: string;
  description: string;
  timestamp: string;
  version: string;
  features: string[];
}

function App() {
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchWelcomeData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/welcome')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setWelcomeData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto')
        console.error('Errore nel caricamento dei dati:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWelcomeData()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧹 Clean Manager</h1>
        <p>Monorepo Full-Stack con React + Express</p>
      </header>
      
      <main className="app-main">
        {loading && (
          <div className="card loading">
            <h2>⏳ Caricamento...</h2>
            <p>Connessione al backend in corso...</p>
          </div>
        )}

        {error && (
          <div className="card error">
            <h2>❌ Errore di connessione</h2>
            <p>Impossibile connettersi al backend: {error}</p>
            <p>Assicurati che il server backend sia avviato su http://localhost:5000</p>
          </div>
        )}

        {welcomeData && (
          <div className="card success">
            <h2>{welcomeData.message}</h2>
            <p>{welcomeData.description}</p>
            <div className="api-info">
              <p><strong>Versione:</strong> {welcomeData.version}</p>
              <p><strong>Timestamp:</strong> {new Date(welcomeData.timestamp).toLocaleString('it-IT')}</p>
            </div>
          </div>
        )}
        
        <div className="card">
          <h2>Test Interattività</h2>
          <p>Frontend React funzionante!</p>
          <button onClick={() => setCount((count) => count + 1)}>
            Contatore: {count}
          </button>
        </div>
        
        <div className="features">
          <h3>Caratteristiche della Monorepo:</h3>
          {welcomeData ? (
            <ul>
              {welcomeData.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          ) : (
            <ul>
              <li>🏗️ Architettura Monorepo</li>
              <li>⚛️ Frontend React + TypeScript</li>
              <li>🚀 Backend Express + TypeScript</li>
              <li>🔄 Comunicazione API REST</li>
              <li>🌍 Variabili d'ambiente</li>
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default App