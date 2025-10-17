import ListButton from '../buttons/ListButton.jsx'

export default function FunctionList({ selectedContract, fnName, setFnName }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: '10px', // space between buttons both directions
      }}
    >
      {selectedContract.functions.map((fn) => (
        <ListButton
          key={fn.name}
          onClick={() => setFnName(fn.name)}
          style={{
            backgroundColor:
              fnName === fn.name
                ? 'var(--color-primary-darker)'
                : 'var(--color-primary-darkest)',
            color:
              fnName === fn.name
                ? 'var(--color-primary-lightest)'
                : 'var(--color-primary-lighter)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: '0.5em 1em',
            // border: 'none',
            // borderRadius: '2px',
            cursor: 'pointer',

            // 👇 prevent full-width stretch
            display: 'inline-flex',
            flex: '0 0 auto',
            width: 'auto',
          }}
        >
          {fn.friendlyName}
        </ListButton>
      ))}
    </div>
  )
}
