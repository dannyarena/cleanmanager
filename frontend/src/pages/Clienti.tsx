import React, { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Table } from '../components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/dialog'
import { NewClientModal } from '../components/clients/NewClientModal'
import { apiService } from '../services/api'
import { Client, TableColumn, SearchFilters } from '../types'
import { debounce, formatDate } from '../lib/utils'

export function Clienti() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null })
  const [deleting, setDeleting] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    const debouncedSearch = debounce(() => {
      loadClients({ q: searchQuery })
    }, 300)

    debouncedSearch()
  }, [searchQuery])

  const loadClients = async (filters?: SearchFilters) => {
    try {
      setLoading(true)
      const data = await apiService.getClients(filters)
      setClients(data)
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key)
    setSortDirection(direction)
    
    const sortedClients = [...clients].sort((a, b) => {
      const aValue = key.includes('.') 
        ? key.split('.').reduce((obj, k) => obj?.[k], a)
        : a[key as keyof Client]
      const bValue = key.includes('.') 
        ? key.split('.').reduce((obj, k) => obj?.[k], b)
        : b[key as keyof Client]
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
    
    setClients(sortedClients)
  }

  const handleDelete = async () => {
    if (!deleteDialog.client) return
    
    try {
      setDeleting(true)
      await apiService.deleteClient(deleteDialog.client.id)
      setClients(clients.filter(client => client.id !== deleteDialog.client!.id))
      setDeleteDialog({ open: false, client: null })
    } catch (error) {
      console.error('Errore nell\'eliminazione del cliente:', error)
    } finally {
      setDeleting(false)
    }
  }

  const columns: TableColumn<Client>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (value, client) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {client.email && (
            <div className="text-sm text-gray-500">{client.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Telefono',
      render: (value) => value || '-'
    },
    {
      key: 'address',
      label: 'Indirizzo',
      render: (value) => value || '-'
    },
    {
      key: '_count.sites',
      label: 'Siti',
      render: (value, client) => (
        <div className="flex items-center space-x-1">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span>{client._count?.sites || 0}</span>
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Creato',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Azioni',
      render: (_, client) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingClient(client)}
            title="Modifica cliente"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, client })}
            className="text-red-600 hover:text-red-700"
            title="Elimina cliente"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="text-gray-600">Gestisci i tuoi clienti aziendali</p>
        </div>
        <Button onClick={() => setShowNewClientModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Cliente
        </Button>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cerca clienti per nome, email o telefono..."
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
          {clients.length === 0 
            ? 'Nessun cliente trovato'
            : `${clients.length} cliente${clients.length !== 1 ? 'i' : ''} trovato${clients.length !== 1 ? 'i' : ''}`
          }
        </div>
      )}

      {/* Table */}
      {!loading && clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nessun cliente trovato"
          description={searchQuery ? "Nessun cliente corrisponde ai criteri di ricerca." : "Non hai ancora aggiunto nessun cliente. Inizia creando il primo cliente."}
          action={!searchQuery ? {
            label: "Aggiungi Cliente",
            onClick: () => console.log('Aggiungi cliente')
          } : undefined}
        />
      ) : (
        <Table
          data={clients}
          columns={columns}
          loading={loading}
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDirection}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, client: null })}
        title="Elimina Cliente"
        description={`Sei sicuro di voler eliminare il cliente "${deleteDialog.client?.name}"? Questa azione non può essere annullata.`}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* New client modal */}
      <NewClientModal
        open={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreated={(client) => setClients(prev => [client, ...prev])}
      />

      {/* Edit client modal (reuses NewClientModal) */}
      <NewClientModal
        open={!!editingClient}
        client={editingClient}
        onClose={() => setEditingClient(null)}
        onUpdated={(updated) => setClients(prev => prev.map(c => c.id === updated.id ? updated : c))}
      />
    </div>
  )
}