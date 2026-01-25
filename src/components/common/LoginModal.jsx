import { AiohaModal } from '@aioha/react-ui'
import { KeyTypes } from '@aioha/aioha'
import { playBeep } from '../../lib/beep.js'

/**
 * LoginModal - Shared login modal component
 *
 * A consistent wrapper around AiohaModal for login functionality.
 * Use this component everywhere login is needed to ensure consistent styling.
 *
 * @param {boolean} showModal - Whether the modal is displayed
 * @param {function} setShowModal - State setter for modal visibility
 * @param {function} onLoginSuccess - Optional callback when login succeeds (receives result)
 */
export default function LoginModal({ showModal, setShowModal, onLoginSuccess }) {
  if (!showModal) return null

  return (
    <div className="aioha-modal-theme">
      <AiohaModal
        displayed={showModal}
        loginOptions={{
          msg: 'Login',
          keyType: KeyTypes.Posting,
        }}
        arrangement="grid"
        onLogin={(r) => {
          if (r?.success && r?.username) {
            playBeep(880, 100, 'triangle')
            setShowModal(false)
            onLoginSuccess?.(r)
          }
        }}
        onClose={setShowModal}
      />
    </div>
  )
}
