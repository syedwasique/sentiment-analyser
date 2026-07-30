import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const mockupVariants = cva(
  "relative rounded-xl border border-border/80 bg-background shadow-2xl overflow-hidden",
  {
    variants: {
      type: {
        browser: "pt-10",
        window: "pt-8",
        mobile: "rounded-3xl p-3 border-2",
        plain: "",
      },
    },
    defaultVariants: {
      type: "browser",
    },
  }
)

export interface MockupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mockupVariants> {}

export const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
  ({ className, type, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(mockupVariants({ type, className }))}
        {...props}
      >
        {type === "browser" && (
          <div className="absolute top-0 left-0 right-0 h-10 bg-muted/60 border-b border-border/60 px-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
            </div>
            <div className="px-3 py-1 rounded-md bg-background/80 text-[11px] font-mono text-muted-foreground border border-border/40 w-1/2 text-center truncate">
              mindpulse.app/dashboard
            </div>
            <div className="w-12" />
          </div>
        )}
        {children}
      </div>
    )
  }
)
Mockup.displayName = "Mockup"

export const MockupFrame: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-lg bg-card", className)}
      {...props}
    >
      {children}
    </div>
  )
}
