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
        // Controlla se c'è un tema in localStorage che potrebbe essere più recente
        const lsTheme = localStorage.getItem('cm_theme')
        if (lsTheme && (lsTheme === 'light' || lsTheme === 'dark') && lsTheme !== settingsData.theme) {
          // Se il tema in localStorage è diverso da quello del server, usa quello di localStorage
          // e aggiorna il server in background
          const mergedSettings = { ...settingsData, theme: lsTheme }
          setSettings(mergedSettings)
          // Aggiorna il server in background senza aspettare
          apiService.updateSettings({ theme: lsTheme }).catch(console.error)
        } else {
          setSettings(settingsData)
        }
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
    // DOPO — consenti update anche se settings è null (merge con default)
    if (saving || !authService.isAuthenticated()) return

    // Funzione per mappare i valori al formato server
    const toServerPayload = (partial: Partial<TenantSettings>) => {
      const out: any = {}
      if (partial.companyName !== undefined) out.companyName = partial.companyName?.trim()
      if (partial.primaryColor !== undefined) out.primaryColor = partial.primaryColor
      if (partial.theme !== undefined) out.theme = partial.theme.toUpperCase() // 'light' -> 'LIGHT'
      if (partial.workingDays !== undefined) {
        out.workingDays = Array.from(new Set(partial.workingDays))
          .filter(n => Number.isInteger(n) && n >= 1 && n <= 7)
          .sort((a,b)=>a-b)
      }
      if (partial.recurrenceDefaultFrequency !== undefined) {
        out.recurrenceDefaultFrequency = partial.recurrenceDefaultFrequency.toUpperCase() // 'daily' -> 'DAILY'
      }
      if (partial.recurrenceDefaultInterval !== undefined) {
        out.recurrenceDefaultInterval = Math.max(1, Math.floor(partial.recurrenceDefaultInterval))
      }
      if (partial.emailEnabled !== undefined) out.emailEnabled = !!partial.emailEnabled
      return out
    }

    try {
      setSaving(true)
      
      // Costruisci un "base" per l'ottimismo
      const base = settings ?? defaultSettings
      const updatedSettings = { ...base, ...newSettings }
      
      // UI reattiva anche a freddo
      setSettings(updatedSettings)
      
      // Salva sul server con payload mappato
      const updatedData = await apiService.updateSettings(toServerPayload(newSettings))
      
      toast.success('Impostazioni salvate con successo')
      // Se il server risponde, riallinea
      if (updatedData) {
        setSettings(updatedData)
      }
    } catch (err: any) {
      console.error('Errore nel salvataggio delle impostazioni:', err)
      // Rollback in caso di errore
      const rollbackSettings = settings ?? defaultSettings
      setSettings(rollbackSettings)
      const errorMessage = err?.message || 'Errore nel salvataggio delle impostazioni'
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