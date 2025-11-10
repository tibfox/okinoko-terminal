import DescriptionBox from '../common/DescriptionBox.jsx'
import FunctionList from './FunctionList.jsx'

export default function ContractDetails({
  isMobile,
  selectedContract,
  selectedFunction,
  fnName,
  setFnName,
}) {
  if (!selectedContract) {
    return <p>Select a contract to view details.</p>
  }

  const isGameContract = selectedContract?.functions?.[0]?.parse === 'game'

  return (
    <div
      className="neon-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: '12px',
        height: '100%',
      }}
    >
      {!isMobile && (
        <>
          <h3 className="cyber-tile" style={{ maxWidth: '60%' }}>
            &nbsp;Contract Metadata
          </h3>
          <table
            style={{ borderSpacing: '0px 0px', borderCollapse: 'separate' }}
          >
            <tbody>
              <tr>
                <td><strong>Contract Owner:</strong></td>
                <td>
                 <a
                    href={`https://vsc.techcoderx.com/address/hive:${selectedContract.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedContract.owner}
                  </a>
                </td>

              </tr>
              <tr>
                <td><strong>Deployed On:</strong></td>
                <td>{selectedContract.deployedOn}</td>
              </tr>
               <tr>
                <td><strong>Verified On:</strong></td>
                <td>{selectedContract.verifiedOn}</td>
              </tr>
              <tr>
                <td><strong>VSC ID:</strong></td>
                <td>
                  <a
                    href={`https://vsc.techcoderx.com/contract/${selectedContract.vscId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedContract.vscId}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <DescriptionBox text={selectedContract.description} />
        </>
      )}

      {/* --- Functions Section --- */}
      {!isMobile && (
        <>
          {isGameContract ? (
            <h3 className="cyber-tile" style={{ maxWidth: '30%' }}>
              &nbsp;Games
            </h3>
          ) : (
            <h3 className="cyber-tile" style={{ maxWidth: '50%' }}>
              &nbsp;Functions
            </h3>
          )}
        </>
      )}
      <FunctionList
        selectedContract={selectedContract}
        fnName={fnName}
        setFnName={setFnName}
      />
      <DescriptionBox
        text={selectedFunction?.description}
        isMobile={isMobile}
      />
    </div>
  )
}
