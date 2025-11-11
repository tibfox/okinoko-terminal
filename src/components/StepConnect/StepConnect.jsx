import React, { useState, useEffect } from 'react'
import { useAioha } from '@aioha/react-ui'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import ConnectIntro from './ConnectIntro.jsx'
import DesktopAsciiArt from '../animations/magi_ascii/small.jsx'
import MobileAsciiArt from '../animations/magi_ascii/small.mobile.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import { playBeep } from '../../lib/beep.js'
import { AiohaPage } from '../aioha-page.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
/*
 * StepConnect (Responsive)
 * -------------------------
 * Desktop → full intro (text + ASCII handled by ConnectIntro)
 * Mobile  → scrollable layout with resized ASCII art
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
  const mobileAsciiHeight = '40vh'
  const terminalTitle = 'Welcome to the ŌKIՈOKO TERMINAL'
  return (
    <TerminalContainer
      title={terminalTitle}
      backgroundColor="rgba(0, 0, 0, 0.5)"
      titleOnMinimize="Terminal"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
        }}
      >
        {/* Intro copy */}
        <ConnectIntro />

        <div
          style={{
            flex: isMobile ? '0 0 auto' : '1 1 auto',
            minHeight: isMobile ? mobileAsciiHeight : 0,
            maxHeight: isMobile ? mobileAsciiHeight : 'none',
            height: isMobile ? mobileAsciiHeight : '100%',
            display: 'flex',
            padding: isMobile ? '0 0.5rem' : 0,
          }}
        >
          {isMobile ? <MobileAsciiArt /> : <DesktopAsciiArt />}
        </div>

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
