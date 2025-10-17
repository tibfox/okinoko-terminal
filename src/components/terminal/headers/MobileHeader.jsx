import { h } from 'preact'
import { useState, useRef, useEffect } from 'preact/hooks'
import SlotText from '../../animations/SlotText.jsx'
import ColorPickerButton from '../ColorPickerButton.jsx'
import SoundToggleButton from '../SoundToggleButton.jsx'
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
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: '20px',
        gap: '0.75rem',
        position: 'relative',
      }}
    >
      {/* --- Top bar: Logo | Balance | Menu --- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 0.75rem',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
         <ColorPickerButton />
        {/* Center: Balance */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'end',
            minWidth: 0,
            overflow: 'visible',
          }}
        >
                <BalanceDisplay account={`hive:${user}`} fontMult={0.8} />
        </div>

   
              <SoundToggleButton />
      </div>

      {/* --- Title below --- */}
      <SlotText
        text={title.toUpperCase()}
        tag="h2"
        interval={100}
        baseDuration={150}
        charDuration={50}
      />
    </div>
  )
}
