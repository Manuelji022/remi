import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  SparkleIcon,
} from '#/components/primitives'
import { LoadingDots } from './LoadingDots'
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
          <button
            className="icon-btn"
            type="button"
            aria-label={t('planner.previousWeek')}
            disabled={props.weekOffset <= -1 || props.isWriting}
            onClick={() => props.onNavigate(props.weekOffset - 1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
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
          <button
            className="icon-btn"
            type="button"
            aria-label={t('planner.nextWeek')}
            disabled={props.weekOffset >= 1 || props.isWriting}
            onClick={() => props.onNavigate(props.weekOffset + 1)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="planner-actions" aria-label={t('planner.actionsLabel')}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={props.onOpenPreferences}
          disabled={!props.canWrite || props.isWriting || props.hasPreview}
        >
          <SettingsIcon aria-hidden="true" />
          {t('planner.preferences')}
          {props.preferenceCount > 0 && (
            <span className="planner-btn-badge">{props.preferenceCount}</span>
          )}
        </button>
        <button
          ref={props.onGenerateButtonRef}
          className="btn btn-primary"
          type="button"
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
              <LoadingDots />
            </>
          ) : (
            <>
              <SparkleIcon aria-hidden="true" />
              {props.hasMenu
                ? t('planner.regenerateMenu')
                : t('planner.generateMenu')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
