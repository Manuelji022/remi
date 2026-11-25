import './week-lock-button.css'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useHoldToConfirm } from '../hooks/useHoldToConfirm'
import { Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

const HOLD_DURATION_MS = 1000

export function WeekLockButton({
  isLocked,
  onUnlock,
}: {
  isLocked: boolean
  onUnlock: () => void
}) {
  const { t } = useI18n()
  const [announced, setAnnounced] = useState(false)
  const { isHolding, handlers } = useHoldToConfirm({
    durationMs: HOLD_DURATION_MS,
    onConfirm() {
      setAnnounced(true)
      onUnlock()
    },
  })

  return (
    <div className="week-lock">
      {isLocked ? (
        <button
          {...handlers}
          type="button"
          className="week-lock-pill week-lock-button"
          data-holding={isHolding}
          style={
            { '--week-lock-hold': `${HOLD_DURATION_MS}ms` } as CSSProperties
          }
          aria-label={t('planner.weekLockedLabel')}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="week-lock-fill" aria-hidden="true" />
          <span className="week-lock-icon">
            <Icon name="lock" size="sm" />
          </span>
          <span className="week-lock-text">
            <span className="week-lock-kicker">{t('planner.menuLocked')}</span>
            <span className="week-lock-action">
              {t(isHolding ? 'planner.keepHolding' : 'planner.holdToUnlock')}
            </span>
          </span>
        </button>
      ) : (
        <div className="week-lock-pill week-lock-unlocked">
          <span className="week-lock-icon">
            <Icon name="unlock" size="sm" />
          </span>
          <span className="week-lock-text">
            <span className="week-lock-kicker">
              {t('planner.weekUnlocked')}
            </span>
            <span className="week-lock-action">{t('planner.youCanEdit')}</span>
          </span>
        </div>
      )}
      <span className="week-lock-status" role="status" aria-live="polite">
        {announced ? t('planner.weekUnlocked') : ''}
      </span>
    </div>
  )
}
