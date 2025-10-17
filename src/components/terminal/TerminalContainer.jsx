import DesktopHeader from './headers/DesktopHeader.jsx'
import MobileHeader from './headers/MobileHeader.jsx'

import BalanceDisplay from './AccountDisplay.jsx'
import SoundToggleButton from './SoundToggleButton.jsx'

import React, { useState, useEffect } from 'react'
import SlotText from '../animations/SlotText.jsx'

import { playBeep, setSoundEnabled, getSoundEnabled } from '../../lib/beep.js'

import ColorPickerButton from "./ColorPickerButton.jsx";


export default function TerminalContainer({ title, children }) {
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


  return (
    <div
      className="terminal"
      style={{
        position: 'relative',
        width: isMobile ? '95vw' : '66vw',
        maxWidth: isMobile ? '95vw' : '66vw',
        minWidth: isMobile ? '95vw' : '66vw',
        flex: 1,                  // ✅ let CSS manage full height
        display: 'flex',
        flexDirection: 'column',
        margin: isMobile ? '0' : 'auto',
        padding: isMobile ? '3rem 0rem' : '1rem 1rem',
        // overflowY: isMobile ? 'auto' : 'visible',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* --- Header Section --- */}
  {!isMobile ? (
  <DesktopHeader title={title}/>
) : (
  <MobileHeader title={title} />
)}


      {/* --- Main Content Area --- */}
      <div
        className="terminal-body"
        style={{
          flex: 1,                        
          display: 'flex',                
          flexDirection: 'column',        
          overflow: 'auto',
          minHeight: 0,                
          maxHeight: isMobile ? 'calc(100vh - 180px)' : '80vh',
          paddingBottom: isMobile ? '1rem' : '0',
        }}
      >
        {children}
      </div>
    </div>
  )
}
