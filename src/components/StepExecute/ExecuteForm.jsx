import { useState, useEffect, useMemo, useContext } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ImageUploadField from '../common/ImageUploadField.jsx'
import MetaInputField from '../common/MetaInputField.jsx'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import { CyberContainer } from '../common/CyberContainer.jsx'
import { useAccountBalances } from '../terminal/providers/AccountBalanceProvider.jsx'
import { PopupContext } from '../../popup/context.js'
import { useQuery } from '@urql/preact'

const DAO_VSC_ID = 'vsc1BVa7SPMVKQqsJJZVp2uPQwmxkhX4qbugGt'
const DAO_PROJECTS_QUERY = `
  query DaoProjects {
    projects: okinoko_dao_project_overview(order_by: { project_id: asc }) {
      project_id
      name
      proposal_cost
      funds_asset
      proposals_members_only
      member
      active
      created_by
    }
  }
`

export default function ExecuteForm({
  user,
  contract,
  fn,
  params,
  setParams,
  pending,
  setStep,
  allMandatoryFilled,
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [insufficient, setInsufficient] = useState(false)
  const [hintOverlay, setHintOverlay] = useState(null)
  const { openPopup } = useContext(PopupContext)
  const { balances: accountBalances } = useAccountBalances()
  const [daoProjects, setDaoProjects] = useState([])
  const rawUser = user || ''
  const hiveUser = rawUser?.startsWith('hive:') ? rawUser : rawUser ? `hive:${rawUser}` : ''
  const lowerRaw = rawUser.toLowerCase()
  const lowerHive = hiveUser.toLowerCase()
  const balances = useMemo(() => {
    if (!accountBalances) {
      return { hive: 0, hbd: 0 }
    }
    return {
      hive: Number(accountBalances.hive ?? 0) / 1000,
      hbd: Number(accountBalances.hbd ?? 0) / 1000,
    }
  }, [accountBalances])

  // Handle mobile layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Track insufficient balance for vscIntent fields
  useEffect(() => {
    const intent = fn?.parameters?.find((p) => p.type === 'vscIntent')
    if (!intent) {
      setInsufficient(false)
      return
    }

    const current = params[intent.name] ?? { amount: '', asset: 'HIVE' }
    const parsed = parseFloat(String(current.amount || '').replace(',', '.'))
    const available = current.asset === 'HIVE' ? balances.hive : balances.hbd
    const over = !isNaN(parsed) && parsed > available

    setInsufficient(over)
  }, [fn, params, balances])

  const isDaoContract = contract?.vscId === DAO_VSC_ID
  const isDaoProjectCreate = isDaoContract && fn?.name === 'project_create'
  const isProposalCreate = isDaoContract && fn?.name === 'proposal_create'

  // Fetch DAO projects for dropdowns (via Hasura/urql provider)
  const [{ data: daoData, error: daoError }] = useQuery({
    query: DAO_PROJECTS_QUERY,
    pause: !isDaoContract,
    requestPolicy: 'network-only',
  })

  useEffect(() => {
    if (!isDaoContract) return
    if (daoError) return
    const userVariants = [rawUser, hiveUser, lowerRaw, lowerHive]
      .filter(Boolean)
      .map((u) => u.toLowerCase())

    const byProject = new Map()
    ;(daoData?.projects || []).forEach((row) => {
      const pid = Number(row.project_id)
      const existing = byProject.get(pid) || {
        project_id: pid,
        name: row.name,
        proposal_cost: row.proposal_cost,
        funds_asset: row.funds_asset,
        proposals_members_only: row.proposals_members_only,
        created_by: row.created_by,
        member_hit: false,
      }
      const memberVal = String(row.member || '').toLowerCase()
      const activeVal =
        row.active === true ||
        row.active === 'true' ||
        row.active === 1 ||
        row.active === '1' ||
        row.active === null ||
        row.active === undefined
      const isMemberHit =
        memberVal &&
        userVariants.includes(memberVal) &&
        activeVal
      if (isMemberHit) existing.member_hit = true
      if (!existing.name && row.name) existing.name = row.name
      byProject.set(pid, existing)
    })

    const accessible = Array.from(byProject.values()).filter((p) => {
      const created = String(p.created_by || '').toLowerCase()
      const isCreator = userVariants.includes(created)
      return (
        p.member_hit || isCreator || p.proposals_members_only === false
      )
    })

    setDaoProjects(
      accessible.map((p) => ({
        id: p.project_id,
        name: p.name || `DAO #${p.project_id}`,
        proposal_cost: p.proposal_cost,
        asset: (p.funds_asset || 'HIVE').toUpperCase(),
      }))
    )
  }, [
    daoData,
    daoError,
    hiveUser,
    isDaoContract,
    lowerHive,
    lowerRaw,
    rawUser,
  ])

  const projectIdParam = useMemo(
    () =>
      fn?.parameters?.find((p) =>
        (p.name || '').toLowerCase().includes('project id')
      ),
    [fn]
  )

  const proposalCostParam = useMemo(
    () =>
      fn?.name === 'proposal_create'
        ? fn?.parameters?.find(
            (p) =>
              (p.name || '').toLowerCase().includes('proposal cost') ||
              p.payloadName === 'vscIntent'
          )
        : null,
    [fn]
  )

  const forcePollParam = useMemo(
    () =>
      isProposalCreate
        ? fn?.parameters?.find(
            (p) =>
              (p.payloadName || '').toLowerCase() === 'forcepoll' ||
              (p.name || '').toLowerCase().includes('force poll')
          )
        : null,
    [fn, isProposalCreate]
  )

  const payoutsParam = useMemo(
    () =>
      isProposalCreate
        ? fn?.parameters?.find(
            (p) =>
              (p.payloadName || '').toLowerCase() === 'payouts' ||
              (p.name || '').toLowerCase().includes('payout')
          )
        : null,
    [fn, isProposalCreate]
  )

  const metaParam = useMemo(
    () =>
      isProposalCreate
        ? fn?.parameters?.find(
            (p) =>
              (p.payloadName || '').toLowerCase() === 'meta' ||
              (p.name || '').toLowerCase().includes('meta')
          )
        : null,
    [fn, isProposalCreate]
  )

  const forcePollActive = useMemo(() => {
    if (!forcePollParam) return false
    const val = params[forcePollParam.name]
    return (
      val === true ||
      val === 'true' ||
      val === 1 ||
      val === '1' ||
      val === 'TRUE'
    )
  }, [forcePollParam, params])

  // Clear meta/payout fields when force poll is enabled
  useEffect(() => {
    if (!forcePollActive) return
    if (!payoutsParam && !metaParam) return
    setParams((prev) => {
      let changed = false
      const next = { ...prev }
      if (payoutsParam && next[payoutsParam.name]) {
        next[payoutsParam.name] = ''
        changed = true
      }
      if (metaParam && next[metaParam.name]) {
        next[metaParam.name] = ''
        changed = true
      }
      return changed ? next : prev
    })
  }, [forcePollActive, payoutsParam, metaParam, setParams])

  // Auto-fill proposal cost when selecting project
  useEffect(() => {
    if (!isDaoContract || fn?.name !== 'proposal_create') return
    if (!projectIdParam || !proposalCostParam) return
    const selectedProject = params[projectIdParam.name]
    if (!selectedProject) return
    const proj = daoProjects.find(
      (p) => Number(p.id) === Number(selectedProject)
    )
    if (!proj || proj.proposal_cost === undefined || proj.proposal_cost === null)
      return
    const desired = {
      amount: Number(proj.proposal_cost || 0).toFixed(3),
      asset: proj.asset,
    }
    const current = params[proposalCostParam.name]
    if (current) {
      const sameAmount =
        current.amount !== undefined &&
        current.amount !== '' &&
        Number(current.amount) === Number(desired.amount)
      const sameAsset =
        (current.asset || '').toUpperCase() === desired.asset
      if (sameAmount && sameAsset) return
    }
    setParams((prev) => ({
      ...prev,
      [proposalCostParam.name]: desired,
    }))
  }, [
    daoProjects,
    fn,
    isDaoContract,
    params,
    projectIdParam,
    proposalCostParam,
    setParams,
  ])

  const clampNumber = (val, min, max) => {
    let num = parseFloat(val)
    if (Number.isNaN(num)) return val
    if (min !== undefined) num = Math.max(min, num)
    if (max !== undefined) num = Math.min(max, num)
    return num
  }

  const renderDaoSwitch = (p, leftLabel, rightLabel) => {
    const checked = !!params[p.name]
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
          {leftLabel}
        </span>
        <NeonSwitch
          name=""
          checked={checked}
          onChange={(val) =>
            setParams((prev) => ({
              ...prev,
              [p.name]: val,
            }))
          }
        />
        <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
          {rightLabel}
        </span>
      </div>
    )
  }

  const renderParamInput = (p) => {
    const labelText = `${p.name}${p.mandatory ? ' *' : ''}`

    if (isDaoProjectCreate && p.payloadName === 'votingSystem') {
      return renderDaoSwitch(p, 'Democratic', 'Stake-based')
    }

    if (isDaoProjectCreate && p.payloadName === 'creatorRestriction') {
      return renderDaoSwitch(p, 'Members', 'Public')
    }

    // DAO project selector
    const isProjectIdField =
      isDaoContract &&
      ((p.name || '').toLowerCase().includes('project id') ||
        (p.payloadName || '').toLowerCase() === 'projectid')

    if (isProjectIdField) {
      const value = params[p.name] ?? ''
      return (
        <select
          className="vsc-input"
          value={value}
          onChange={(e) =>
            setParams((prev) => ({
              ...prev,
              [p.name]: Number(e.target.value),
            }))
          }
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'black',
            color: 'var(--color-primary-lighter)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
          <option value="" disabled>
            {daoProjects.length ? 'Select a DAO' : 'No accessible DAOs found'}
          </option>
          {daoProjects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name} (#{proj.id})
            </option>
          ))}
        </select>
      )
    }

    if (p.type?.startsWith('meta-')) {
      if (isProposalCreate && forcePollActive && metaParam?.name === p.name) {
        return null
      }
      return (
        <MetaInputField
          paramName={p.name}
          paramType={p.type}
          params={params}
          setParams={setParams}
          metaAsArray={p.metaAsArray ?? fn?.metaAsArray ?? false}
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
          name=""
          checked={!!params[p.name]}
          onChange={(val) =>
            setParams((prev) => ({ ...prev, [p.name]: val }))
          }
        />
      )
    }

    if (p.type === 'vscIntent') {
      const current = params[p.name] ?? { amount: '', asset: 'HIVE' }
      const available =
        current.asset === 'HIVE' ? balances.hive : balances.hbd

      const parsed = parseFloat(String(current.amount || '').replace(',', '.'))
      const exceeds = !isNaN(parsed) && parsed > available

      const onAmountChange = (e) => {
        let val = e.target.value.replace(',', '.')
        if (/^\d*([.]\d{0,3})?$/.test(val) || val === '') {
          setParams((prev) => ({
            ...prev,
            [p.name]: { ...current, amount: val },
          }))
        }
      }

      const onAmountBlur = (e) => {
        const val = parseFloat(String(e.target.value).replace(',', '.'))
        if (!isNaN(val)) {
          setParams((prev) => ({
            ...prev,
            [p.name]: { ...current, amount: val.toFixed(3) },
          }))
        }
      }

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
            type="text"
            inputMode="decimal"
            placeholder="Amount"
            label={labelText}
            hideLabel
            value={current.amount}
            onChange={onAmountChange}
            onBlur={onAmountBlur}
            style={{
              flex: '0 0 50%',
              borderColor: exceeds ? 'red' : 'var(--color-primary-lighter)',
              boxShadow: exceeds ? '0 0 8px red' : 'none',
            }}
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
              flex: '0 0 20%',
              appearance: 'none',
              backgroundColor: 'black',
              padding: '0 20px 0 8px',
              backgroundImage:
                'linear-gradient(45deg, transparent 50%, var(--color-primary-lighter) 50%), linear-gradient(135deg, var(--color-primary-lighter) 50%, transparent 50%)',
              backgroundPosition:
                'calc(100% - 12px) center, calc(100% - 7px) center',
              backgroundSize: '5px 5px, 5px 5px',
              backgroundRepeat: 'no-repeat',
              color: 'var(--color-primary-lighter)',
            }}
          >
            <option value="HIVE">HIVE</option>
            <option value="HBD">HBD</option>
          </select>

          <span
            style={{
              flex: '0 0 auto',
              fontSize: '0.8rem',
              color: exceeds ? 'red' : 'var(--color-primary-lighter)',
            }}
          >
            {available.toFixed(3)} {current.asset}
          </span>
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
          label={labelText}
          type="text"
          placeholder="hive:username"
          value={value}
          onChange={handleChange}
          hideLabel
          style={{ marginTop: '4px' }}
        />
      )
    }

    return (
      <FloatingLabelInput
        label={labelText}
        type={p.type === 'number' ? 'number' : 'text'}
        value={params[p.name] ?? ''}
        hideLabel
        onChange={(e) => {
          const val = e.target.value
          setParams((prev) => ({
            ...prev,
            [p.name]: val,
          }))
        }}
        onBlur={
          p.type === 'number' || p.min !== undefined || p.max !== undefined
            ? (e) => {
                const clamped = clampNumber(e.target.value, p.min, p.max)
                if (clamped !== e.target.value && !Number.isNaN(parseFloat(clamped))) {
                  setParams((prev) => ({
                    ...prev,
                    [p.name]: clamped.toString(),
                  }))
                }
              }
            : undefined
        }
        min={p.min}
        max={p.max}
        step={p.min !== undefined || p.max !== undefined ? '0.1' : undefined}
        style={{ marginTop: '4px' }}
      />
    )
  }

  const renderParamRow = (p) => {
    if (
      isProposalCreate &&
      forcePollActive &&
      (p === payoutsParam || p === metaParam)
    ) {
      return null
    }
    const hint = (p.hintText || '').trim()
    const labelText = `${p.name}${p.mandatory ? ' *' : ''}`
    return (
      <div key={p.name} style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.95rem' }}>
            {labelText}
          </span>
          {hint ? (
            <FontAwesomeIcon
              icon={faCircleInfo}
              title={hint}
              style={{ color: 'var(--color-primary-lighter)', cursor: 'help' }}
              onMouseEnter={(e) =>
                setHintOverlay({
                  text: hint,
                  x: e.clientX - 60,
                  y: e.clientY - 60,
                })
              }
              onMouseMove={(e) =>
                setHintOverlay((prev) =>
                  prev
                    ? {
                        ...prev,
                        x: e.clientX - 60,
                        y: e.clientY - 60,
                      }
                    : prev
                )
              }
              onMouseLeave={() => setHintOverlay(null)}
              onClick={() =>
                openPopup?.({
                  title: labelText || 'Hint',
                  body: hint,
                })
              }
            />
          ) : null}
        </div>
        <div style={{ flex: 1 }}>{renderParamInput(p)}</div>
      </div>
    )
  }

  const parameters = fn?.parameters ?? []
  const supportsOptionalGrouping = fn?.parse !== 'game'
  const mandatoryParams = supportsOptionalGrouping
    ? parameters.filter((p) => p.mandatory)
    : parameters
  const optionalParams = supportsOptionalGrouping
    ? parameters.filter((p) => !p.mandatory)
    : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: isMobile ? 'none' : '1px solid var(--color-primary-darkest)',
        paddingRight: isMobile ? '0' : '10px',
        overflow: 'hidden',
        minHeight: 0,
        overflowY: isMobile ? 'auto' : 'visible',
      }}
    >
      <div
        className="neon-scroll"
        style={{
          flex: 1,
          minHeight: 0,
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

        {parameters.length ? (
          <>
            {mandatoryParams.map(renderParamRow)}

            {optionalParams.length ? (
              <CyberContainer title="Optional settings" defaultCollapsed maxContentHeight="40vh">
                <div style={{ display: 'flex', flexDirection: 'column'}}>
                  <div style={{ marginTop: '20px' }}>
                  {optionalParams.map(renderParamRow)}
                  </div>
                </div>
              </CyberContainer>
            ) : null}

            {hintOverlay ? (
              <div
                style={{
                  position: 'fixed',
                  top: hintOverlay.y,
                  left: hintOverlay.x,
                  zIndex: 9999,
                  background: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid var(--color-primary-darker)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  maxWidth: '280px',
                  color: 'var(--color-primary-lighter)',
                  fontSize: '0.85rem',
                  pointerEvents: 'none',
                  boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(3px)',
                }}
              >
                {hintOverlay.text}
              </div>
            ) : null}
          </>
        ) : (
          <p>No parameters for this function.</p>
        )}
      </div>
    </div>
  )
}
