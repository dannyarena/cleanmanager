import React, { createContext, useContext, useEffect, ReactNode } from 'react'
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

  // Applica il tema e il colore primario
  useEffect(() => {
    if (!settings) return
    
    const root = document.documentElement
    
    // Applica la classe dark su <html> quando theme === 'dark'
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Converte primaryColor da hex a HSL e applica --primary
    const hsl = hexToHsl(settings.primaryColor)
    root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
  }, [settings?.theme, settings?.primaryColor])



  const setTheme = async (newTheme: 'light' | 'dark') => {
    await updateSettings({ theme: newTheme })
  }

  const setPrimaryColor = async (newColor: string) => {
    await updateSettings({ primaryColor: newColor })
  }

  return (
    <ThemeContext.Provider value={{
      theme: settings?.theme || 'light',
      primaryColor: settings?.primaryColor || '#2563EB',
      setTheme,
      setPrimaryColor
    }}>
      {children}
    </ThemeContext.Provider>
  )
}