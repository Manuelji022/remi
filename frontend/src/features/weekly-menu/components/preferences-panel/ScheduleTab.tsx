import { CalendarIcon } from '#/components/primitives'
import type { Preferences } from '#/features/weekly-menu/types'
import { useI18n } from '#/shared/i18n'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '../../schedule-domain'
import { ScheduleEditor } from '../ScheduleEditor'

interface ScheduleTabProps {
  dayContexts: Preferences['dayContexts']
  planningScopes: Preferences['planningScopes']
  onUpdateDayContext: ScheduleDayContextChange
  onUpdatePlanningScope: SchedulePlanningScopeChange
}

export function ScheduleTab(props: ScheduleTabProps) {
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
      <ScheduleEditor {...props} />
    </section>
  )
}
