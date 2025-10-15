import { useState, useEffect } from 'preact/hooks'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ImageUploadField from '../common/ImageUploadField.jsx'
import MetaInputField from '../common/MetaInputField.jsx'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'

export default function ExecuteForm({
  user,
  contract,
  fn,
  params,
  setParams,
  pending,
  onSend,
  setStep,
  allMandatoryFilled,
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const renderParamInput = (p) => {
    if (p.type?.startsWith('meta-')) {
      return (
        <MetaInputField
          paramName={p.name}
          paramType={p.type}
          params={params}
          setParams={setParams}
          metaAsArray={p.metaAsArray ?? fn.metaAsArray ?? false}
        />
      )
    }

    if (p.isupload) {
      return (
        <ImageUploadField
          paramName={p.name}
          user={user}
          params={params}
          setParams={setParams}
        />
      )
    }

    if (p.type === 'bool') {
      return (
        <NeonSwitch
          name={p.name}
          checked={!!params[p.name]}
          onChange={(val) => setParams((prev) => ({ ...prev, [p.name]: val }))}
        />
      )
    }

    if (p.type === 'vscIntent') {
      const current = params[p.name] ?? { amount: '', asset: 'HIVE' }
      return (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <FloatingLabelInput
            type="number"
            step="0.001"
            min="0"
            placeholder="Amount"
            label={`${p.name}${p.mandatory ? ' *' : ''}`}
            value={current.amount}
            onChange={(e) => {
              let val = e.target.value

              // Only format if it's a valid number
              if (val !== '' && !isNaN(val)) {
                // Limit to 3 decimals without adding trailing zeros while typing
                const parts = val.split('.')
                if (parts[1]?.length > 3) {
                  val = `${parts[0]}.${parts[1].slice(0, 3)}`
                }
              }

              setParams((prev) => ({
                ...prev,
                [p.name]: { ...current, amount: val },
              }))
            }}
            onBlur={(e) => {
              // On blur, enforce 3-decimal formatting (e.g., 1.2 → 1.200)
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) {
                setParams((prev) => ({
                  ...prev,
                  [p.name]: { ...current, amount: val.toFixed(3) },
                }))
              }
            }}
            style={{ flex: '0 0 70%' }}
          />

          <select
            className="vsc-input"
            value={current.asset}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                [p.name]: { ...current, asset: e.target.value },
              }))
            }
            style={{
              flex: '0 0 25%',
              appearance: 'none',
              backgroundColor: 'black',
              color: '#0ff',
              border: '1px solid rgba(0,255,255,0.3)',
              borderRadius: '4px',
              height: '28px',
              padding: '0 24px 0 8px',
              backgroundImage:
                'linear-gradient(45deg, transparent 50%, #0ff 50%), linear-gradient(135deg, #0ff 50%, transparent 50%)',
              backgroundPosition: 'calc(100% - 12px) 10px, calc(100% - 7px) 10px',
              backgroundSize: '5px 5px, 5px 5px',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <option value="HIVE">HIVE</option>
            <option value="HBD">HBD</option>
          </select>
        </div>
      )
    }

    if (p.type === 'address') {
      const value = params[p.name] ?? ''
      const handleChange = (e) => {
        let val = e.target.value.replace(/@/g, '')
        if (!val.startsWith('hive:') && val.trim() !== '') {
          val = 'hive:' + val.replace(/^hive:/, '').replace(/^:+/, '')
        }
        setParams((prev) => ({ ...prev, [p.name]: val }))
      }

      return (
        <FloatingLabelInput
          label={`${p.name}${p.mandatory ? ' *' : ''}`}
          type="text"
          placeholder="hive:username"
          value={value}
          onChange={handleChange}
          style={{ marginTop: '4px' }}
        />
      )
    }

    return (
      <FloatingLabelInput
        label={`${p.name}${p.mandatory ? ' *' : ''}`}
        type={p.type === 'number' ? 'number' : 'text'}
        value={params[p.name] ?? ''}   // ✅ controlled by state
        onChange={(e) =>
          setParams((prev) => ({
            ...prev,
            [p.name]: e.target.value,
          }))
        }
        style={{ marginTop: '4px' }}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: isMobile ? 'none' : '1px solid rgba(0,255,255,0.3)',
        paddingRight: isMobile ? '0' : '10px',
        overflow: 'hidden',
        minHeight: 0, // ✅ allows internal scroll area to size correctly
        overflowY: isMobile ? 'auto' : 'visible', // ✅ mobile scroll enabled
      }}
    >
      {/* Scrollable content */}
      <div
        className="neon-scroll"
        style={{
          flex: 1,
          minHeight: 0, // ✅ ensures scrollable height inside flexbox
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingRight: '6px',
        }}
      >
        <table
          style={{
            borderSpacing: '10px 2px',
            borderCollapse: 'separate',
            marginBottom: '10px',
          }}
        >
          <tbody>
            <tr>
              <td><strong>User:</strong></td>
              <td>{user}</td>
            </tr>
            <tr>
              <td><strong>Contract:</strong></td>
              <td>{contract?.name}</td>
            </tr>
            <tr>
              <td><strong>Function:</strong></td>
              <td>{fn?.name}</td>
            </tr>
          </tbody>
        </table>

        {fn?.parameters?.length ? (
          fn.parameters.map((p) => (
            <div key={p.name} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* <label>
                {p.name}
                 {p.mandatory && '*'}
               </label> */}
              {renderParamInput(p)}
            </div>
          ))
        ) : (
          <p>No parameters for this function.</p>
        )}
      </div>


    </div>
  )
}
