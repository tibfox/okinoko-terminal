import React from 'react'
import NeonButton from '../buttons/NeonButton.jsx'
import LoginModal from '../common/LoginModal.jsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

/**
 * ConnectWallet
 * ---------------
 * Handles the user's wallet connection flow within the terminal.
 * Displays a "Connect Wallet" button and opens the LoginModal.
 *
 * Props:
 *  - showModal (boolean): Whether the login modal is currently visible.
 *  - setShowModal (function): Controls the modal's open/close state.
 *  - setStep (function): Moves the user forward in the multi-step terminal flow.
 */
export default function ConnectWallet({ showModal, setShowModal, setStep }) {
  return (
    <>
      {/* --- Connect Wallet Button --- */}
      <center><NeonButton onClick={() => setShowModal(true)}>
        <FontAwesomeIcon icon={faChevronRight} style={{
                    fontSize:'0.9rem', marginLeft: '10px'}} />
        Connect Wallet
      </NeonButton><br></br><br></br></center>

      {/* --- Wallet Login Modal --- */}
      <LoginModal
        showModal={showModal}
        setShowModal={setShowModal}
        onLoginSuccess={() => setStep(2)}
      />
    </>
  )
}
