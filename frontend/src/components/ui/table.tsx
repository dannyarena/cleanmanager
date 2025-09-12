import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { TableProps, TableColumn } from '../../types'

export function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  sortKey,
  sortDirection
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDirection)
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-12 text-center">
          <div className="text-muted mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-card-foreground mb-2">Nessun dato trovato</h3>
          <p className="text-muted">Non ci sono elementi da visualizzare al momento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
          <thead className="bg-popover">
            <tr>
              {columns.map((column) => {
                const key = typeof column.key === 'string' ? column.key : String(column.key)
                const isSortable = column.sortable && onSort
                const isActive = sortKey === key
                
                return (
                  <th
                    key={key}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                      'text-muted-foreground',
                      isSortable && 'cursor-pointer hover:bg-accent/5 select-none'
                    )}
                    onClick={() => isSortable && handleSort(key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {isSortable && (
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={cn(
                              'w-3 h-3 -mb-1',
                              isActive && sortDirection === 'asc' 
                                ? 'text-primary' 
                                : 'text-muted'
                            )} 
                          />
                          <ChevronDown 
                            className={cn(
                              'w-3 h-3',
                              isActive && sortDirection === 'desc' 
                                ? 'text-primary' 
                                : 'text-muted'
                            )} 
                          />
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {data.map((item, index) => (
              <tr key={item.id || index} className={cn(
                'transition-all duration-150 hover:bg-primary/10',
                index % 2 === 1 && 'bg-accent/2'
              )}>
                {columns.map((column) => {
                  const key = typeof column.key === 'string' ? column.key : String(column.key)
                  const value = key.includes('.') 
                    ? key.split('.').reduce((obj, k) => obj?.[k], item)
                    : item[key]
                  
                  return (
                    <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      {column.render ? column.render(value, item) : value || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}