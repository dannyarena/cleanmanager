import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { authService } from '../services/auth'
import { LoginRequest } from '../types'

export function Login() {
  const location = useLocation()
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Partial<LoginRequest>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Se già autenticato, reindirizza alla dashboard
  if (authService.isAuthenticated()) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginRequest> = {}

    if (!formData.email) {
      newErrors.email = 'Email richiesta'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }

    if (!formData.password) {
      newErrors.password = 'Password richiesta'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password deve essere di almeno 6 caratteri'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await authService.login(formData)
      const from = location.state?.from?.pathname || '/'
      window.location.href = from
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Errore durante il login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Rimuovi l'errore quando l'utente inizia a digitare
    if (errors[name as keyof LoginRequest]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">CleanManager</h1>
          <p className="text-muted">Sistema di gestione turni di pulizia</p>
        </div>

        {/* Login form */}
        <Card>
          <CardHeader>
            <CardTitle>Accedi al tuo account</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="mario.rossi@esempio.it"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Login error */}
              {loginError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {loginError}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-primary mb-2">Credenziali demo:</h3>
            <div className="text-sm text-primary/90 space-y-1">
              <p><strong>Admin:</strong> admin@cleanmanager.demo / password123</p>
              <p><strong>Manager:</strong> manager@cleanmanager.demo / password123</p>
              <p><strong>Operatore:</strong> operatore@cleanmanager.demo / password123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}