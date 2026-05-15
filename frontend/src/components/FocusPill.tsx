import './pills.css'

interface FocusPillProps {
  focus: 'lunch' | 'dinner' | 'both'
  selected: boolean
  onClick: () => void
}

export function FocusPill({ focus, selected, onClick }: FocusPillProps) {
  const labels = { lunch: 'Lunch', dinner: 'Dinner', both: 'Both' }
  return (
    <button
      className={`focus-pill ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      {labels[focus]}
    </button>
  )
}
