import { useState } from 'react'
import './DifficultySelector.css'

function DifficultySelector({ detectedDifficulty, onSelect, onCancel }) {
  const [selected, setSelected] = useState(detectedDifficulty || 'intermediate')

  const handleConfirm = () => {
    onSelect(selected)
  }

  return (
    <div className="difficulty-selector-overlay" onClick={onCancel}>
      <div className="difficulty-selector" onClick={(e) => e.stopPropagation()}>
        <h3>Select Difficulty</h3>
        
        <div className="difficulty-options">
          <button
            className={`difficulty-option ${selected === 'easy' ? 'active' : ''}`}
            onClick={() => setSelected('easy')}
          >
            <span className="difficulty-label">Easy</span>
            <span className="difficulty-badge easy">E</span>
          </button>
          
          <button
            className={`difficulty-option ${selected === 'intermediate' ? 'active' : ''}`}
            onClick={() => setSelected('intermediate')}
          >
            <span className="difficulty-label">Intermediate</span>
            <span className="difficulty-badge intermediate">I</span>
          </button>
          
          <button
            className={`difficulty-option ${selected === 'hard' ? 'active' : ''}`}
            onClick={() => setSelected('hard')}
          >
            <span className="difficulty-label">Hard</span>
            <span className="difficulty-badge hard">H</span>
          </button>
        </div>
        
        <div className="difficulty-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="confirm-btn" onClick={handleConfirm}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default DifficultySelector