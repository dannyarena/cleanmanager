import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Clienti } from './pages/Clienti'
import { Siti } from './pages/Siti'
import { Operatori } from './pages/Operatori'
import { Calendario } from './pages/Calendario'
import { Settings } from './pages/Settings'
import { ToastProvider } from './components/ui/toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { authService } from './services/auth'

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clienti" element={<Clienti />} />
                <Route path="siti" element={<Siti />} />
                <Route path="operatori" element={<Operatori />} />
                <Route path="calendario" element={<Calendario />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </SettingsProvider>
  )
}

export default App