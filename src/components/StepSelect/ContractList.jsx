import ListButton from '../buttons/ListButton.jsx'

import DescriptionBox from '../common/DescriptionBox.jsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileContract } from '@fortawesome/free-solid-svg-icons';

/**
 * ContractList
 * --------------
 * Displays all available contracts.
 * On mobile, shows metadata + short description for the selected one.
 */
export default function ContractList({
  contracts,
  contractId,
  setContractId,
  setFnName,
  isMobile,
}) {
  const selectedContract = contracts.find((c) => c.vscId === contractId)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        
      }}
    >
      {/* --- Contract Buttons --- */}
      <div
        style={{
          flex: '0 0 auto',
          maxHeight: isMobile ? '50%' : '100%',
          minHeight: isMobile ? '50%' : '100%',
          overflowY: 'auto',
          borderRight: !isMobile ? '1px solid var(--color-primary-darkest)' : 'none',
          borderBottom: isMobile ? '1px solid var(--color-primary-darkest)' : 'none',
          paddingRight: !isMobile ? '10px' : 0,
        }}
      >
        {contracts.map((c) => (
          <ListButton
            key={c.vscId}
            onClick={() => {
              setContractId(c.vscId)
              setFnName('')
            }}
            style={{
              backgroundColor: contractId === c.vscId ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)',
              color:  contractId === c.vscId ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              padding: '0.5em 1em',
              // border: 'none',
              // borderRadius: '2px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
           <FontAwesomeIcon icon={faFileContract} style={{marginRight: '10px'}} /> 
          {c.name}
          </ListButton>
        ))}
      </div>

      {/* --- Contract Preview (Mobile only) --- */}
      {isMobile && selectedContract && (
        <div
          style={{
            flex: '1 1 auto',
            padding: '10px',
            color: 'var(--color-primary)',
            fontSize: '0.85rem',
            lineHeight: 1.4,
            textAlign: 'justify',
            overflowY: 'auto',
          }}
        >
          

          {/* Metadata */}
          <table
            style={{
              borderSpacing: '6px 2px',
              borderCollapse: 'separate',
              width: '100%',
              fontSize: '0.8rem',
              marginBottom: '8px',
            }}
          >
            <tbody>
              <tr>
                <td style={{ opacity: 0.8 }}>Owner:</td>
                <td>{selectedContract.owner}</td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>Deployed:</td>
                <td>{selectedContract.deployedOn}</td>
              </tr>
              <tr>
                <td style={{ opacity: 0.8 }}>VSC ID:</td>
                <td>{selectedContract.vscId}</td>
              </tr>
            </tbody>
          </table>

          {/* Short Description */}
          <DescriptionBox
            text={selectedContract.description}
            isMobile={isMobile}
          />
        </div>
      )}
    </div>
  )
}
