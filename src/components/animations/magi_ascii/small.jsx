import { COLORS } from "../../../styles/colors";

import React, { useEffect, useState } from 'react'

export default function AsciiArt() {
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

  const art = String.raw`
                                             ÆÆ                              
                                            ÆÆÆÆ                             
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ                            
                                           ÆÆ  ÆÆ     ÆÆÆÆÆÆÆÆÆÆÆ            
                                           ÆÆ  ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ          
                                          ÆÆÆ                     Æ          
                                        ÆÆÆ  ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ          
                                      ÆÆÆÆ  ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ           
                                    ÆÆÆÆ  ÆÆÆÆ                               
                                  ÆÆÆÆ  ÆÆÆÆ                                 
                                 ÆÆÆ  ÆÆÆÆ                                   
           ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ  ÆÆÆ                                     
          ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ  ÆÆÆ                                       
          ÆÆ   ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ   ÆÆ                                         
          ÆÆ  ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ               Æ  ÆÆ                                         
          ÆÆ  ÆÆ              ÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ              ÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ              ÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ              ÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ              ÆÆ  ÆÆ                                         
          ÆÆ  ÆÆ               Æ  ÆÆ                                         
          ÆÆ  ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ  ÆÆ                                         
          ÆÆ   ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ   ÆÆ                                         
          ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ                                         
           ÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ                                          
`

  const fontSize = isMobile ? '7px' : '12px'
  const lineHeight = isMobile ? '7px' : '12px'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',  // no scrollbars
        margin: 0,
        padding: 0,
      }}
    >
      <pre
        style={{
          fontFamily: 'monospace',
          fontSize,
          lineHeight,
          whiteSpace: 'pre',
          textAlign: 'center',
          margin: 0,
          padding: 0,
          color: 'var(--color-primary)',
        }}
      >
        {art.split('').map((ch, i) => (
          <span
            key={i}
            style={
              isMobile
                ? { color:'var(--color-primary)' } 
                : {
                    color: `hsl(${(i * 10) % 360}, 100%, 60%)`,
                    animation: 'rainbowSteps 4.2s steps(6, end) infinite',
                    animationDelay: `${Math.floor(i / 80) * 0.1}s`,
                  }
            }
          >
            {ch}
          </span>
        ))}
      </pre>
    </div>
  )
}
