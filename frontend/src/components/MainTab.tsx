import './main-tab.css'

import { useI18n } from '#/i18n'

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
    <div className="main-tab">
      <button
        className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
        type="button"
        onClick={() => onTabChange('menu')}
      >
        {t('tabs.menu')}
      </button>
      <button
        className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
        type="button"
        disabled={isIngredientsDisabled}
        onClick={() => onTabChange('ingredients')}
      >
        {t('tabs.ingredients')}
        {neededItems > 0 && <span className="badge">{neededItems}</span>}
      </button>
    </div>
  )
}
