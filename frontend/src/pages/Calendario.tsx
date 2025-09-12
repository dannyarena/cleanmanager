import React, { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Calendar, Plus, ChevronLeft, ChevronRight, Users, MapPin, Info } from 'lucide-react'
import { apiService } from '../services/api'
import { Shift, Site, User } from '../types'
import { NewShiftModal } from '../components/shifts/NewShiftModal'
import { ShiftDetailModal } from '../components/shifts/ShiftDetailModal'
import { useSettings } from '../contexts/SettingsContext'

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  shifts: Shift[]
}

export function Calendario() {
  const { settings } = useSettings()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [operators, setOperators] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewShiftModal, setShowNewShiftModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Genera i giorni della settimana corrente
  const getWeekDays = (date: Date): CalendarDay[] => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lunedì come primo giorno
    startOfWeek.setDate(diff)

    const days: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek)
      currentDate.setDate(startOfWeek.getDate() + i)
      
      const dayShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        return shiftDate.toDateString() === currentDate.toDateString()
      })

      days.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === date.getMonth(),
        shifts: dayShifts
      })
    }
    return days
  }

  const weekDays = getWeekDays(currentWeek)
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  // Navigazione settimana
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  // Carica dati
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Calcola range della settimana per le API
      const startOfWeek = new Date(weekDays[0].date)
      const endOfWeek = new Date(weekDays[6].date)
      endOfWeek.setHours(23, 59, 59, 999)

      const [shiftsData, sitesData, operatorsData] = await Promise.all([
        apiService.getShifts({
          from: startOfWeek.toISOString(),
          to: endOfWeek.toISOString()
        }),
        apiService.getSites(),
        apiService.getOperators()
      ])

      setShifts(shiftsData)
      setSites(sitesData)
      setOperators(operatorsData)
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentWeek])

  // Apri modale se arrivo con ?action=create
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'create') {
      setShowNewShiftModal(true)
    }
  }, [])

  // Gestori eventi
  const handleNewShift = (date?: Date) => {
    setSelectedDate(date || null)
    setShowNewShiftModal(true)
  }

  const handleShiftClick = (shift: Shift) => {
    // Per le occorrenze di turni ricorrenti, aggiungi suffisso _YYYY-MM-DD all'ID solo se non è già presente
    if (shift.recurrence) {
      const occurrenceDate = new Date(shift.date).toISOString().split('T')[0]
      // Controlla se l'ID contiene già una data (formato: masterId_YYYY-MM-DD)
      const hasDateSuffix = shift.id.includes('_') && /\d{4}-\d{2}-\d{2}$/.test(shift.id)
      
      const shiftWithOccurrenceId = {
        ...shift,
        id: hasDateSuffix ? shift.id : `${shift.id}_${occurrenceDate}`
      }
      setSelectedShift(shiftWithOccurrenceId)
    } else {
      setSelectedShift(shift)
    }
    setShowDetailModal(true)
  }

  const handleShiftCreated = () => {
    setShowNewShiftModal(false)
    loadData()
  }

  const handleShiftUpdated = () => {
    setShowDetailModal(false)
    loadData()
  }

  const handleShiftDeleted = () => {
    setShowDetailModal(false)
    loadData()
  }

  // Formattazione date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short'
    })
  }

  const formatWeekRange = () => {
    const start = weekDays[0].date
    const end = weekDays[6].date
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  // Formatta giorni lavorativi per il badge
  const formatWorkingDays = () => {
    if (!settings?.workingDays || settings.workingDays.length === 0) {
      return 'Nessun giorno lavorativo'
    }
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const workingDayNames = settings.workingDays
      .sort((a, b) => a - b)
      .map(day => dayNames[day])
    
    if (workingDayNames.length === 7) {
      return 'Tutti i giorni'
    }
    
    return workingDayNames.join(', ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Calendario Turni</h1>
            {settings && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                Giorni lavorativi: {formatWorkingDays()}
              </Badge>
            )}
          </div>
          <p className="text-gray-600">{formatWeekRange()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Oggi
          </Button>
          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleNewShift()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Turno
          </Button>
        </div>
      </div>

      {/* Calendario settimanale */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {dayNames.map((dayName, index) => (
              <div key={dayName} className="p-4 text-center font-medium text-gray-700 border-r last:border-r-0">
                {dayName}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 min-h-[500px]">
            {weekDays.map((day, index) => (
              <div key={day.date.toISOString()} className="border-r last:border-r-0 p-2">
                {/* Header giorno */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    day.date.toDateString() === new Date().toDateString()
                      ? 'text-primary font-bold'
                      : day.isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={() => handleNewShift(day.date)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Turni del giorno */}
                <div className="space-y-1">
                  {day.shifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onClick={() => handleShiftClick(shift)}
                    />
                  ))}
                </div>

                {/* Stato vuoto */}
                {day.shifts.length === 0 && (
                  <div 
                    className="h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                    onClick={() => handleNewShift(day.date)}
                  >
                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modali */}
      <NewShiftModal
        open={showNewShiftModal}
        onClose={() => setShowNewShiftModal(false)}
        onShiftCreated={handleShiftCreated}
        sites={sites}
        operators={operators}
        selectedDate={selectedDate}
      />

      <ShiftDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        shift={selectedShift}
        sites={sites}
        operators={operators}
        onShiftUpdated={handleShiftUpdated}
        onShiftDeleted={handleShiftDeleted}
      />
    </div>
  )
}

// Componente Card Turno
interface ShiftCardProps {
  shift: Shift
  onClick: () => void
}

function ShiftCard({ shift, onClick }: ShiftCardProps) {
  return (
    <div
      className="bg-primary/10 border border-primary/20 rounded-lg p-2 cursor-pointer hover:bg-primary/20 transition-colors"
      onClick={onClick}
    >
      <div className="text-xs font-medium text-primary mb-1 truncate">
        {shift.title}
      </div>
      
      <div className="flex items-center gap-1 text-xs text-primary/90">
        <MapPin className="w-3 h-3" />
        <span>{shift.sites.length}</span>
        
        <Users className="w-3 h-3 ml-1" />
        <span>{shift.operators.length}</span>
      </div>
      
      {shift.operators.length > 0 && (
        <div className="mt-1 text-xs text-primary truncate">
          {shift.operators.slice(0, 2).map(op => `${op.firstName} ${op.lastName}`).join(', ')}
          {shift.operators.length > 2 && ` +${shift.operators.length - 2}`}
        </div>
      )}
      
      {shift.recurrence && (
        <Badge variant="secondary" className="mt-1 text-xs">
          {shift.recurrence.frequency === 'daily' ? 'Giornaliero' : 'Settimanale'}
        </Badge>
      )}
    </div>
  )
}