import { useRef } from 'react'
import { WeekLockButton } from './WeekLockButton'
import { Button, Dots, Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

interface PlannerHeaderProps {
  weekRange: { start: string; end: string }
  weekOffset: number
  isWriting: boolean
  canWrite: boolean
  hasPreview: boolean
  preferenceCount: number
  shoppingCount: number
  isShoppingDisabled: boolean
  isGenerating: boolean
  isPreparingSchedule: boolean
  hasMenu: boolean
  lock: {
    isVisible: boolean
    isLocked: boolean
    weekStart: string
    onUnlock: (weekStart: string) => void
  }
  onNavigate: (offset: number) => void
  onOpenPreferences: () => void
  onOpenShopping: () => void
  onGenerateMenu: () => void
  onGenerateButtonRef: (button: HTMLButtonElement | null) => void
}

export function PlannerHeader(props: PlannerHeaderProps) {
  const { t } = useI18n()
  const preferencesRef = useRef<HTMLButtonElement>(null)
  const { weekOffset, lock } = props
  const kicker =
    weekOffset === 0
      ? 'planner.weekKickerCurrent'
      : weekOffset < 0
        ? 'planner.weekKickerPast'
        : 'planner.weekKickerFuture'
  const hasAction = (count: number) => (count > 0 ? count : undefined)

  return (
    <div className="planner-controls">
      <div className="planner-controls-start">
        <div
          className="planner-week-nav"
          aria-label={t('planner.weekNavigationLabel')}
        >
          <Button
            iconOnly
            size="lg"
            icon="previous"
            aria-label={t('planner.previousWeek')}
            disabled={weekOffset <= -1 || props.isWriting}
            onClick={() => props.onNavigate(weekOffset - 1)}
          />
          <p className="planner-week-pill" aria-live="polite">
            <span
              className={
                weekOffset === 0
                  ? 'planner-week-kicker planner-current-week-label'
                  : 'planner-week-kicker'
              }
            >
              {weekOffset === 0 && (
                <span aria-hidden="true" className="planner-week-dot" />
              )}
              {t(kicker)}
            </span>
            <span className="planner-week-range">
              {t('planner.weekRange', {
                start: props.weekRange.start,
                end: props.weekRange.end,
              })}
            </span>
          </p>
          <Button
            iconOnly
            size="lg"
            icon="next"
            aria-label={t('planner.nextWeek')}
            disabled={weekOffset >= 1 || props.isWriting}
            onClick={() => props.onNavigate(weekOffset + 1)}
          />
        </div>
        {lock.isVisible && (
          <WeekLockButton
            key={lock.weekStart}
            isLocked={lock.isLocked}
            onUnlock={() => {
              lock.onUnlock(lock.weekStart)
              preferencesRef.current?.focus()
            }}
          />
        )}
      </div>
      <Button
        ref={props.onGenerateButtonRef}
        className="planner-generate"
        variant="brand"
        size="xl"
        onClick={props.onGenerateMenu}
        disabled={!props.canWrite || props.isWriting || props.hasPreview}
      >
        {props.isGenerating || props.isPreparingSchedule ? (
          <>
            {t(
              props.isPreparingSchedule
                ? 'planner.aiPreparingSchedule'
                : 'planner.generating',
            )}{' '}
            <Dots />
          </>
        ) : (
          <>
            <Icon name="let-remi-choose" size="lg" />
            {props.hasMenu
              ? t('planner.regenerateMenu')
              : t('planner.generateMenu')}
          </>
        )}
      </Button>
      <div className="planner-tools" aria-label={t('planner.actionsLabel')}>
        <Button
          ref={preferencesRef}
          leadingIcon="settings"
          count={hasAction(props.preferenceCount)}
          onClick={props.onOpenPreferences}
          disabled={!props.canWrite || props.isWriting || props.hasPreview}
        >
          {t('planner.preferences')}
        </Button>
        <Button
          leadingIcon="shopping-list"
          count={hasAction(props.shoppingCount)}
          countTone="pop"
          onClick={props.onOpenShopping}
          disabled={props.isShoppingDisabled}
        >
          {t('planner.shoppingList')}
        </Button>
      </div>
    </div>
  )
}
