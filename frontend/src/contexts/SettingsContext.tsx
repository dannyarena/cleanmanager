import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '../services/api'
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
  primaryColor: '#2563eb',
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
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.get('/settings')
      
      if (response.success && response.data) {
        setSettings(response.data)
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
    if (!settings || saving) return

    try {
      setSaving(true)
      const updatedSettings = { ...settings, ...newSettings }
      
      // Aggiorna immediatamente lo stato locale per UI reattiva
      setSettings(updatedSettings)
      
      // Salva sul server
      const response = await apiService.put('/settings', newSettings)
      
      if (response.success) {
        toast.success('Impostazioni salvate con successo')
        // Aggiorna con i dati dal server per sicurezza
        if (response.data) {
          setSettings(response.data)
        }
      } else {
        // Rollback in caso di errore
        setSettings(settings)
        toast.error(response.error || 'Errore nel salvataggio delle impostazioni')
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

  // Carica le impostazioni al mount del provider
  useEffect(() => {
    loadSettings()
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