import React from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Separator } from '../components/ui/separator'
import { Settings as SettingsIcon, Palette, Calendar, Clock, Bell, Save, Info, Loader2 } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useTheme } from '../contexts/ThemeContext'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' }
]

export function Settings() {
  const { settings, loading, saving, updateSettings } = useSettings()
  const { setTheme, setPrimaryColor } = useTheme()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Errore nel caricamento delle impostazioni</p>
      </div>
    )
  }

  const toggleWorkingDay = (day: number) => {
    const newWorkingDays = settings.workingDays.includes(day)
      ? settings.workingDays.filter(d => d !== day)
      : [...settings.workingDays, day].sort((a, b) => a - b)
    
    updateSettings({ workingDays: newWorkingDays })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configura le impostazioni dell'azienda e dell'applicazione
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvataggio in corso...
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Sezione Branding & UI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding & UI
            </CardTitle>
            <CardDescription>
              Personalizza l'aspetto e il branding dell'applicazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome Azienda</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => updateSettings({ companyName: e.target.value })}
                placeholder="Inserisci il nome dell'azienda"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Colore Primario</Label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => {
                    const newColor = e.target.value
                    updateSettings({ primaryColor: newColor })
                    setPrimaryColor(newColor)
                  }}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  disabled={saving}
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => {
                    const newColor = e.target.value
                    updateSettings({ primaryColor: newColor })
                    setPrimaryColor(newColor)
                  }}
                  placeholder="#2563eb"
                  className="flex-1"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark') => {
                  updateSettings({ theme: value })
                  setTheme(value)
                }}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Chiaro</SelectItem>
                  <SelectItem value="dark">Scuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sezione Calendario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario
            </CardTitle>
            <CardDescription>
              Configura i giorni lavorativi e le impostazioni del calendario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Giorni Lavorativi</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex flex-col items-center space-y-2">
                    <Label className="text-sm font-medium">{day.label}</Label>
                    <Switch
                      checked={settings.workingDays.includes(day.value)}
                      onCheckedChange={() => toggleWorkingDay(day.value)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A effetto su ricorrenze giornaliere: i giorni esclusi non vengono renderizzati.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Sezione Turni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Turni
            </CardTitle>
            <CardDescription>
              Configura i valori predefiniti per la creazione dei turni
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequenza Predefinita</Label>
                <Select
                  value={settings.recurrenceDefaultFrequency}
                  onValueChange={(value: 'daily' | 'weekly') => 
                    updateSettings({ recurrenceDefaultFrequency: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Giornaliero</SelectItem>
                    <SelectItem value="weekly">Settimanale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intervallo Predefinito</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.recurrenceDefaultInterval}
                  onChange={(e) => 
                    updateSettings({ 
                      recurrenceDefaultInterval: parseInt(e.target.value) || 1 
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sezione Notifiche */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifiche
            </CardTitle>
            <CardDescription>
              Configura le notifiche e gli avvisi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifiche Email</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ricevi notifiche via email per eventi importanti
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
                  disabled
                />
                <span className="text-xs text-gray-400">Coming Soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}