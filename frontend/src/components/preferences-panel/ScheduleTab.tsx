import { CalendarIcon } from '#/components/icons'
import { DAYS, isWeekend } from '#/data/constants'
import type { Day } from '#/data/constants'
import type { DayContext, Preferences, PlanningScope } from '#/data/types'
import { useI18n } from '#/i18n'
import { DayContextPill, PlanningScopePill } from './Pills'
import { PLANNING_SCOPE_OPTIONS } from './types'
import { getBlockedPlanningScopes } from './utils'

interface ScheduleTabProps {
  dayContexts: Preferences['dayContexts']
  planningScopes: Preferences['planningScopes']
  onUpdateDayContext: (day: Day, context: DayContext) => void
  onUpdatePlanningScope: (day: Day, scope: PlanningScope) => void
}

export function ScheduleTab({
  dayContexts,
  planningScopes,
  onUpdateDayContext,
  onUpdatePlanningScope,
}: ScheduleTabProps) {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="preferences-schedule-title"
      className="panel-section"
      id="preferences-schedule-panel"
      role="tabpanel"
    >
      <div className="panel-section-copy">
        <p className="panel-section-kicker">
          <CalendarIcon aria-hidden="true" />
          {t('preferences.scheduleKicker')}
        </p>
        <h3 id="preferences-schedule-title">
          {t('preferences.scheduleTitle')}
        </h3>
        <p>{t('preferences.scheduleBody')}</p>
      </div>

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
                  {PLANNING_SCOPE_OPTIONS.map((scope) => {
                    const isBlocked = blockedScopes.includes(scope)

                    return (
                      <PlanningScopePill
                        isDisabled={isBlocked}
                        isSelected={planningScope === scope}
                        key={scope}
                        label={
                          scope === 'both'
                            ? t('scopes.both')
                            : t(`slots.${scope}`)
                        }
                        onClick={() => onUpdatePlanningScope(day, scope)}
                      />
                    )
                  })}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
