import './Divider.css'

interface DividerProps {
  /** `vertical` sits between inline groups. It is 32 tall and centred, and
   *  the 16 on each side comes from the parent's gap. */
  orientation?: 'horizontal' | 'vertical'
  /** Horizontal only. Starts at the label of a row with a leading icon
   *  (icon 20 + gap 12 = 32), so the icons read as one column. */
  inset?: boolean
  /** Horizontal only. A caption centred between two lines: "or", "Past days". */
  label?: string
  /** Only inside a menu, between choices and actions. It renders a real
   *  separator that screen readers announce. Everywhere else the line is
   *  decoration and stays silent. */
  semantic?: boolean
  className?: string
}

/** A 1px hairline. Between rows that repeat, never above the first or below
 *  the last. Groups are separated by space and a heading, not by a line. */
export function Divider({
  orientation = 'horizontal',
  inset = false,
  label,
  semantic = false,
  className,
}: DividerProps) {
  const classes = [
    'divider',
    `divider-${orientation}`,
    inset && 'divider-inset',
    label && 'divider-labelled',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (label && orientation === 'horizontal') {
    return (
      <div className={classes} role={semantic ? 'separator' : undefined}>
        <span aria-hidden="true" className="divider-line" />
        <span className="divider-label">{label}</span>
        <span aria-hidden="true" className="divider-line" />
      </div>
    )
  }

  if (semantic) {
    return orientation === 'horizontal' ? (
      <hr className={classes} />
    ) : (
      <div aria-orientation="vertical" className={classes} role="separator" />
    )
  }

  return <div aria-hidden="true" className={classes} />
}
