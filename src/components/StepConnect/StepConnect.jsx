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
          gap: isMobile ? '0.5rem' : '1.5rem',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: isMobile ? 'hidden' : 'auto',
        }}
      >
        {/* Intro copy */}
        <ConnectIntro />

        <div
          style={{
            flex: isMobile ? '1 1 auto' : '1 1 auto',
            minHeight: isMobile ? 0 : 0,
            maxHeight: isMobile ? 'none' : 'none',
            height: isMobile ? 'auto' : '100%',
            display: 'flex',
            padding: isMobile ? '0 0.5rem' : 0,
            overflow: isMobile ? 'hidden' : 'auto',
          }}
        >
          {isMobile ? <MobileAsciiArt /> : <DesktopAsciiArt />}
        </div>

        {/* Connection / Actions */}
        <div
          style={{
            display: 'flex',
            marginTop: isMobile ? '0.5rem' : '10px',
            gap: '12px',
            flexShrink: 0,
            justifyContent: user ? 'space-between' : 'center',
            width: '100%',
          }}
        >
          <AiohaPage />

          {user && (
            // --- Continue button ---
            <div className="next-button-glitter-wrapper">
              <NeonButton
                onClick={() => {
                  setStep(1) // 🚀 go to next step
                  
                }}
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
                  Enter
                  <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}} />
                </span>
              </NeonButton>
            </div>
          )}
        </div>
      </div>

    </TerminalContainer>
  )
}
