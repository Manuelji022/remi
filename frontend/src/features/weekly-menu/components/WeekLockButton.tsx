import './week-lock-button.css'
import { useState } from 'react'
import { useHoldToConfirm } from '../hooks/useHoldToConfirm'
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
      {isLocked && (
        <button
          {...handlers}
          type="button"
          className="week-lock-button"
          data-holding={isHolding}
          aria-label={t('planner.weekLockedLabel')}
          onContextMenu={(event) => event.preventDefault()}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <circle className="week-lock-track" cx="20" cy="20" r="18" />
            {isHolding && (
              <circle
                className="week-lock-progress"
                cx="20"
                cy="20"
                r="18"
                pathLength="1"
                style={{ animationDuration: `${HOLD_DURATION_MS}ms` }}
              />
            )}
            <path d="M15 18v-4a5 5 0 0 1 10 0v4m-11 0h12v12H14z" />
          </svg>
          <span>{t('planner.holdToUnlock')}</span>
        </button>
      )}
      <span className="week-lock-status" role="status" aria-live="polite">
        {announced ? t('planner.weekUnlocked') : ''}
      </span>
    </div>
  )
}
