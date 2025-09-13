import React from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Separator } from '../components/ui/separator'
import { Settings as SettingsIcon, Palette, Calendar, Bell, Save, Info, Loader2 } from 'lucide-react'
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

const PRESET_COLORS = ['#2563EB','#7C3AED','#059669','#EA580C','#DC2626','#0EA5E9','#A855F7','#10B981']

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
          <p className="text-muted">
            Configura le impostazioni dell'azienda e dell'applicazione
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-primary">
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
              <Label>Colore Primario</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    aria-label={`colore ${c}`}
                    onClick={() => updateSettings({ primaryColor: c })}
                    className={`h-8 w-8 rounded-full border transition ${
                      settings.primaryColor === c ? 'ring-2 ring-primary scale-105' : 'hover:opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                    type="button"
                    disabled={saving}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark') => setTheme(value)}
                disabled={loading || saving}
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
                  Effetto su ricorrenze giornaliere: i giorni esclusi non vengono renderizzati.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Turni defaults removed per request */}

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
                <p className="text-sm text-muted">
                  Ricevi notifiche via email per eventi importanti
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
                  disabled
                />
                <span className="text-xs text-muted">Coming Soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}