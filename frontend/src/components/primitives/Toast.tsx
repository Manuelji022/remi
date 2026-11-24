import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import './Toast.css'
import type { ReactNode } from 'react'

/** Mirror of --duration-toast (3000ms) and --duration-toast-action (5000ms).
 *  JS needs numbers, and the tokens file only holds the CSS side. */
export const TOAST_DURATION_MS = 3000
export const TOAST_ACTION_DURATION_MS = 5000
/** Mirror of --duration-base, the length of the exit fade. */
const EXIT_MS = 200

export interface ToastOptions {
  /** Past tense, two to five words, full stop: "Week locked." */
  message: string
  /** Adds the status disc. Neutral (no disc) is the default. */
  tone?: 'success' | 'error'
  /** One action at most, a single verb. Gives the toast 5 s instead of 3. */
  action?: { label: string; onAction: () => void }
  /** A newer toast with the same id replaces the queued one. */
  id?: string
}

interface QueuedToast extends ToastOptions {
  key: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(
  null,
)

/** `const toast = useToast()`, then `toast({ message: 'Week locked.' })`. */
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast needs a <ToastProvider> above it.')
  return toast
}

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** Mount once in the root layout. Shows one toast at a time, the rest queue. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedToast[]>([])
  const nextKey = useRef(0)
  const current = queue.at(0)

  const toast = useCallback((options: ToastOptions) => {
    const item = { ...options, key: nextKey.current++ }
    setQueue((previous) => [
      ...previous.filter(
        (queued, index) =>
          index === 0 || !options.id || queued.id !== options.id,
      ),
      item,
    ])
  }, [])
  const handleExit = useCallback(
    (key: number) =>
      setQueue((previous) =>
        previous[0]?.key === key ? previous.slice(1) : previous,
      ),
    [],
  )

  return (
    <ToastContext value={toast}>
      {children}
      {/* Always in the DOM so screen readers register it before any text. */}
      <div className="toast-region" role="status">
        {current && (
          <ToastView key={current.key} item={current} onExit={handleExit} />
        )}
      </div>
    </ToastContext>
  )
}

function ToastView({
  item,
  onExit,
}: {
  item: QueuedToast
  onExit: (key: number) => void
}) {
  const { key, message, tone, action } = item
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const tabHidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  )
  const paused = hovered || focused || tabHidden
  const duration = action ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS

  // The clock stops while paused and restarts in full on release.
  useEffect(() => {
    if (paused || leaving) return
    const timer = setTimeout(() => setLeaving(true), duration)
    return () => clearTimeout(timer)
  }, [paused, leaving, duration])

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => onExit(key), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving, key, onExit])

  return (
    <div
      className="toast"
      data-leaving={leaving || undefined}
      data-tone={tone}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      {tone && (
        <span aria-hidden="true" className="toast-disc">
          <Icon name={tone === 'success' ? 'done' : 'error'} size="sm" />
        </span>
      )}
      <span className="toast-message">{message}</span>
      {action && (
        <Button
          className="toast-action"
          variant="ghost"
          onClick={() => {
            action.onAction()
            setLeaving(true)
          }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
