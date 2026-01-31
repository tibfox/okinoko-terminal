import { useState, useEffect } from 'preact/hooks'
import { AiohaModal } from '@aioha/react-ui'
import { KeyTypes } from '@aioha/aioha'
import { createPortal } from 'preact/compat'
import { playBeep } from '../../lib/beep.js'

/**
 * LoginModal - Shared login modal component
 *
 * A consistent wrapper around AiohaModal for login functionality.
 * Use this component everywhere login is needed to ensure consistent styling.
 * Uses a portal to render at document.body level, ensuring it appears above all content.
 *
 * Tries posting key first, falls back to active key if posting validation fails.
 *
 * @param {boolean} showModal - Whether the modal is displayed
 * @param {function} setShowModal - State setter for modal visibility
 * @param {function} onLoginSuccess - Optional callback when login succeeds (receives result)
 */
export default function LoginModal({ showModal, setShowModal, onLoginSuccess }) {
  const [keyType, setKeyType] = useState(KeyTypes.Posting)

  // Reset to posting key when modal opens
  useEffect(() => {
    if (showModal) {
      setKeyType(KeyTypes.Posting)
    }
  }, [showModal])

  if (!showModal) return null

  const handleLogin = (r) => {
    if (r?.success && r?.username) {
      playBeep(880, 100, 'triangle')
      setShowModal(false)
      onLoginSuccess?.(r)
    } else if (!r?.success && keyType === KeyTypes.Posting) {
      // If posting key validation failed, retry with active key
      const errorMsg = r?.error || ''
      if (errorMsg.includes('not associated') || errorMsg.includes('5901')) {
        console.log('[LoginModal] Posting key validation failed, retrying with Active key')
        setKeyType(KeyTypes.Active)
      }
    }
  }

  const modalContent = (
    <div
      className="aioha-modal-theme"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AiohaModal
        displayed={showModal}
        loginOptions={{
          msg: 'Login',
          keyType: keyType,
          metamask: { validateUser: true },
        }}
        arrangement="grid"
        onLogin={handleLogin}
        onClose={setShowModal}
      />
    </div>
  )

  // Use portal to render at document.body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
