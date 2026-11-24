import './Dots.css'

interface DotsProps {
  className?: string
}

/**
 * Three dots in the surrounding text color; a wave of opacity runs through
 * them. Decorative: put it after a short label ("Syncing") that carries the
 * meaning, and mark the region `aria-busy` or use a single status message.
 * Never as a full-page spinner.
 */
export function Dots({ className }: DotsProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `dots ${className}` : 'dots'}
    >
      <span />
      <span />
      <span />
    </span>
  )
}
