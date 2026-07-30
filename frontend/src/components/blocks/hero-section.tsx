import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Glow } from "@/components/ui/glow"
import { Mockup, MockupFrame } from "@/components/ui/mockup"
import { ArrowRight, ChevronRight } from "lucide-react"

export interface HeroAction {
  text: string
  href: string
  icon?: React.ReactNode
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "glow"
  target?: string
}

export interface HeroSectionProps {
  badge?: {
    text: string
    action?: {
      text: string
      href: string
    }
  }
  title: React.ReactNode
  description: string
  actions: HeroAction[]
  image?: {
    src: string
    alt: string
    width?: number
    height?: number
  }
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  badge,
  title,
  description,
  actions,
  image,
}) => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden bg-background">
      {/* Background Glow Effect */}
      <Glow variant="top" size="lg" className="opacity-30" />

      <div className="max-w-6xl mx-auto text-center relative z-10">
        {/* Badge */}
        {badge && (
          <div className="inline-flex items-center space-x-2 mb-6">
            <Badge variant="brand" className="py-1.5 px-3 text-xs sm:text-sm font-medium border border-brand/20 bg-brand/10 text-brand-foreground shadow-sm">
              <span>{badge.text}</span>
              {badge.action && (
                <a
                  href={badge.action.href}
                  className="ml-2 font-semibold text-brand hover:underline inline-flex items-center"
                >
                  <span>{badge.action.text}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </a>
              )}
            </Badge>
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15] mb-6">
          {title}
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
          {description}
        </p>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || "default"}
                size="lg"
                asChild
                className="w-full sm:w-auto font-medium px-6 py-6 text-base"
              >
                <a href={action.href} target={action.target}>
                  <span>{action.text}</span>
                  {action.icon ? action.icon : <ArrowRight className="w-4 h-4 ml-2" />}
                </a>
              </Button>
            ))}
          </div>
        )}

        {/* Hero Image / Dashboard Mockup */}
        {image && (
          <div className="relative max-w-5xl mx-auto mt-4">
            <Mockup type="browser">
              <MockupFrame>
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width || 1200}
                  height={image.height || 675}
                  loading="eager"
                  className="w-full h-auto object-cover rounded-b-lg border-t border-border/40 shadow-inner"
                />
              </MockupFrame>
            </Mockup>
          </div>
        )}
      </div>
    </section>
  )
}
