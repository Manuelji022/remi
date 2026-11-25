import { Badge, Button, Dots, Icon } from '#/components/primitives'
import { getWeekNumber } from '#/features/weekly-menu/constants'
import { useI18n } from '#/shared/i18n'

interface PlannerHeaderProps {
  weekDate: Date
  weekRange: { start: string; end: string }
  weekOffset: number
  isWriting: boolean
  canWrite: boolean
  hasPreview: boolean
  preferenceCount: number
  isGenerating: boolean
  isPreparingSchedule: boolean
  hasMenu: boolean
  onNavigate: (offset: number) => void
  onOpenPreferences: () => void
  onGenerateMenu: () => void
  onGenerateButtonRef: (button: HTMLButtonElement | null) => void
}

export function PlannerHeader(props: PlannerHeaderProps) {
  const { t } = useI18n()
  return (
    <div className="planner-hero">
      <div className="planner-card-meta">
        <div
          className="planner-week-nav"
          aria-label={t('planner.weekNavigationLabel')}
        >
          <Button
            iconOnly
            icon="previous"
            aria-label={t('planner.previousWeek')}
            disabled={props.weekOffset <= -1 || props.isWriting}
            onClick={() => props.onNavigate(props.weekOffset - 1)}
          />
          <p className="planner-week-pill" aria-live="polite">
            {t('planner.weekKicker', {
              week: getWeekNumber(props.weekDate),
              start: props.weekRange.start,
              end: props.weekRange.end,
            })}
          </p>
          {props.weekOffset === 0 && (
            <span className="planner-current-week-label">
              {t('planner.currentWeek')}
            </span>
          )}
          <Button
            iconOnly
            icon="next"
            aria-label={t('planner.nextWeek')}
            disabled={props.weekOffset >= 1 || props.isWriting}
            onClick={() => props.onNavigate(props.weekOffset + 1)}
          />
        </div>
      </div>
      <div className="planner-actions" aria-label={t('planner.actionsLabel')}>
        <Button
          variant="secondary"
          leadingIcon="settings"
          onClick={props.onOpenPreferences}
          disabled={!props.canWrite || props.isWriting || props.hasPreview}
        >
          {t('planner.preferences')}
          <Badge count={props.preferenceCount} />
        </Button>
        <Button
          ref={props.onGenerateButtonRef}
          variant="brand"
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
              <Icon name="let-remi-choose" />
              {props.hasMenu
                ? t('planner.regenerateMenu')
                : t('planner.generateMenu')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
