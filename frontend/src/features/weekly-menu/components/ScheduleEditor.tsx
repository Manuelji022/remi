import { DAYS, isWeekend } from '#/features/weekly-menu/constants'
import type { Preferences } from '#/features/weekly-menu/types'
import { TogglePill } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '../schedule-domain'
import { getBlockedPlanningScopes } from '../schedule-domain'
import { DayContextPill } from './preferences-panel/Pills'
import { PLANNING_SCOPE_OPTIONS } from './preferences-panel/types'

interface ScheduleEditorProps {
  dayContexts: Preferences['dayContexts']
  planningScopes: Preferences['planningScopes']
  onUpdateDayContext: ScheduleDayContextChange
  onUpdatePlanningScope: SchedulePlanningScopeChange
}

export function ScheduleEditor({
  dayContexts,
  planningScopes,
  onUpdateDayContext,
  onUpdatePlanningScope,
}: ScheduleEditorProps) {
  const { t } = useI18n()
  return (
    <div className="panel-day-list">
      {DAYS.map((day) => {
        const dayContext = dayContexts[day] ?? null
        const planningScope = planningScopes[day] ?? 'both'
        const blockedScopes = getBlockedPlanningScopes(dayContext)
        return (
          <article
            className={`panel-day-card ${isWeekend(day) ? 'weekend' : ''}`}
            key={day}
          >
            <div className="panel-day-header">
              <div>
                <h4>{t(`days.${day}`)}</h4>
                <p>
                  {dayContext
                    ? dayContext === 'office'
                      ? t('dayContext.officeDay')
                      : t('dayContext.eatingOut')
                    : t('dayContext.none')}
                </p>
              </div>
              {isWeekend(day) && (
                <span className="panel-day-badge">{t('common.weekend')}</span>
              )}
            </div>
            <div className="panel-control-group">
              <span className="panel-control-label">
                {t('preferences.context')}
              </span>
              <div className="panel-pill-row">
                <DayContextPill
                  context="office"
                  isSelected={dayContext === 'office'}
                  onClick={() => onUpdateDayContext(day, 'office')}
                />
                <DayContextPill
                  context="eatOut"
                  isSelected={dayContext === 'eatOut'}
                  onClick={() => onUpdateDayContext(day, 'eatOut')}
                />
              </div>
            </div>
            <div className="panel-control-group">
              <span className="panel-control-label">
                {t('preferences.planAtHome')}
              </span>
              <div className="panel-pill-row">
                {PLANNING_SCOPE_OPTIONS.map((scope) => (
                  <TogglePill
                    isDisabled={blockedScopes.includes(scope)}
                    isSelected={planningScope === scope}
                    key={scope}
                    label={
                      scope === 'both' ? t('scopes.both') : t(`slots.${scope}`)
                    }
                    onClick={() => onUpdatePlanningScope(day, scope)}
                  />
                ))}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
