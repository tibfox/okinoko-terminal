export default function ResumedTransactionBanner({ tx }) {
  if (!tx) return null

  return (
    <div
      style={{
        background: 'rgba(0,255,136,0.1)',
        border: '1px solid var(--color-primary-darker)',
        padding: '8px 12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        marginBottom: '10px',
        color: '#00ff88',
      }}
    >
      🧩 Resumed transaction: <b>{tx.fnName}</b> on <b>{tx.contractId}</b>
    </div>
  )
}
