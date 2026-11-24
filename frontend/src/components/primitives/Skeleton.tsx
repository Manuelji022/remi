import './Skeleton.css'
import type { CSSProperties } from 'react'

type SkeletonShape = 'line' | 'block' | 'circle'
/** `surface` sits on white; `page` sits straight on the sand page. */
type SkeletonTone = 'surface' | 'page'

interface SkeletonProps {
  /** `line` is a 12 tall pill for text; `block` takes the mark radius. */
  shape?: SkeletonShape
  tone?: SkeletonTone
  /** Match the size of what is coming so nothing moves when it lands. */
  width?: CSSProperties['inlineSize']
  height?: CSSProperties['blockSize']
  className?: string
}

/**
 * A flat placeholder in the exact size of the content it stands in for.
 * Decorative: the region that loads carries `aria-busy`. Show it only after
 * 300ms and keep it at least 500ms so it never flashes.
 */
export function Skeleton({
  shape = 'line',
  tone = 'surface',
  width,
  height,
  className,
}: SkeletonProps) {
  const classes = ['skeleton', `skeleton-${shape}`, `skeleton-${tone}`]
  if (className) classes.push(className)

  return (
    <span
      aria-hidden="true"
      className={classes.join(' ')}
      style={{ inlineSize: width, blockSize: height }}
    />
  )
}
