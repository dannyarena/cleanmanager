import React, { useState, useRef, useEffect } from 'react'
import { Check, X, Search, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from './badge'
import { Input } from './input'

interface Option {
  value: string
  label: string
  color?: string
}

interface MultiSelectProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  maxDisplay?: number
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleziona opzioni...',
  searchPlaceholder = 'Cerca...',
  className,
  disabled = false,
  maxDisplay = 3
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOptions = options.filter(option => value.includes(option.value))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleToggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemoveOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }

  const displayedOptions = selectedOptions.slice(0, maxDisplay)
  const remainingCount = selectedOptions.length - maxDisplay

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {displayedOptions.map(option => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className={cn(
                    'text-xs px-2 py-1 gap-1',
                    option.color && `bg-${option.color}-100 text-${option.color}-800 border-${option.color}-200`
                  )}
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      onClick={(e) => handleRemoveOption(option.value, e)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingCount}
                </Badge>
              )}
            </>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 ml-auto transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Nessuna opzione trovata
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent',
                      isSelected && 'bg-accent'
                    )}
                    onClick={() => handleToggleOption(option.value)}
                  >
                    <div className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                    )}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="flex-1">{option.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}