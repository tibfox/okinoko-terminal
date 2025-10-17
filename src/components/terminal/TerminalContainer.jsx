import DesktopHeader from './headers/DesktopHeader.jsx'
import MobileHeader from './headers/MobileHeader.jsx'


import { useState, useEffect } from 'preact/hooks'


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

  const mobileWidth = '90vw'
  const desktopWidth = '66vw'

  return (
    <div
      className="terminal"
      style={{
        position: 'relative',
        width: isMobile ? mobileWidth : desktopWidth,
        maxWidth: isMobile ? mobileWidth : desktopWidth,
        minWidth: isMobile ? mobileWidth : desktopWidth,
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
          maxHeight: isMobile ? '100vh' : '80vh',
          paddingBottom: isMobile ? '0.1rem' : '0',
        }}
      >
        {children}
      </div>
    </div>
  )
}
