import { COLORS } from "../styles/colors";

import React, { useState, useEffect } from 'react'
import SlotText from './animations/SlotText.jsx'

import { playBeep, setSoundEnabled, getSoundEnabled } from '../lib/beep.js'

import ColorPickerButton from "./ColorPickerButton.jsx";


export default function TerminalContainer({ title, children }) {
  const [isMobile, setIsMobile] = useState(null) // ✅ null = unknown initially
  const [soundEnabled, setSoundState] = useState(getSoundEnabled())

  function toggleSound() {
    const newValue = !soundEnabled
    setSoundState(newValue)
    setSoundEnabled(newValue) // 🔧 update the global flag
    playBeep(800, 100)        // optional: play confirm beep
  }

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
        padding: isMobile ? '3rem 0rem' : '2rem 3rem',
        // overflowY: isMobile ? 'auto' : 'visible',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* --- Header Section --- */}
      {!isMobile ? (
        // 🖥 Desktop Layout
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '50px',
            flexWrap: 'nowrap',
            gap: 0,
          }}
        >
           
          {/* Left: Dynamic title */}
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <SlotText
              text={title.toUpperCase()}
              tag="h1"
              interval={60}
              baseDuration={100}
              charDuration={30}
            />
          </div>

         

          {/* 🔊 Logo + sound toggle */}
<ColorPickerButton />
          <button
            onClick={toggleSound}
            style={{
              position: 'relative',
              background: 'none',
              // border: '1px solid hsl(180, 100%, 40%)',
              borderRadius: '50%',
              color: 'var(--color-primary)',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1.5rem',
              fontFamily: "'Share Tech Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? (
              // 🎵 Sound ON — bright notes
              <span
                style={{
                  color: 'var(--color-primary)',
                  // textShadow: '0 0 6px hsl(180, 100%, 50%)',
                }}
              >
                ♫
              </span>
            ) : (
              // 🔇 Muted — dim notes with bright X overlay
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  color: 'var(--color-primary-darker)', // dimmer version of the note
                }}
              >
                <span>♫</span>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: 'var(--color-primary)', // bright X
                    fontSize: '1.5rem',
                    pointerEvents: 'none',
                    transform: 'translateY(-1px)', // tiny centering tweak
                    // textShadow: '0 0 4px hsl(180, 100%, 50%)',
                  }}
                >
                  ✕
                </span>
              </span>
            )}
          </button>



          {/* Right: Branded logo */}
          <div style={{ flex: '0 0 auto', marginRight: '-25px', textAlign: 'right' }}>
            <p className="vsc-logo_oki">
              ō<span style={{ letterSpacing: "0em" }}>K</span>I<span style={{ fontSize: '0.96em' }}>Ո</span>OKO
              <br />
              <span style={{ letterSpacing: "0.01em" }}>TERMINAL</span>
            </p>
          </div>
        </div>
      ) : (
        // 📱 Mobile Layout
        <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '20px',
    gap: '0.5rem',
    position: 'relative', // 🔑 enables absolute positioning of sound icon
  }}
>
  {/* Centered logo with sound icon aligned right */}
  <div
    style={{
      width: '100%',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center', // ✅ logo text centered
      alignItems: 'center',
      lineHeight: 1.1,
    }}
  >
    <p
      className="vsc-logo_oki"
      style={{
        margin: 0,
      }}
    >
      ō<span style={{ letterSpacing: '0em' }}>K</span>I
      <span style={{ fontSize: '0.96em' }}>Ո</span>OKO TERMINAL
    </p>
<div
  style={{
    position: 'absolute',
    right: 0,
    top: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  }}
>
  <ColorPickerButton />
  <button
    onClick={toggleSound}
    style={{
      background: 'none',
      borderRadius: '50%',
      color: 'var(--color-primary)',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      fontSize: '1.5rem',
      fontFamily: "'Share Tech Mono', monospace",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}
    title={soundEnabled ? 'Mute sound' : 'Enable sound'}
  >
    {soundEnabled ? (
      <span style={{ color: 'var(--color-primary)' }}>♫</span>
    ) : (
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          color: 'var(--color-primary-darker)',
        }}
      >
        <span>♫</span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            color: 'var(--color-primary)',
            fontSize: '1.5rem',
            pointerEvents: 'none',
            transform: 'translateY(-1px)',
          }}
        >
          ✕
        </span>
      </span>
    )}
  </button>
  </div>
  </div>

  {/* Title below logo */}
  <SlotText
    text={title.toUpperCase()}
    tag="h2"
    interval={100}
    baseDuration={150}
    charDuration={50}
  />
</div>
      )}

      {/* --- Main Content Area --- */}
      <div
        className="terminal-body"
        style={{
          flex: 1,                        // ✅ fill remaining height of the terminal
          display: 'flex',                // ✅ allow children (like StepSelect) to stretch
          flexDirection: 'column',        // ✅ keep vertical stacking
          // overflow: isMobile ? 'auto' : 'visible',
          overflow: 'auto',
          minHeight: 0,                   // ✅ prevent flex height collapse
          maxHeight: isMobile ? 'calc(100vh - 180px)' : '80vh',
          paddingBottom: isMobile ? '1rem' : '0',
        }}
      >
        {children}
      </div>
    </div>
  )
}
