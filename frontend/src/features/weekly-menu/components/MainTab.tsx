import { Badge, SegmentedControl } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

interface MainTabProps {
  activeTab: 'menu' | 'ingredients'
  onTabChange: (tab: 'menu' | 'ingredients') => void
  neededItems: number
  isIngredientsDisabled?: boolean
}
export function MainTab({
  activeTab,
  onTabChange,
  neededItems,
  isIngredientsDisabled = false,
}: MainTabProps) {
  const { t } = useI18n()
  return (
    <SegmentedControl
      mode="tabs"
      label={t('tabs.menu')}
      value={activeTab}
      onChange={onTabChange}
      options={[
        {
          value: 'menu',
          label: t('tabs.menu'),
          id: 'planner-tab-menu',
          controls: 'planner-panel',
        },
        {
          value: 'ingredients',
          label: (
            <>
              {t('tabs.ingredients')}
              <Badge count={neededItems} />
            </>
          ),
          id: 'planner-tab-ingredients',
          controls: 'planner-panel',
          disabled: isIngredientsDisabled,
        },
      ]}
    />
  )
}
