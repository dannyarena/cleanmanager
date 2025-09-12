import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { authService } from '../../services/auth'
import { useTheme } from '../../contexts/ThemeContext'

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/clienti': 'Clienti',
  '/siti': 'Siti',
  '/operatori': 'Operatori',
  '/calendario': 'Calendario',
}

export function Topbar() {
  const location = useLocation()
  const user = authService.getUser()
  const { theme, setTheme } = useTheme()
  const loading = false
  
  const currentPageName = pageNames[location.pathname] || 'CleanManager'

  const handleLogout = () => {
    authService.logout()
  }

  return (
    <header className="bg-background shadow-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {currentPageName}
          </h1>
        </div>

        {/* User actions */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="flex items-center min-w-[120px]">
            <div className="flex flex-col justify-center mr-3">
              <p className="text-sm font-medium text-foreground leading-tight">{user ? `${user.firstName} ${user.lastName}` : ''}</p>
              <p className="text-xs text-muted-foreground">
                {user?.role === 'admin' ? 'Amministratore' : 
                 user?.isManager ? 'Manager' : 'Operatore'}
              </p>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {(user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Cambia tema"
              disabled={loading}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {/* Settings button removed */}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      {/* Settings dialog removed */}
    </header>
  )
}