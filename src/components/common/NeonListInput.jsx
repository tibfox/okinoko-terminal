import { useState } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'

/**
 * Reusable list input component with add/remove functionality
 * @param {Array} items - Array of string items
 * @param {Function} onChange - Callback when items change (items) => void
 * @param {String} placeholder - Placeholder for input fields
 * @param {String} emptyMessage - Message to show when list is empty
 * @param {Function} validateItem - Optional validation function (item) => boolean
 * @param {Function} normalizeItem - Optional normalization function (item) => string
 */
export default function NeonListInput({
  items = [],
  onChange,
  placeholder = 'Enter value',
  emptyMessage = 'No items yet',
  validateItem = () => true,
  normalizeItem = (item) => item,
}) {
  const [newItem, setNewItem] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  const baseInputStyle = {
    background: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary-lighter)',
    padding: '6px 8px',
    flex: 1,
    minWidth: '200px',
  }

  const addItem = () => {
    const normalized = normalizeItem(newItem.trim())
    if (!normalized || !validateItem(normalized)) return
    onChange([...items, normalized])
    setNewItem('')
  }

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditingValue('')
    }
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setEditingValue(items[index])
  }

  const confirmEdit = () => {
    const normalized = normalizeItem(editingValue.trim())
    if (!normalized || !validateItem(normalized)) return
    const updated = [...items]
    updated[editingIndex] = normalized
    onChange(updated)
    setEditingIndex(null)
    setEditingValue('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleKeyDown = (e, isEdit = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isEdit) {
        confirmEdit()
      } else {
        addItem()
      }
    } else if (e.key === 'Escape' && isEdit) {
      e.preventDefault()
      cancelEdit()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
        width: '100%',
      }}
    >
      {/* List of items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        {items.length === 0 ? (
          <span
            style={{
              color: 'var(--color-primary-lighter)',
              opacity: 0.8,
              fontSize: 'var(--font-size-base)',
            }}
          >
            {emptyMessage}
          </span>
        ) : (
          items.map((item, idx) =>
            editingIndex === idx ? (
              // Edit mode
              <div
                key={`item-edit-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, true)}
                  placeholder={placeholder}
                  style={baseInputStyle}
                  autoFocus
                />
                <button
                  onClick={confirmEdit}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: editingValue.trim() ? 'var(--color-primary)' : 'gray',
                    cursor: editingValue.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 'var(--font-size-base)',
                  }}
                  title="Confirm"
                  disabled={!editingValue.trim()}
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary-lighter)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-base)',
                  }}
                  title="Cancel"
                >
                  ✗
                </button>
              </div>
            ) : (
              // Display mode
              <div
                key={`item-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  border: '1px solid var(--color-primary-darkest)',
                  background: 'rgba(0, 255, 255, 0.03)',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    color: 'var(--color-primary-lighter)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => startEdit(idx)}
                  title="Click to edit"
                >
                  {item}
                </span>
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary-lighter)',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    opacity: 0.7,
                  }}
                  title="Remove"
                >
                  <FontAwesomeIcon icon={faXmark} style={
                    {fontSize:'0.9rem'}} />
                </button>
              </div>
            )
          )
        )}
      </div>

      {/* Add new item */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
        }}
      >
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, false)}
          placeholder={placeholder}
          style={baseInputStyle}
        />
        <button
          onClick={addItem}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-primary-darker)',
            color: newItem.trim() ? 'var(--color-primary)' : 'gray',
            cursor: newItem.trim() ? 'pointer' : 'not-allowed',
            padding: '6px 10px',
            fontSize: 'var(--font-size-base)',
          }}
          title="Add item"
          disabled={!newItem.trim()}
        >
          <FontAwesomeIcon icon={faPlus} style={
                    {fontSize:'0.9rem'}} />
        </button>
      </div>
    </div>
  )
}
