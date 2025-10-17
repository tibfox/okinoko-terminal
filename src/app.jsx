// src/eruda-setup.ts
import eruda from 'eruda';

import { useState } from 'preact/hooks'
import './app.css'

import { initAioha } from '@aioha/aioha'
import { AiohaProvider } from '@aioha/react-ui'

import TerminalContainer from './components/terminal/TerminalContainer.jsx'
import NeonButton from './components/buttons/NeonButton.jsx'
import StepConnect from './components/StepConnect/StepConnect.jsx'
import StepSelect from './components/StepSelect/StepSelect.jsx'
import StepExecute from './components/StepExecute/StepExecute.jsx'

const aioha = initAioha({
  hiveauth: {
    name: 'Okinoko Terminal',
    description: 'Okinoko Terminal App'
  },
  
})


export function App() {
  const [page, setPage] = useState(0)
  const [contractId, setContractId] = useState('')
    const [fnName, setFnName] = useState('')
    const [params, setParams] = useState({})

  // simple helper to move between pages safely
  const nextPage = () => setPage((prev) => Math.min(prev + 1, 4))
  const prevPage = () => setPage((prev) => Math.max(prev - 1, 0))

  const renderPage = () => {
    switch (page) {
      case 0:
        return (
          <StepConnect setStep={setPage}/>
          
         
        )
      case 1:
        return (
          <StepSelect
                        contractId={contractId}
                        setContractId={setContractId}
                        fnName={fnName}
                        setFnName={setFnName}
                        setStep={setPage}
                      />
        )
      case 2:
        return (
          <StepExecute
                        contractId={contractId}
                        fnName={fnName}
                        params={params}
                        setParams={setParams}
                        setStep={setPage}
                      />
        )
      case 3:
        return (
          <TerminalContainer title="Community">
            <p>Connect with other Hive users, creators, and developers!</p>
            <div className="flex gap-4 mt-4">
              <NeonButton onClick={prevPage}>Back</NeonButton>
              <NeonButton onClick={nextPage}>Next</NeonButton>
            </div>
          </TerminalContainer>
        )
      case 4:
        return (
          <TerminalContainer title="Final Step">
            <p>🎉 You’ve reached the end! Ready to join the Hive Open Days?</p>
            <div className="flex gap-4 mt-4">
              <NeonButton onClick={prevPage}>Back</NeonButton>
              <NeonButton onClick={() => alert('See you at the event!')}>
                Finish
              </NeonButton>
            </div>
          </TerminalContainer>
        )
      default:
        return null
    }
  }

  return (
    <AiohaProvider aioha={aioha}>
      {renderPage()}
    </AiohaProvider>
  )
}
