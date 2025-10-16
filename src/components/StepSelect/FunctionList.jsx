import ListButton from '../buttons/ListButton.jsx'

/**
 * FunctionList
 * -------------
 * Displays all available functions for the currently selected smart contract.
 * Each function is rendered as a selectable button.
 *
 * Responsibilities:
 *  - Render a responsive grid of function buttons.
 *  - Highlight the currently active (selected) function.
 *  - Notify parent via `setFnName` when a user selects a new function.
 *
 * Props:
 *  - selectedContract (object): contract containing the `functions` array.
 *  - fnName (string): name of the currently selected function.
 *  - setFnName (function): updates parent state when a new function is chosen.
 */
export default function FunctionList({ selectedContract, fnName, setFnName }) {
  getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary-darkest')
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: '10px',
      }}
    >
      {/* Render one ListButton per contract function */}
      {selectedContract.functions.map((fn) => (
        <ListButton
          key={fn.name}
          onClick={() => setFnName(fn.name)}
          style={{
            // Highlight selected function visually
            
            backgroundColor: fnName === fn.name ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)',
            color: 'var(--color-primary)',
            width: 'calc(33% - 10px)', // three per row at minimum width
            minWidth: '120px',
            flex: '0 1 auto',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {fn.friendlyName}
        </ListButton>
      ))}
    </div>
  )
}
