import React from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut, Settings, User } from 'lucide-react'
import { Button } from '../ui/button'
import { authService } from '../../services/auth'

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
  
  const currentPageName = pageNames[location.pathname] || 'CleanManager'

  const handleLogout = () => {
    authService.logout()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {currentPageName}
          </h1>
        </div>

        {/* User actions */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'admin' ? 'Amministratore' : 
                 user?.isManager ? 'Manager' : 'Operatore'}
              </p>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700"
              title="Impostazioni"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}