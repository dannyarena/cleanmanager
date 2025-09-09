import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  illustration?: 'cleaning' | 'calendar' | 'users' | 'sites' | 'default'
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

// SVG Illustrations
const CleaningIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-300">
    <circle cx="40" cy="40" r="35" fill="currentColor" opacity="0.1"/>
    <path d="M25 35h30v25c0 2.76-2.24 5-5 5H30c-2.76 0-5-2.24-5-5V35z" fill="currentColor" opacity="0.3"/>
    <rect x="35" y="15" width="10" height="25" rx="2" fill="currentColor" opacity="0.5"/>
    <circle cx="40" cy="20" r="3" fill="currentColor" opacity="0.7"/>
    <path d="M30 45l20-10M30 50l20-10M30 55l15-7" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
  </svg>
)

const CalendarIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-300">
    <rect x="15" y="20" width="50" height="45" rx="4" fill="currentColor" opacity="0.1"/>
    <rect x="15" y="20" width="50" height="12" rx="4" fill="currentColor" opacity="0.3"/>
    <rect x="25" y="15" width="4" height="10" rx="2" fill="currentColor" opacity="0.5"/>
    <rect x="51" y="15" width="4" height="10" rx="2" fill="currentColor" opacity="0.5"/>
    <circle cx="25" cy="40" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="35" cy="40" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="45" cy="40" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="55" cy="40" r="2" fill="currentColor" opacity="0.4"/>
  </svg>
)

const UsersIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-300">
    <circle cx="30" cy="30" r="8" fill="currentColor" opacity="0.3"/>
    <circle cx="50" cy="30" r="8" fill="currentColor" opacity="0.3"/>
    <path d="M15 60c0-8.28 6.72-15 15-15s15 6.72 15 15" fill="currentColor" opacity="0.2"/>
    <path d="M35 60c0-8.28 6.72-15 15-15s15 6.72 15 15" fill="currentColor" opacity="0.2"/>
  </svg>
)

const SitesIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-300">
    <rect x="20" y="35" width="40" height="30" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="25" y="25" width="30" height="40" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="30" y="15" width="20" height="50" rx="2" fill="currentColor" opacity="0.3"/>
    <rect x="35" y="35" width="4" height="6" fill="currentColor" opacity="0.5"/>
    <rect x="41" y="35" width="4" height="6" fill="currentColor" opacity="0.5"/>
    <rect x="35" y="45" width="4" height="6" fill="currentColor" opacity="0.5"/>
    <rect x="41" y="45" width="4" height="6" fill="currentColor" opacity="0.5"/>
  </svg>
)

const DefaultIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-300">
    <circle cx="40" cy="40" r="30" fill="currentColor" opacity="0.1"/>
    <path d="M35 35h10v10H35z" fill="currentColor" opacity="0.3"/>
  </svg>
)

const illustrations = {
  cleaning: CleaningIllustration,
  calendar: CalendarIllustration,
  users: UsersIllustration,
  sites: SitesIllustration,
  default: DefaultIllustration
}

export function EmptyState({ 
  icon: Icon, 
  illustration = 'default',
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  const IllustrationComponent = illustrations[illustration]
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="mb-6">
        {Icon ? (
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-400" />
          </div>
        ) : (
          <IllustrationComponent />
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-primary hover:bg-primary/90">
          {action.label}
        </Button>
      )}
    </div>
  )
}