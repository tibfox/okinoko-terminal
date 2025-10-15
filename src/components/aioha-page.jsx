import { useState } from 'react'
import { useAioha, AiohaModal } from '@aioha/react-ui'
import { KeyTypes } from '@aioha/aioha'
import '@aioha/react-ui/dist/build.css'
import NeonButton from './buttons/NeonButton.jsx'

export const AiohaPage = () => {
  const [modalDisplayed, setModalDisplayed] = useState(false)
  const { user } = useAioha()

  return (
    <>
      <NeonButton
        onClick={() => setModalDisplayed(true)}
        // style={{
        //   padding: '8px 16px',
        //   backgroundColor: '#4f46e5',
        //   color: 'white',
        //   border: 'none',
        //   borderRadius: '6px',
        //   cursor: 'pointer',
        // }}
      >
        {user ?? 'Connect Wallet'}
      </NeonButton>

      <AiohaModal
        displayed={modalDisplayed}
        loginOptions={{
          msg: 'Login',
          keyType: KeyTypes.Active,
        }}
        arrangement="grid"
        onLogin={console.log}
        onClose={() => setModalDisplayed(false)}
      />
    </>
  )
}
