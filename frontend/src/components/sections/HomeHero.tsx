import React from "react"
import { HeroSection } from "@/components/blocks/hero-section"
import { ArrowRight, BookOpen } from "lucide-react"

export const HomeHero: React.FC = () => {
  return (
    <HeroSection
      badge={{
        text: "Validated with University Psychology Department",
        action: {
          text: "Our validation process",
          href: "#validation",
        },
      }}
      title={
        <>
          Understand what your <br className="hidden sm:inline" />
          <span className="text-brand">words reveal</span>
        </>
      }
      description="AI-powered sentiment and psychological insight analysis, built on RoBERTa and NRC emotion lexicons — with results reviewed by real psychology researchers."
      actions={[
        {
          text: "Try the Dashboard",
          href: "/dashboard",
          variant: "glow",
          icon: <ArrowRight className="w-4 h-4 ml-2" />,
        },
        {
          text: "How it works",
          href: "#how-it-works",
          variant: "outline",
          icon: <BookOpen className="w-4 h-4 ml-2" />,
        },
      ]}

    />
  )
}
