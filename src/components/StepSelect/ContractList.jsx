import ListButton from '../buttons/ListButton.jsx'

import DescriptionBox from '../common/DescriptionBox.jsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra
} from '@fortawesome/free-solid-svg-icons';

// Icon mapping: string name to FontAwesome icon object
const iconMap = {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra
};

/**
 * Get the icon for a contract, falling back to default if not found
 */
const getContractIcon = (iconName) => {
  return iconMap[iconName] || faFileContract;
};

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
          borderBottom: isMobile ? '1px solid var(--color-primary-darkest)' : 'none',
          paddingRight: !isMobile ? '10px' : 0,
          zIndex: 1,
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
              backgroundColor:
                contractId === c.vscId 
                ? 'var(--color-primary-darker)' 
                // : 'var(--color-primary-darkest)',
                : 'transparent',
              color:
                contractId === c.vscId 
                ? 'black' 
                : 'var(--color-primary-lighter)',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              padding: '0.5em 1em',
               border: 'none',
              // borderRadius: '2px',
              cursor: 'pointer',
              width: '100%',
              textTransform: 'uppercase',
              fontSize: 'var(--font-size-base)',
              letterSpacing: '0.05em',
              zIndex: 1,
            }}
          >
            <FontAwesomeIcon icon={getContractIcon(c.icon)} style={{ marginRight: '10px' ,fontSize:'0.9rem', }} />
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
            fontSize: 'var(--font-size-base)',
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
              fontSize: 'var(--font-size-base)',
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
