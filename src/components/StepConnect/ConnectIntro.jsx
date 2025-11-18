import React, { useState, useEffect } from 'react'


/**
 * ConnectIntro
 * --------------
 * Desktop → paragraph + ASCII art
 * Mobile  → paragraph with scaled-down ASCII alongside StepConnect
 */
export default function ConnectIntro() {
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* --- Introductory paragraph --- */}
      <p
        style={{
          // maxWidth: '800px',
          // textAlign: 'justify',
          lineHeight: 1.5,
          // color: '#0ff',
          fontSize: isMobile ? '0.9rem' : '1rem',
        }}
      >
        This terminal is your <b>direct uplink</b> to the <a href="https://vsc.eco/" target="_blank"
                      rel="noreferrer">Magi blockchain</a>!<br></br><br></br>
        Streamlined, fast, and tuned for quick access to curated smart contracts operating on the Magi network.
      </p>

    </div>
  )
}
