import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, MapPin, CheckSquare } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Table } from '../components/ui/table'
import { Card, CardContent } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { ConfirmDialog } from '../components/ui/dialog'
import { apiService } from '../services/api'
import { Site, Client, TableColumn, SearchFilters } from '../types'
import SiteModal from '../components/sites/SiteModal'
import ChecklistModal from '../components/sites/ChecklistModal'
import { debounce, formatDate } from '../lib/utils'

export function Siti() {
  const [sites, setSites] = useState<Site[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; site: Site | null }>({ open: false, site: null })
  const [deleting, setDeleting] = useState(false)
  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [checklistSiteId, setChecklistSiteId] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const debouncedSearch = debounce(() => {
      loadSites({ 
        q: searchQuery,
        clientId: selectedClientId || undefined
      })
    }, 300)

    debouncedSearch()
  }, [searchQuery, selectedClientId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [sitesDataRaw, clientsData] = await Promise.all([
        apiService.getSites() as any,
        apiService.getClients()
      ])

      // Backend may return either an array or a paginated object { data: Site[] }
      const normalizedSites = Array.isArray(sitesDataRaw) ? sitesDataRaw : (sitesDataRaw?.data ?? [])
      setSites(normalizedSites)
      setClients(clientsData)
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSites = async (filters?: SearchFilters) => {
    try {
      setLoading(true)
  const dataRaw: any = await apiService.getSites(filters)
  const normalized = Array.isArray(dataRaw) ? dataRaw : (dataRaw?.data ?? [])
  setSites(normalized)
    } catch (error) {
      console.error('Errore nel caricamento siti:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key)
    setSortDirection(direction)
    const getValue = (obj: any, keyStr: string) => {
      if (keyStr.includes('.')) return keyStr.split('.').reduce((o: any, k: string) => (o ?? {})[k], obj as any)
      return (obj as any)[keyStr]
    }

    const sortedSites = [...sites].sort((a, b) => {
      const aRaw = getValue(a, key)
      const bRaw = getValue(b, key)
      const aValue = aRaw ?? ''
      const bValue = bRaw ?? ''

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })

    setSites(sortedSites)
  }

  const handleDelete = async () => {
    if (!deleteDialog.site) return
    
    try {
      setDeleting(true)
      await apiService.deleteSite(deleteDialog.site.id)
      setSites(sites.filter(s => s.id !== deleteDialog.site!.id))
      setDeleteDialog({ open: false, site: null })
    } catch (error) {
      console.error('Errore nell\'eliminazione del sito:', error)
      alert('Errore nell\'eliminazione del sito')
    } finally {
      setDeleting(false)
    }
  }

  const columns: TableColumn<Site>[] = [
    {
      key: 'name',
      label: 'Nome Sito',
      sortable: true,
      render: (value, site) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            {site.address}
          </div>
        </div>
      )
    },
    {
      key: 'client.name',
      label: 'Cliente',
      sortable: true,
      render: (_, site) => (
        <div>
          <div className="font-medium text-gray-900">{site.client?.name || '-'}</div>
          {site.client?.email && (
            <div className="text-sm text-gray-500">{site.client.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'checklist',
      label: 'Checklist',
      render: (_, site) => (
        <div className="flex items-center space-x-1">
          <CheckSquare className="w-4 h-4 text-gray-400" />
          {/* backend includes either checklists array or _count.checklists */}
          <span>{(site.checklists?.length ?? site._count?.checklists ?? 0)} voci</span>
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
      render: (_, site) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setChecklistSiteId(site.id); setChecklistOpen(true) }}
            title="Gestisci checklist"
          >
            <CheckSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingSite(site); setSiteModalOpen(true); }}
            title="Modifica sito"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, site })}
            className="text-red-600 hover:text-red-700"
            title="Elimina sito"
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
          <h1 className="text-2xl font-bold text-gray-900">Siti</h1>
          <p className="text-gray-600">Gestisci i siti dei tuoi clienti</p>
        </div>
  <Button onClick={() => setSiteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Sito
        </Button>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cerca siti per nome o indirizzo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-64">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Tutti i clienti</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {sites.length === 0
            ? 'Nessun sito ancora'
            : sites.length === 1
              ? '1 sito trovato'
              : `${sites.length} siti trovati`
          }
        </div>
      )}

      {/* Table */}
      {!loading && sites.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nessun sito trovato"
          description={searchQuery || selectedClientId ? "Nessun sito corrisponde ai criteri di ricerca." : "Non hai ancora aggiunto nessun sito. Inizia creando il primo sito."}
          action={!searchQuery && !selectedClientId ? {
            label: "Aggiungi Sito",
            onClick: () => console.log('Aggiungi sito')
          } : undefined}
        />
      ) : (
        <Table
          data={sites}
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
        onOpenChange={(open) => setDeleteDialog({ open, site: null })}
        title="Elimina Sito"
        description={`Sei sicuro di voler eliminare il sito "${deleteDialog.site?.name}"? Questa azione non può essere annullata.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
      <SiteModal
        open={siteModalOpen}
        onClose={() => { setSiteModalOpen(false); setEditingSite(null); }}
        site={editingSite}
        onCreated={(created) => setSites(prev => [created, ...prev])}
        onUpdated={(updated) => setSites(prev => prev.map(s => s.id === updated.id ? updated : s))}
      />
      {checklistSiteId && (
        <ChecklistModal
          open={checklistOpen}
          onClose={() => { setChecklistOpen(false); setChecklistSiteId(null) }}
          siteId={checklistSiteId}
          onSaved={(items) => {
            // update site checklist count in table
            setSites(prev => prev.map(s => s.id === checklistSiteId ? { ...s, checklist: items } : s))
            setChecklistOpen(false)
            setChecklistSiteId(null)
          }}
        />
      )}
    </div>
  )
}