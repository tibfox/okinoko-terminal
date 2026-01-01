import React from 'react'
import { AiohaModal } from '@aioha/react-ui'
import { KeyTypes } from '@aioha/aioha'
import { playBeep } from '../../lib/beep.js'
import NeonButton from '../buttons/NeonButton.jsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

/**
 * ConnectWallet
 * ---------------
 * Handles the user’s wallet connection flow within the terminal.
 * Displays a “Connect Wallet” button and opens the AiohaModal login interface.
 *
 * Responsibilities:
 *  - Trigger wallet login via AiohaModal.
 *  - Handle successful authentication callbacks.
 *  - Provide user feedback through sound and modal visibility.
 *  - Display information about supported wallet providers.
 *
 * Behavior:
 *  - Clicking “Connect Wallet” opens the AiohaModal.
 *  - On successful login:
 *      • Plays a confirmation beep.
 *      • Closes the modal.
 *      • Advances to the next terminal step (Step 2: Select Contract).
 *  - The modal can also be dismissed manually using its close button.
 *
 * Props:
 *  - showModal (boolean): Whether the login modal is currently visible.
 *  - setShowModal (function): Controls the modal’s open/close state.
 *  - setStep (function): Moves the user forward in the multi-step terminal flow.
 */
export default function ConnectWallet({ showModal, setShowModal, setStep }) {
  return (
    <>
      {/* --- Connect Wallet Button --- */}
      <center><NeonButton onClick={() => setShowModal(true)}>
        <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}} />
        Connect Wallet
      </NeonButton><br></br><br></br></center>

      {/* --- Wallet Login Modal --- */}
      {showModal && (
        <AiohaModal
          displayed={showModal}
          loginOptions={{
            msg: 'Login',
            keyType: KeyTypes.Posting, // request Posting key for initial connection
          }
        }
          onLogin={(r) => {
            if (r?.success && r?.username) {
              // Play success tone and proceed to contract selection
              playBeep(880, 100, 'triangle')
              setShowModal(false)
              setStep(2)
            }
          }}
          onClose={setShowModal}
        />
      )}
    </>
  )
}
