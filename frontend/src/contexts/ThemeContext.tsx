import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSettings } from './SettingsContext'

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

  // Funzione per applicare il tema e il colore
  const applyThemeAndColor = (newTheme: 'light' | 'dark', newColor: string) => {
    // Applica la classe del tema
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
    
    // Converte hex in RGB per Tailwind
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null
    }
    
    const rgb = hexToRgb(newColor)
    if (rgb) {
      root.style.setProperty('--cm-primary', `${rgb.r} ${rgb.g} ${rgb.b}`)
    }
  }

  // Applica il tema quando le impostazioni cambiano
  useEffect(() => {
    if (settings) {
      applyThemeAndColor(settings.theme, settings.primaryColor)
    }
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
      primaryColor: settings?.primaryColor || '#2563eb',
      setTheme,
      setPrimaryColor
    }}>
      {children}
    </ThemeContext.Provider>
  )
}