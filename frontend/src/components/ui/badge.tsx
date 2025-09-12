import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        info:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        admin:
          "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200",
        manager:
          "border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
        operator:
          "border-transparent bg-accent/3 text-muted-foreground hover:bg-accent/4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  // Only treat solid-colored variants as colored (they need white text on top)
  // Light tints (bg-*/10, 100, etc.) should NOT force white text.
  const solidColoredVariants = new Set(['default', 'destructive'])
  const isColored = solidColoredVariants.has(variant || 'default')

  return (
    <div data-colored={isColored ? 'true' : undefined} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }