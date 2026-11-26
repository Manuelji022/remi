import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Info,
  Leaf,
  Lock,
  LockOpen,
  LogOut,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Shuffle,
  Trash2,
  TriangleAlert,
  Utensils,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The icon set, from the Paper "Icons" artboard. Keys are the names the code
 * uses; values are the Lucide icons they draw. If it isn't here, ask before
 * adding it.
 */
const ICONS = {
  // Navigation
  previous: ChevronLeft,
  next: ChevronRight,
  expand: ChevronDown,
  back: ArrowLeft,
  forward: ArrowRight,
  close: X,
  'external-link': ExternalLink,
  // Planner
  week: Calendar,
  lock: Lock,
  unlock: LockOpen,
  'let-remi-choose': Shuffle,
  add: Plus,
  office: Briefcase,
  'eating-out': Utensils,
  // Shopping
  'shopping-list': ReceiptText,
  done: Check,
  'partly-done': Minus,
  remove: Trash2,
  // Recipes
  recipes: BookOpen,
  search: Search,
  edit: Pencil,
  vegetarian: Leaf,
  // Status & feedback
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  // Auth
  show: Eye,
  hide: EyeOff,
  // Account
  settings: Settings,
  more: Ellipsis,
  'log-out': LogOut,
  language: Globe,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS
export type IconSize = 'sm' | 'md' | 'lg' | 'xl'

interface IconProps {
  name: IconName
  /** 16, 20, 24 or 48 px. Pick it from the size of the label next to it. */
  size?: IconSize
  /**
   * Only for an icon that stands alone and carries meaning. Leave it out when
   * a visible label (or the control's aria-label) already names the action:
   * the icon is then hidden from assistive tech.
   */
  label?: string
  className?: string
}

export function Icon({ name, size = 'md', label, className }: IconProps) {
  const Glyph = ICONS[name]
  const accessibility = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true, focusable: false }
  const classes = className ? `icon ${className}` : 'icon'

  return <Glyph className={classes} data-size={size} {...accessibility} />
}
