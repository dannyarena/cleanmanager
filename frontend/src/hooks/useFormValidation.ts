import { useState, useCallback } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface FormErrors {
  [key: string]: string
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: ValidationRules
) {
  const [data, setData] = useState<T>(initialData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((name: string, value: any): string | null => {
    const rule = rules[name]
    if (!rule) return null

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'Campo obbligatorio'
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null
    }

    // String validations
    if (typeof value === 'string') {
      // Min length
      if (rule.minLength && value.length < rule.minLength) {
        return `Minimo ${rule.minLength} caratteri`
      }

      // Max length
      if (rule.maxLength && value.length > rule.maxLength) {
        return `Massimo ${rule.maxLength} caratteri`
      }

      // Email validation
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Email non valida'
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return 'Formato non valido'
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }, [rules])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName])
      if (error) {
        newErrors[fieldName] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [data, rules, validateField])

  const handleChange = useCallback((name: string, value: any) => {
    setData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }, [errors])

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field on blur
    const error = validateField(name, data[name])
    setErrors(prev => ({ ...prev, [name]: error || '' }))
  }, [data, validateField])

  const reset = useCallback(() => {
    setData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    validateField,
    reset,
    setFieldError,
    clearErrors,
    isValid: Object.keys(errors).length === 0,
    hasErrors: Object.values(errors).some(error => error !== '')
  }
}

// Hook per gestire errori API
export function useApiError() {
  const [apiError, setApiError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): Promise<T | null> => {
    setIsLoading(true)
    setApiError('')

    try {
      const result = await apiCall()
      onSuccess?.(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
      setApiError(errorMessage)
      onError?.(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearApiError = useCallback(() => {
    setApiError('')
  }, [])

  return {
    apiError,
    isLoading,
    handleApiCall,
    clearApiError
  }
}