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
      <div className="next-button-glitter-wrapper">
        <NeonButton
          onClick={() => setModalDisplayed(true)}
          style={{ marginTop: '20px', minWidth: '200px', position: 'relative', overflow: 'hidden' }}
        >
          <div className="pixel-sparkle-grid pixel-sparkle-grid-twinkle">
            {Array.from({ length: 90 }).map((_, i) => (
              <div key={`twinkle-${i}`} className="pixel-sparkle-twinkle"></div>
            ))}
          </div>
          <div className="pixel-sparkle-grid pixel-sparkle-grid-overlay">
            {Array.from({ length: 90 }).map((_, i) => (
              <div key={`overlay-${i}`} className="pixel-sparkle-overlay"></div>
            ))}
          </div>
          <span style={{ position: 'relative', zIndex: 3, textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000' }}>
            {user != null ?
            <FontAwesomeIcon icon={faUserAstronaut} style={{marginRight: '10px'}} /> :
            <FontAwesomeIcon icon={faLink} style={{marginRight: '10px'}} />}
            {user ?? 'Connect Wallet'}
          </span>
        </NeonButton>
      </div>
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
