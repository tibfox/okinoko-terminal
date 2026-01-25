import DescriptionBox from '../common/DescriptionBox.jsx'
import FunctionGrid from './FunctionGrid.jsx'
import DaoUserLists from './DaoUserLists.jsx'
import LotteryUserLists from './LotteryUserLists.jsx'
import GorakuTokenPanel from './GorakuTokenPanel.jsx'
import InfoIcon from '../common/InfoIcon.jsx'

const LOTTERY_VSC_ID = 'vsc1BiM4NC1yeGPCjmq8FC3utX8dByizjcCBk7'
const GORAKU_VSC_ID = 'vsc1PLACEHOLDER_GAMES2'

export default function ContractDetails({
  isMobile,
  selectedContract,
  selectedFunction,
  fnName,
  user,
  isDaoContract,
  onCreateDao,
  onCreateProposal,
  setParams,
  setFnName,
  setStep,
  setContractId,
  setBackOverride,
  deepLink,
  clearDeepLink,
}) {
  if (!selectedContract) {
    return <p>Select a contract to view details.</p>
  }

  const isGameContract = selectedContract?.functions?.[0]?.parse === 'game'
  const isLotteryContract = selectedContract?.vscId === LOTTERY_VSC_ID
  const isGorakuContract = selectedContract?.vscId === GORAKU_VSC_ID

  // Build contract details tooltip as a table
  const contractDetailsTooltip = (
    <table style={{ borderSpacing: '8px 4px', borderCollapse: 'separate' }}>
      <tbody>
        <tr>
          <td style={{ color: 'var(--color-primary-darker)' }}>Owner</td>
          <td>
            <a
              href={`https://vsc.techcoderx.com/address/hive:${selectedContract.owner}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary-lighter)' }}
            >
              {selectedContract.owner}
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ color: 'var(--color-primary-darker)' }}>Deployed</td>
          <td>{selectedContract.deployedOn}</td>
        </tr>
        <tr>
          <td style={{ color: 'var(--color-primary-darker)' }}>Verified</td>
          <td>{selectedContract.verifiedOn}</td>
        </tr>
        <tr>
          <td style={{ color: 'var(--color-primary-darker)' }}>VSC ID</td>
          <td>
            <a
              href={`https://vsc.techcoderx.com/contract/${selectedContract.vscId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary-lighter)' }}
            >
              {selectedContract.vscId}
            </a>
          </td>
        </tr>
        {selectedContract.description && (
          <tr>
            <td style={{ color: 'var(--color-primary-darker)', verticalAlign: 'top' }}>Description</td>
            <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{selectedContract.description}</td>
          </tr>
        )}
      </tbody>
    </table>
  )

  return (
    <div
      className="neon-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: '12px',
        height: '100%',
      }}
    >
      {!isMobile && (
        <h3
          className="cyber-tile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ flex: 1 }}>{selectedContract.name || 'Contract'}</span>
          <InfoIcon tooltip={contractDetailsTooltip} />
        </h3>
      )}

      {/* --- Functions/Games Section --- */}
      {!isDaoContract && !isLotteryContract && (
        <>
          {/* Goraku Token Panel (inside Games section, above game tiles) */}
          {isGorakuContract && (
            <GorakuTokenPanel />
          )}
          {/* To revert to list on mobile, change FunctionGrid back to FunctionList */}
          <FunctionGrid
            selectedContract={selectedContract}
            fnName={fnName}
            setFnName={setFnName}
          />
          <DescriptionBox
            text={selectedFunction?.description}
            isMobile={isMobile}
          />
        </>
      )}

      {isDaoContract && (
        <DaoUserLists
          user={user}
          isMobile={isMobile}
          onCreateDao={onCreateDao}
          onCreateProposal={onCreateProposal}
          setParams={setParams}
          setFnName={setFnName}
          setStep={setStep}
          setContractId={setContractId}
          setBackOverride={setBackOverride}
          deepLink={deepLink}
          clearDeepLink={clearDeepLink}
        />
      )}

      {isLotteryContract && (
        <LotteryUserLists
          user={user}
          isMobile={isMobile}
          onCreateLottery={() => {
            setContractId?.(LOTTERY_VSC_ID)
            setFnName?.('create_lottery')
            setStep?.(2)
          }}
          setParams={setParams}
          setFnName={setFnName}
          setStep={setStep}
          setContractId={setContractId}
          deepLink={deepLink}
          clearDeepLink={clearDeepLink}
        />
      )}
    </div>
  )
}
