// src/eruda-setup.ts
import eruda from 'eruda';

import { useState } from 'preact/hooks'

import { initAioha } from '@aioha/aioha'
import { AiohaProvider } from '@aioha/react-ui'


import StepConnect from './components/StepConnect/StepConnect.jsx'
import StepSelect from './components/StepSelect/StepSelect.jsx'
import StepExecute from './components/StepExecute/StepExecute.jsx'
import StepGame from './components/StepGame/StepGame.jsx'

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

    if (import.meta.env.VITE_EXPOSE_ERUDA === 'true') {
  import('eruda').then((eruda) => {
    eruda.default.init();
  });
}


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
          <StepGame
                        contractId={contractId}
                        fnName={fnName}
                        params={params}
                        setParams={setParams}
                        setStep={setPage}
                      />
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
