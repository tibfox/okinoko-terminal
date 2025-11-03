import React, { useState, useEffect } from 'react'
import { useAioha } from '@aioha/react-ui'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import ConnectIntro from './ConnectIntro.jsx'
import AsciiArt from '../animations/magi_ascii/small.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import { playBeep } from '../../lib/beep.js'
import { AiohaPage } from '../aioha-page.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
/*
 * StepConnect (Responsive)
 * -------------------------
 * Desktop → full intro (text + ASCII handled by ConnectIntro)
 * Mobile → scrollable layout, ASCII hidden automatically
 */
export default function StepConnect({ setStep }) {
  const { user } = useAioha()
  const [isMobile, setIsMobile] = useState(null) // ✅ null = unknown initially

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  // ✅ Prevent flicker: wait until we know if it's mobile or desktop
  if (isMobile === null) {
    return null
  }
  const terminalTitle = 'Welcome to the ŌKIՈOKO TERMINAL'
  return (
    <TerminalContainer title={terminalTitle}>
      <div
        style={{
          // display: 'flex',
          // flexDirection: 'column',
          // alignItems: 'center',
          // justifyContent: 'flex-start',
          // height: '100%',
          // width: '100%',
          // overflowY: 'auto',
          // // padding: isMobile ? '1rem 0.5rem' : '2rem',
          // textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gridTemplateColumns: isMobile ? 'none' : '1fr 2fr',
          gap: '0',
          flex: 1,                  // ✅ allow content to stretch full height
          minHeight: 0,             // ✅ prevent collapsing inside flex parent
          height: '100%',           // ✅ enforce terminal height
          width: '100%',

          // overflow: 'hidden',
        }}
      >
        {/* Intro (includes ASCII on desktop only) */}
        <ConnectIntro />
        <AsciiArt />

        {/* Connection / Actions */}
        <div
          style={{
            display: 'flex',
            marginTop: '10px',
            gap: '12px',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <AiohaPage />

          {!user ? (
            <p></p>
          ) : (
            // --- Continue button ---
            <NeonButton
              onClick={() => {
                setStep(1) // 🚀 go to next step
                playBeep(800, 100)
              }}
            >
              Enter
              <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}} />
            </NeonButton>
          )}
        </div>
      </div>

    </TerminalContainer>
  )
}
