import { useState } from 'react'
import { useAioha, AiohaModal } from '@aioha/react-ui'
import { KeyTypes } from '@aioha/aioha'
import '@aioha/react-ui/dist/build.css'
import NeonButton from './buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faUserAstronaut } from '@fortawesome/free-solid-svg-icons';

export const AiohaPage = () => {
  const [modalDisplayed, setModalDisplayed] = useState(false)
  const { user } = useAioha()

  return (
    <>
      <NeonButton
        onClick={() => setModalDisplayed(true)}
        style={{ marginTop: '20px', minWidth: '200px' }}
      >
        {user != null ?
        <FontAwesomeIcon icon={faUserAstronaut} style={{marginRight: '10px'}} /> :
        <FontAwesomeIcon icon={faLink} style={{marginRight: '10px'}} />}
        {user ?? 'Connect Wallet'}
        
      </NeonButton>
<div className="aioha-modal-theme">
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
      </div>
    </>
  )
}
