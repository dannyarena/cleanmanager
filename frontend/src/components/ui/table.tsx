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
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun dato trovato</h3>
          <p className="text-gray-500">Non ci sono elementi da visualizzare al momento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const key = typeof column.key === 'string' ? column.key : String(column.key)
                const isSortable = column.sortable && onSort
                const isActive = sortKey === key
                
                return (
                  <th
                    key={key}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      isSortable && 'cursor-pointer hover:bg-gray-100 select-none'
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
                                : 'text-gray-400'
                            )} 
                          />
                          <ChevronDown 
                            className={cn(
                              'w-3 h-3',
                              isActive && sortDirection === 'desc' 
                                ? 'text-primary' 
                                : 'text-gray-400'
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
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                {columns.map((column) => {
                  const key = typeof column.key === 'string' ? column.key : String(column.key)
                  const value = key.includes('.') 
                    ? key.split('.').reduce((obj, k) => obj?.[k], item)
                    : item[key]
                  
                  return (
                    <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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