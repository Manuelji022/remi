import './pills.css'

interface ModePillProps {
  mode: 'office' | 'eatOut'
  selected: boolean
  onClick: () => void
}

export function ModePill({ mode, selected, onClick }: ModePillProps) {
  const labels = { office: 'Office', eatOut: 'Eat Out' }
  return (
    <button
      className={`mode-pill ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      {labels[mode]}
    </button>
  )
}
