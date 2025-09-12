import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSettings } from './SettingsContext'
import { hexToHsl } from '../lib/utils'

interface ThemeContextType {
  theme: 'light' | 'dark'
  primaryColor: string
  setTheme: (theme: 'light' | 'dark') => void
  setPrimaryColor: (color: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, updateSettings } = useSettings()
  const [lsTheme, setLsTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cm_theme') === 'dark' ? 'dark' : 'light'
    }
    return 'light'
  })

  // Applica il tema al documento
  useEffect(() => {
    const serverTheme = settings?.theme?.toLowerCase() as 'light' | 'dark' | undefined
    const theme = serverTheme ?? lsTheme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings?.theme, lsTheme])

  // Applica il colore primario
  useEffect(() => {
    const primaryColor = settings?.primaryColor || '#2563EB'
    const hsl = hexToHsl(primaryColor)
    document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
  }, [settings?.primaryColor])

  const setTheme = (newTheme: 'light' | 'dark') => {
    // Applica immediatamente il tema
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Salva nel localStorage
    localStorage.setItem('cm_theme', newTheme)
    
    // Aggiorna lo stato locale
    setLsTheme(newTheme)
    
    // Persisti sul server in background (converti in maiuscolo per il backend)
    updateSettings({ theme: newTheme.toUpperCase() as 'LIGHT' | 'DARK' })
  }

  const setPrimaryColor = async (newColor: string) => {
    await updateSettings({ primaryColor: newColor })
  }

  return (
    <ThemeContext.Provider value={{
      theme: (settings?.theme?.toLowerCase() as 'light' | 'dark') ?? lsTheme,
      primaryColor: settings?.primaryColor || '#2563EB',
      setTheme,
      setPrimaryColor
    }}>
      {children}
    </ThemeContext.Provider>
  )
}