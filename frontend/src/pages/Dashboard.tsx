import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, Building2, UserCheck, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { apiService } from '../services/api'
import { Client, Site, User, Shift } from '../types'
import { formatDate } from '../lib/utils'

interface DashboardStats {
  totalClients: number
  totalSites: number
  totalOperators: number
  todayShifts: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalSites: 0,
    totalOperators: 0,
    todayShifts: 0
  })
  const [recentShifts, setRecentShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carica statistiche
      const [clients, sites, operators] = await Promise.all([
        apiService.getClients(),
        apiService.getSites(),
        apiService.getOperators()
      ])

      // Carica turni di oggi
      const today = new Date().toISOString().split('T')[0]
      const todayShifts = await apiService.getShifts({
        from: today,
        to: today
      })

      // Carica turni recenti (prossimi 7 giorni)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const upcomingShifts = await apiService.getShifts({
        from: today,
        to: nextWeek.toISOString().split('T')[0]
      })

      setStats({
        totalClients: clients.length,
        totalSites: sites.length,
        totalOperators: operators.length,
        todayShifts: todayShifts.length
      })

      setRecentShifts(upcomingShifts.slice(0, 5))
    } catch (error) {
      console.error('Errore nel caricamento dei dati dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Clienti',
      value: stats.totalClients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/clienti'
    },
    {
      title: 'Siti',
      value: stats.totalSites,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/siti'
    },
    {
      title: 'Operatori',
      value: stats.totalOperators,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/operatori'
    },
    {
      title: 'Turni Oggi',
      value: stats.todayShifts,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/calendario'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Benvenuto in CleanManager
        </h2>
        <p className="text-gray-600">
          Gestisci i tuoi turni di pulizia, clienti e operatori in modo semplice ed efficace.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prossimi Turni</CardTitle>
                <CardDescription>
                  Turni programmati per i prossimi giorni
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/calendario">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Turno
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nessun turno programmato</p>
                <Button asChild size="sm">
                  <Link to="/calendario">
                    Crea il primo turno
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{shift.title}</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(shift.date)} • {shift.sites.length} siti • {shift.operators.length} operatori
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/calendario?shift=${shift.id}`}>
                        Dettagli
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Accesso rapido alle funzioni principali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/clienti?action=create">
                  <Users className="w-4 h-4 mr-2" />
                  Aggiungi Cliente
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/siti?action=create">
                  <Building2 className="w-4 h-4 mr-2" />
                  Aggiungi Sito
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/calendario?action=create">
                  <Calendar className="w-4 h-4 mr-2" />
                  Programma Turno
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}