import './main-tab.css'

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
  return (
    <div className="main-tab">
      <button
        className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
        type="button"
        onClick={() => onTabChange('menu')}
      >
        Weekly Menu
      </button>
      <button
        className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
        type="button"
        disabled={isIngredientsDisabled}
        onClick={() => onTabChange('ingredients')}
      >
        Shopping List
        {neededItems > 0 && <span className="badge">{neededItems}</span>}
      </button>
    </div>
  )
}
