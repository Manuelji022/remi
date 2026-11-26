import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import './intro.css'

interface IntroLayoutProps {
  eyebrow: string
  title: string
  copy: ReactNode
  notes: ReactNode
  children: ReactNode
}

/** Welcome and done: the notes over a sheet on phone, beside it on desktop. */
export function IntroLayout({
  eyebrow,
  title,
  copy,
  notes,
  children,
}: IntroLayoutProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  // The button that led here is gone: start the new screen at its title.
  useEffect(() => titleRef.current?.focus({ preventScroll: true }), [])

  return (
    <div className="onboarding-card intro">
      {notes}
      <div className="intro-sheet">
        <div className="intro-head">
          <p className="intro-eyebrow">{eyebrow}</p>
          <h1 ref={titleRef} tabIndex={-1}>
            {title}
          </h1>
          <p className="intro-copy">{copy}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
