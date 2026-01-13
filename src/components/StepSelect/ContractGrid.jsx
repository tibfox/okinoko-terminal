import { useState } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra,
  faFlask
} from '@fortawesome/free-solid-svg-icons'
import { useAioha } from '@aioha/react-ui'
import { KeyTypes, broadcastTx } from '@aioha/aioha'
import { createMultiAuthTransfer } from '../../lib/multiAuthTransaction.js'
import {
  recordTestButtonClick,
  recordTransactionSent
} from '../../data/testButtonTracking.js'

const TEST_USERNAME = import.meta.env.VITE_TEST_HIVE_USERNAME
const TEST_ACTIVE_KEY = import.meta.env.VITE_TEST_HIVE_ACTIVE_KEY
const IS_DEV = import.meta.env.DEV

// Icon mapping: string name to FontAwesome icon object
const iconMap = {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra
}

/**
 * Get the icon for a contract, falling back to default if not found
 */
const getContractIcon = (iconName) => {
  return iconMap[iconName] || faFileContract
}

/**
 * ContractGrid
 * --------------
 * Displays all available contracts in a grid layout for desktop.
 */
export default function ContractGrid({
  contracts,
  contractId,
  setContractId,
  setFnName,
}) {
  const { aioha, user } = useAioha()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTestClick = async () => {
    if (!user) {
      alert('Please connect your wallet first')
      return
    }

    if (!TEST_USERNAME || !TEST_ACTIVE_KEY || TEST_USERNAME === 'your_test_username') {
      alert('Please configure VITE_TEST_HIVE_USERNAME and VITE_TEST_HIVE_ACTIVE_KEY in your .env file')
      return
    }

    const normalizedUser = user.startsWith('hive:') ? user.slice(5) : user

    setIsProcessing(true)

    try {
      // Record click and check cooldown - cooldown starts when button is clicked
      const clickResult = await recordTestButtonClick(normalizedUser)

      if (clickResult.error === 'cooldown') {
        const timeUntil = clickResult.timeUntilReset
        if (timeUntil) {
          alert(`You have already used the test button recently.\nYou can try again in ${timeUntil.hours}h ${timeUntil.minutes}m.`)
        } else {
          alert('You have already used the test button recently.\nPlease try again later.')
        }
        setIsProcessing(false)
        return
      }

      if (clickResult.error) {
        console.error('Error recording click:', clickResult.error)
        // Continue anyway - don't block the user if tracking fails
      }

      const clickId = clickResult.clickId

      console.log('Creating multi-auth transfer transaction...')
      const { unsignedTransaction, firstSignature } = await createMultiAuthTransfer({
        from: TEST_USERNAME,
        to: 'null',
        amount: '0.001 HIVE',
        memo: `Multi-auth test from ${TEST_USERNAME} + ${normalizedUser}`,
        firstSignerUsername: TEST_USERNAME,
        firstSignerActiveKey: TEST_ACTIVE_KEY,
        secondSignerUsername: normalizedUser,
      })

      console.log('Transaction created, first signature:', firstSignature)
      console.log('Requesting second signature from aioha user...')

      // Pass unsigned transaction to aioha - it will add its signature
      const signResult = await aioha.signTx(unsignedTransaction, KeyTypes.Active)

      if (!signResult?.success) {
        console.error('Signing failed:', signResult?.error)
        alert(`Signing failed: ${signResult?.error || 'Unknown error'}`)
        // Click remains recorded as incomplete (abandoned)
        return
      }

      console.log('Transaction signed by aioha:', signResult.result)

      // Now combine: aioha's signed tx + our first signature
      const fullySignedTx = {
        ...signResult.result,
        signatures: [firstSignature, ...signResult.result.signatures]
      }

      console.log('Broadcasting transaction with both signatures:', fullySignedTx)
      console.log('Signatures count:', fullySignedTx.signatures?.length)

      // Broadcast the doubly-signed transaction
      try {
        const broadcastResult = await broadcastTx(fullySignedTx)
        console.log('Transaction broadcast successful:', broadcastResult)

        // Record successful transaction - this will mark click as completed
        // and update the daily limit tracker
        await recordTransactionSent(normalizedUser, clickId)

        alert(`Multi-auth transaction successful!\nResult: ${JSON.stringify(broadcastResult)}`)
      } catch (broadcastError) {
        console.error('Broadcast error details:', broadcastError)
        // Click remains recorded as incomplete (abandoned)
        throw broadcastError
      }
    } catch (error) {
      console.error('Error in multi-auth transaction:', error)
      alert(`Error: ${error.message || 'Unknown error'}`)
      // Click was already recorded - it will remain as incomplete/abandoned
    } finally {
      setIsProcessing(false)
    }
  }
  return (
    <div
      className="neon-scroll"
      style={{
        overflowY: 'auto',
        height: '100%',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '12px',
          margin: 'auto 0',
        }}
      >
      {/* Test Button - only shown in dev mode */}
      {IS_DEV && (
        <button
          onClick={handleTestClick}
          disabled={isProcessing}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'var(--color-primary-lighter)',
            border: '1px solid var(--color-primary-darkest)',
            cursor: isProcessing ? 'wait' : 'pointer',
            textTransform: 'uppercase',
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.05em',
            fontWeight: 400,
            transition: 'all 0.15s ease',
            minHeight: '120px',
            maxHeight: '160px',
            opacity: isProcessing ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
              e.currentTarget.style.borderColor = 'var(--color-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
              e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
            }
          }}
        >
          <FontAwesomeIcon
            icon={faFlask}
            style={{
              fontSize: '1.35rem',
              color: 'var(--color-primary)',
            }}
          />
          <span style={{ textAlign: 'center', lineHeight: 1.3 }}>
            {isProcessing ? '...' : 'Test'}
          </span>
        </button>
      )}

      {contracts.map((c) => {
        const isSelected = contractId === c.vscId
        return (
          <button
            key={c.vscId}
            onClick={() => {
              setContractId(c.vscId)
              setFnName('')
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '20px 16px',
              backgroundColor: isSelected
                ? 'var(--color-primary-darker)'
                : 'rgba(0, 0, 0, 0.7)',
              color: isSelected ? 'black' : 'var(--color-primary-lighter)',
              border: isSelected
                ? '2px solid var(--color-primary)'
                : '1px solid var(--color-primary-darkest)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontSize: 'var(--font-size-base)',
              letterSpacing: '0.05em',
              fontWeight: isSelected ? 700 : 400,
              transition: 'all 0.15s ease',
              minHeight: '120px',
              maxHeight: '160px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
                e.currentTarget.style.borderColor = 'var(--color-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
              }
            }}
          >
            {c.kanji ? (
              <span
                style={{
                  fontFamily: '"DotGothic16", sans-serif',
                  fontSize: c.kanji.length > 1 ? '1.25rem' : '1.5rem',
                  lineHeight: 1,
                  color: isSelected ? 'black' : 'var(--color-primary)',
                }}
              >
                {c.kanji}
              </span>
            ) : (
              <FontAwesomeIcon
                icon={getContractIcon(c.icon)}
                style={{
                  fontSize: '1.35rem',
                  color: isSelected ? 'black' : 'var(--color-primary)',
                }}
              />
            )}
            <span style={{ textAlign: 'center', lineHeight: 1.3 }}>
              {c.name}
            </span>
          </button>
        )
      })}
      </div>
    </div>
  )
}
