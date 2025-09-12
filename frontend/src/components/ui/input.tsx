import React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  success?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, success, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-muted-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors",
            // Default state
            "border-input focus:ring-primary",
            // Error state
            error && "border-destructive focus:ring-destructive",
            // Success state
            success && !error && "border-success focus:ring-success",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" />
              <path d="M10 13a1 1 0 100 2 1 1 0 000-2zM10 6v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }