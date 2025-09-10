import React from 'react'
import logo from '../../assets/logo-cleanmanager.png'
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Users, 
  Building2, 
  UserCheck, 
  Calendar,
  Settings
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { authService } from '../../services/auth'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Clienti', href: '/clienti', icon: Users },
  { name: 'Siti', href: '/siti', icon: Building2 },
  { name: 'Operatori', href: '/operatori', icon: UserCheck },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
]

export function Sidebar() {
  const user = authService.getUser()

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-primary">
        <img src={logo} alt="CleanManager" className="h-35 w-full max-w-[250px] object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {user?.role === 'admin' ? 'Amministratore' : 
               user?.isManager ? 'Manager' : 'Operatore'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}