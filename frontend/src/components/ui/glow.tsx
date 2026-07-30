import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const glowVariants = cva("absolute pointer-events-none blur-3xl opacity-40 transition-all", {
  variants: {
    variant: {
      default: "bg-brand",
      center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand",
      top: "top-0 left-1/2 -translate-x-1/2 bg-brand",
      bottom: "bottom-0 left-1/2 -translate-x-1/2 bg-brand-foreground",
    },
    size: {
      sm: "w-48 h-48",
      md: "w-96 h-96",
      lg: "w-[600px] h-[350px]",
    },
  },
  defaultVariants: {
    variant: "center",
    size: "lg",
  },
})

export interface GlowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glowVariants> {}

export const Glow = React.forwardRef<HTMLDivElement, GlowProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glowVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Glow.displayName = "Glow"
