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
          <table style={{ borderSpacing: '10px 2px', borderCollapse: 'separate' }}>
            <tbody>
              <tr>
                <td><strong>Contract Owner:</strong></td>
                <td>{selectedContract.owner}</td>
              </tr>
              <tr>
                <td><strong>Deployed On:</strong></td>
                <td>{selectedContract.deployedOn}</td>
              </tr>
              <tr>
                <td><strong>VSC ID:</strong></td>
                <td>{selectedContract.vscId}</td>
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
      <h3>Functions</h3>
      <FunctionList
        selectedContract={selectedContract}
        fnName={fnName}
        setFnName={setFnName}
      />

      {/* Selected function description */}
      <DescriptionBox text={selectedFunction?.description} isMobile={isMobile}/>
    </div>
  )
}
