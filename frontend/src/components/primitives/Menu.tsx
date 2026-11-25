import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Divider } from './Divider'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './Menu.css'
import type {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
  SyntheticEvent,
} from 'react'

/** Gap between trigger and menu, and the margin kept from the viewport. */
const GAP = 8
const EDGE = 16
const MAX_HEIGHT = 320

/** Spread these on the trigger (a `Button`). The menu wires the rest. */
export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  id: string
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string
  popoverTarget: string
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

export interface MenuProps {
  /** Renders the trigger. Spread the props on a `Button`. */
  trigger: (props: MenuTriggerProps) => ReactNode
  /** Names the menu for assistive tech when there is no `header`. */
  label?: string
  /** Names what the menu acts on ("Thursday dinner"), never a second title.
   *  Not focusable. It also names the menu. */
  header?: string
  /** Account menu: who is signed in. Replaces `header`, then a divider. */
  identity?: { name: string; detail?: string }
  /** 280 wide, for account and swap menus. Otherwise it hugs its labels. */
  wide?: boolean
  children: ReactNode
}

interface MenuItemProps {
  children: ReactNode
  onSelect?: () => void
  icon?: IconName
  /** `danger` is always last, after a divider. `brand` is the one footer
   *  action that leaves the list ("Let Remi choose another"). */
  tone?: 'default' | 'danger' | 'brand'
  /** Makes it a choice and draws the check. Without `role` it is a radio. */
  checked?: boolean
  role?: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox'
  /** Still reached by the arrows, never activates. */
  disabled?: boolean
}

function items(menu: HTMLElement | null) {
  return menu
    ? Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
    : []
}

/** Anchored popover with actions or choices. Paper: Design System / Menu.
 *  Native popover for the top layer, Esc and outside click; the position is
 *  computed here because CSS anchor positioning is not baseline yet. */
export function Menu({
  trigger,
  label,
  header,
  identity,
  wide,
  children,
}: MenuProps) {
  const id = useId()
  const headerId = `${id}-header`
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const start = useRef<'first' | 'last'>('first')
  const typed = useRef({ text: '', timer: 0 })
  const [open, setOpen] = useState(false)

  // Place before paint and focus a row, then follow the trigger while the
  // page stays live (no scroll lock).
  useLayoutEffect(() => {
    const menu = menuRef.current
    const anchor = triggerRef.current
    if (!open || !menu || !anchor) return
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const { clientWidth: vw, clientHeight: vh } = document.documentElement
      const height = menu.scrollHeight
      const below = vh - rect.bottom - GAP - EDGE
      const above = rect.top - GAP - EDGE
      // Flip above only when it does not fit below and there is more room.
      const flip = height > below && above > below
      const max = Math.max(0, Math.min(MAX_HEIGHT, flip ? above : below))
      // Ends aligned, kept 16 from the viewport edges.
      const left = Math.min(
        Math.max(rect.right - menu.offsetWidth, EDGE),
        Math.max(vw - menu.offsetWidth - EDGE, EDGE),
      )
      menu.style.maxBlockSize = `${max}px`
      menu.style.insetInlineStart = `${left}px`
      menu.style.insetBlockStart = `${flip ? rect.top - GAP - Math.min(height, max) : rect.bottom + GAP}px`
      // The grow starts at the trigger's corner.
      menu.style.transformOrigin = `${rect.right - left}px ${flip ? 'bottom' : 'top'}`
    }
    place()
    items(menu)
      .at(start.current === 'last' ? -1 : 0)
      ?.focus()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(typed.current.timer), [])

  // Esc, a pick and Tab close it; focus goes home unless the user clicked
  // somewhere else that took it.
  const onBeforeToggle = (event: SyntheticEvent<HTMLDivElement>) => {
    const next = (event.nativeEvent as ToggleEvent).newState
    if (next !== 'closed') return
    const active = document.activeElement
    if (active === document.body || menuRef.current?.contains(active)) {
      triggerRef.current?.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items(menuRef.current)
    const index = list.indexOf(document.activeElement as HTMLElement)
    const move = (next: number) => {
      event.preventDefault()
      list.at(next % list.length)?.focus()
    }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index <= 0 ? -1 : index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(-1)
    else if (event.key === 'Tab') menuRef.current?.hidePopover()
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      // Type-ahead: letters typed together narrow the match.
      window.clearTimeout(typed.current.timer)
      typed.current.text += event.key.toLowerCase()
      typed.current.timer = window.setTimeout(() => {
        typed.current.text = ''
      }, 500)
      const from = typed.current.text.length > 1 ? index : index + 1
      const text = typed.current.text
      ;[...list.slice(from), ...list.slice(0, from)]
        .find((item) => item.textContent.trim().toLowerCase().startsWith(text))
        ?.focus()
    }
  }

  const triggerProps: MenuTriggerProps = {
    ref: triggerRef,
    id: `${id}-trigger`,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': id,
    popoverTarget: id,
    onKeyDown(event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      start.current = event.key === 'ArrowUp' ? 'last' : 'first'
      menuRef.current?.showPopover()
    },
  }

  return (
    <>
      {trigger(triggerProps)}
      <div
        ref={menuRef}
        id={id}
        className="menu"
        data-wide={wide || undefined}
        popover="auto"
        role="menu"
        aria-label={header || identity ? undefined : label}
        aria-labelledby={header || identity ? headerId : undefined}
        onBeforeToggle={onBeforeToggle}
        onToggle={(event) => setOpen(event.nativeEvent.newState === 'open')}
        onKeyDown={onKeyDown}
      >
        {header && (
          <div className="menu-header" id={headerId}>
            {header}
          </div>
        )}
        {identity && (
          <>
            <div className="menu-identity" id={headerId}>
              <span className="menu-identity-name">{identity.name}</span>
              {identity.detail && (
                <span className="menu-identity-detail">{identity.detail}</span>
              )}
            </div>
            <MenuDivider />
          </>
        )}
        {children}
      </div>
    </>
  )
}

/** Picking a row runs `onSelect`, then closes the menu. */
export function MenuItem({
  children,
  onSelect,
  icon,
  tone = 'default',
  checked,
  role,
  disabled = false,
}: MenuItemProps) {
  const resolvedRole =
    role ?? (checked === undefined ? 'menuitem' : 'menuitemradio')
  const hasChoice = checked !== undefined

  const select = (event: MouseEvent<HTMLElement>) => {
    if (disabled) return
    event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
    onSelect?.()
  }

  return (
    <div
      className="menu-item"
      data-tone={tone === 'default' ? undefined : tone}
      data-checked={checked || undefined}
      role={resolvedRole}
      aria-checked={hasChoice ? checked : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={select}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.currentTarget.click()
        }
      }}
    >
      {icon && <Icon name={icon} />}
      <span className="menu-item-label">{children}</span>
      {hasChoice && (
        <span className="menu-item-check">
          {checked && <Icon name="done" />}
        </span>
      )}
    </div>
  )
}

/** Separates choices from actions, or a destructive row from the rest. */
export function MenuDivider() {
  return (
    <div className="menu-divider" role="none">
      <Divider semantic />
    </div>
  )
}
