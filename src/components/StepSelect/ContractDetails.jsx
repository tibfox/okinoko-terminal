import React, { useEffect, useState } from 'react'
import DescriptionBox from '../common/DescriptionBox.jsx'
import FunctionList from './FunctionList.jsx'

export default function ContractDetails({
  selectedContract,
  selectedFunction,
  fnName,
  setFnName,
  setContractDone,
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!selectedContract) {
    return <p>Select a contract to view details.</p>
  }

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
          <h3>Contract Metadata</h3>
          <table style={{ borderSpacing: '0px 0px', borderCollapse: 'separate' }}>
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

          <DescriptionBox
            text={selectedContract.description}
            onDone={() => setContractDone(true)}

          />
        </>
      )}

      {/* --- Functions Section --- */}
      {!isMobile && (<h3>Functions</h3>)}
      <FunctionList
        selectedContract={selectedContract}
        fnName={fnName}
        setFnName={setFnName}
      />

      {/* Selected function description */}
      <DescriptionBox text={selectedFunction?.description} isMobile={isMobile} />
    </div>
  )
}
