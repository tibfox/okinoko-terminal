import { h } from 'preact'
import { useState, useRef, useEffect } from 'preact/hooks'
import SlotText from '../../animations/SlotText.jsx'
import TxQueueIndicator from "../TxQueueIndicator.jsx";
import SettingsMenu from "../SettingsMenu.jsx";

import BalanceDisplay from '../AccountDisplay.jsx'
import { useAioha } from '@aioha/react-ui'



export default function MobileHeader({ title }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)


  // get aioha user
  const { user } = useAioha()

  // close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'end',
        textAlign: 'center',
        marginBottom: '20px',
        gap: '0.75rem',
        position: 'relative',
      }}
    >
      {/* --- Top bar: Logo | Balance | Menu --- */}
      <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  
                  gap: "0.5rem",
                }}
              >
                <TxQueueIndicator />
                <BalanceDisplay account={`hive:${user}`} fontMult={1} />
                <SettingsMenu />
      
              </div>

      {/* --- Title below --- */}
      <SlotText
        text={title.toUpperCase().replace(/Ō/g, "ō")}
        tag="h4"
        interval={100}
        baseDuration={150}
        charDuration={50}
      />
    </div>
  )
}
