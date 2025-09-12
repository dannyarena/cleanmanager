import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '../services/api'
import { authService } from '../services/auth'
import { toast } from 'sonner'

export interface TenantSettings {
  companyName: string
  primaryColor: string
  theme: 'light' | 'dark'
  workingDays: number[]
  recurrenceDefaultFrequency: 'daily' | 'weekly'
  recurrenceDefaultInterval: number
  emailEnabled: boolean
}

interface SettingsContextType {
  settings: TenantSettings | null
  loading: boolean
  saving: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSettings: (newSettings: Partial<TenantSettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

const defaultSettings: TenantSettings = {
  companyName: 'CleanManager',
  primaryColor: '#2563EB',
  theme: 'light',
  workingDays: [1, 2, 3, 4, 5], // Lun-Ven
  recurrenceDefaultFrequency: 'weekly',
  recurrenceDefaultInterval: 1,
  emailEnabled: false
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    if (!authService.isAuthenticated()) {
      setSettings(defaultSettings)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const settingsData = await apiService.getSettings()
      
      if (settingsData) {
        setSettings(settingsData)
      } else {
        // Se non ci sono impostazioni salvate, usa i default
        setSettings(defaultSettings)
      }
    } catch (err) {
      console.error('Errore nel caricamento delle impostazioni:', err)
      setError('Errore nel caricamento delle impostazioni')
      // In caso di errore, usa i default
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<TenantSettings>) => {
    if (!settings || saving || !authService.isAuthenticated()) return

    try {
      setSaving(true)
      const updatedSettings = { ...settings, ...newSettings }
      
      // Aggiorna immediatamente lo stato locale per UI reattiva
      setSettings(updatedSettings)
      
      // Salva sul server
      const updatedData = await apiService.updateSettings(newSettings)
      
      toast.success('Impostazioni salvate con successo')
      // Aggiorna con i dati dal server per sicurezza
      if (updatedData) {
        setSettings(updatedData)
      }
    } catch (err: any) {
      console.error('Errore nel salvataggio delle impostazioni:', err)
      // Rollback in caso di errore
      setSettings(settings)
      const errorMessage = err?.response?.data?.error || 'Errore nel salvataggio delle impostazioni'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const refreshSettings = async () => {
    await loadSettings()
  }

  // Carica le impostazioni al mount del provider solo se autenticato
  useEffect(() => {
    if (authService.isAuthenticated()) {
      loadSettings()
    } else {
      // Se non autenticato, usa le impostazioni di default
      setSettings(defaultSettings)
      setLoading(false)
    }
  }, [])

  const contextValue: SettingsContextType = {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    updateSettings,
    refreshSettings
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}