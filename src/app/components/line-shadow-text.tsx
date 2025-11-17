import type React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

// Avoid combining deep MotionProps with React HTML attributes (can cause excessive type instantiation).
interface LineShadowTextProps extends React.HTMLAttributes<HTMLElement> {
  shadowColor?: string
  as?: React.ElementType
}

export function LineShadowText({
  children,
  shadowColor = "black",
  className,
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  // Use `any` to avoid deep type instantiation from framer-motion's MotionComponent typing
  const MotionComponent: any = (motion as any)[Component as keyof typeof motion] || (motion as any).span
  const content = typeof children === "string" ? children : null

  if (!content) {
    throw new Error("LineShadowText only accepts string content")
  }

  return (
    <MotionComponent
      style={{ "--shadow-color": shadowColor } as React.CSSProperties}
      className={cn(
        "relative z-0 inline-flex",
        "after:absolute after:left-[0.04em] after:top-[0.04em] after:content-[attr(data-text)]",
        "after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]",
        "after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent",
        "after:animate-line-shadow",
        className,
      )}
      data-text={content}
      {...props}
    >
      {content}
    </MotionComponent>
  )
}

