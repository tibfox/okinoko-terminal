import React, { useState, useEffect } from 'react'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import ContractList from './ContractList.jsx'
import ContractDetails from './ContractDetails.jsx'

export default function StepSelect({
  contractId,
  setContractId,
  fnName,
  setFnName,
  setStep,
}) {
  const contracts = contractsCfg.contracts || []
  const selectedContract = contracts.find((c) => c.vscId === contractId)
  const selectedFunction = selectedContract?.functions?.find(
    (f) => f.name === fnName
  )
  const [contractDone, setContractDone] = useState(false)

  // responsive flags
  const [isMobile, setIsMobile] = useState(null)
  const [activePage, setActivePage] = useState('list')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [showPopup, setShowPopup] = useState(false)


  // ✅ Prevent flicker
  if (isMobile === null) return null


  // ✅ Handle "Next" button click
  const handleNext = () => {
    if (!selectedContract) return

    if (isMobile) {
      // On mobile — if function not selected yet, go to "Functions" page
      if (!selectedFunction) {
        setActivePage('details')
        return
      }
    }

    // On desktop (or mobile with function selected)
    if (selectedFunction.parse == "game") {
    setStep(3)
    console.log("page 3")
    }else{
      setStep(2)
    console.log("page 2")
    }
    
  }

  return (
    <TerminalContainer title="Select Contract Function">
      <p
        style={{
          textAlign: 'justify',
          lineHeight: 1.5,
          // color: '#0ff',
          marginBottom: '0.8rem',
          fontSize: isMobile ? '0.9rem' : '1rem',
          padding: isMobile ? '0 1rem' : 0,
        }}
      >
        These are{' '}
        <span
          onClick={() => setShowPopup(true)}
          style={{
            color: 'var(--color-primary)',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}
        >
          currently supported
        </span>{' '}
        smart contracts running on the magi blockchain.
      </p>

      {/* Popup */}
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              backgroundColor: '#111',
              // border: '1px solid #0ff',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '80vw',
              // color: '#0ff',
              textAlign: 'justify',
              lineHeight: 1.5,
              boxShadow: '0 0 10px #0ff',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <p>If you’re a developer with your own creations on-chain, drop a signal to 
              <a href="https://discord.gg/mG5tUWWXB3"> @tibfox</a>.<br></br><br></br>He’ll sync your contract metadata into the system so it becomes
              available via the Ōkinoko terminal soon.
            </p>

            <NeonButton onClick={() => setShowPopup(false)} style={{ marginTop: '2rem' }}>
              Close
            </NeonButton>
          </div>
        </div>
      )}

      {/* --- Mobile toggle buttons --- */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <NeonButton
            onClick={() => setActivePage('list')}
            style={{ opacity: activePage === 'list' ? 1 : 0.5 }}
          >
            Contracts
          </NeonButton>
          <NeonButton
            onClick={() => setActivePage('details')}
            style={{ opacity: activePage === 'details' ? 1 : 0.5 }}
          >
            Functions
          </NeonButton>
        </div>
      )}

      {/* --- Main Content --- */}
      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns: isMobile ? 'none' : '1fr 2fr',
          gap: isMobile ? '0' : '25px',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* --- Contract List --- */}
        <div
          style={{
            display: isMobile
              ? activePage === 'list'
                ? 'block'
                : 'none'
              : 'block',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <ContractList
            contracts={contracts}
            contractId={contractId}
            setContractId={(id) => {
              setContractId(id)
              setFnName('')
            }}
            setFnName={setFnName}
          />
        </div>

        {/* --- Contract Details --- */}
        <div
          style={{
            display: isMobile
              ? activePage === 'details'
                ? 'block'
                : 'none'
              : 'block',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <ContractDetails
            selectedContract={selectedContract}
            selectedFunction={selectedFunction}
            fnName={fnName}
            setFnName={setFnName}
            setContractDone={setContractDone}
          />
        </div>
      </div>

      {/* --- Navigation Buttons --- */}
      <div
        style={{
          display: 'flex',
          marginTop: '10px',
          gap: '12px',
          flexShrink: 0,
          justifyContent: 'space-between',
          width:'100%'
        }}
      >
        <NeonButton onClick={() => setStep(0)}>◀ Back</NeonButton>
        <NeonButton
          disabled={!selectedContract || (!isMobile && !selectedFunction)}
          onClick={handleNext} // ✅ Use new function
        >
          Next ▶
        </NeonButton>
      </div>
    </TerminalContainer>
  )
}
