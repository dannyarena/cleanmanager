import React, { useEffect, useState } from 'react'
import { Search, UserCheck, Crown, Mail, Phone, Users } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Table } from '../components/ui/table'
import { Card, CardContent } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { apiService } from '../services/api'
import { User, TableColumn, SearchFilters } from '../types'
import { debounce, formatDate } from '../lib/utils'

export function Operatori() {
  const [operators, setOperators] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string>('firstName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadOperators()
  }, [])

  useEffect(() => {
    const debouncedSearch = debounce(() => {
      loadOperators({ q: searchQuery })
    }, 300)

    debouncedSearch()
  }, [searchQuery])

  const loadOperators = async (filters?: SearchFilters) => {
    try {
      setLoading(true)
      const data = await apiService.getOperators(filters)
      setOperators(data)
    } catch (error) {
      console.error('Errore nel caricamento operatori:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key)
    setSortDirection(direction)
    
    const sortedOperators = [...operators].sort((a, b) => {
      const aValue = key.includes('.') 
        ? key.split('.').reduce((obj, k) => obj?.[k], a)
        : a[key as keyof User]
      const bValue = key.includes('.') 
        ? key.split('.').reduce((obj, k) => obj?.[k], b)
        : b[key as keyof User]
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
    
    setOperators(sortedOperators)
  }

  const columns: TableColumn<User>[] = [
    {
      key: 'firstName',
      label: 'Operatore',
      sortable: true,
      render: (_, operator) => {
        const displayName = `${operator.firstName || ''} ${operator.lastName || ''}`.trim()
        const initial = (operator.firstName || operator.lastName || 'U').charAt(0).toUpperCase()
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">{initial}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{displayName || operator.email}</span>
                    {operator.role === 'admin' && (
                      <Crown className="w-4 h-4 text-yellow-500" title="Amministratore" />
                    )}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Mail className="w-3 h-3 mr-1" />
                {operator.email}
              </div>
            </div>
          </div>
        )
      }
    },
    {
    key: 'role',
    label: 'Ruolo',
    sortable: true,
    render: (value, operator) => (
      <div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'admin'
            ? 'bg-yellow-100 text-yellow-800'
            : operator.isManager
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {value === 'admin' ? 'Amministratore' : 
           operator.isManager ? 'Manager' : 'Operatore'}
        </span>
      </div>
    )
    },
    {
      key: 'createdAt',
      label: 'Registrato',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'status',
      label: 'Stato',
      render: () => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Attivo
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operatori</h1>
          <p className="text-gray-600">Gestisci il team di operatori</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totale Operatori</p>
                <p className="text-2xl font-bold text-gray-900">
                  {operators.filter(op => op.role === 'operatore').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Manager</p>
                <p className="text-2xl font-bold text-gray-900">
                  {operators.filter(op => op.isManager).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Amministratori</p>
                <p className="text-2xl font-bold text-gray-900">
                  {operators.filter(op => op.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cerca operatori per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {operators.length === 0
            ? 'Nessun operatore ancora'
            : operators.length === 1
              ? '1 operatore trovato'
              : `${operators.length} operatori trovati`
          }
        </div>
      )}

      {/* Table */}
      {!loading && operators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun operatore trovato"
          description={searchQuery ? "Nessun operatore corrisponde ai criteri di ricerca." : "Non ci sono operatori nel sistema."}
        />
      ) : (
        <Table
          data={operators}
          columns={columns}
          loading={loading}
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDirection}
        />
      )}
    </div>
  )
}