import { useState, useEffect, useMemo, useContext, useRef } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faPlusCircle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ImageUploadField from '../common/ImageUploadField.jsx'
import MetaInputField from '../common/MetaInputField.jsx'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import { CyberContainer } from '../common/CyberContainer.jsx'
import { useAccountBalances } from '../terminal/providers/AccountBalanceProvider.jsx'
import { PopupContext } from '../../popup/context.js'
import { useQuery } from '@urql/preact'
import NeonListDropdown from '../common/NeonListDropdown.jsx'
import LotteryDropdown from '../common/LotteryDropdown.jsx'
import InfoIcon from '../common/InfoIcon.jsx'
import GamblingInfoIcon from '../common/GamblingInfoIcon.jsx'

const DAO_VSC_ID = 'vsc1Ba9AyyUcMnYVoDVsjoJztnPFHNxQwWBPsb'
const DAO_PROPOSAL_PREFILL_KEY = 'daoProposalProjectId'
const RC_LIMIT_DEFAULT = 10000
const DAO_PROJECTS_QUERY = `
  query DaoProjects {
    projects: okinoko_dao_project_overview(order_by: { project_id: asc }) {
      project_id
      name
      description
      proposal_cost
      funds_asset
      proposals_members_only
      member
      active
      created_by
    }
    treasury: okinoko_dao_treasury_movements {
      project_id
      amount
      asset
      direction
    }
  }
`
const LOTTERY_TICKET_QUERY = `
  query LotteryTicket($id: numeric!) {
    oki_lottery_v2_active(where: { id: { _eq: $id } }) {
      id
      ticket_price
      asset
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
  const { openPopup } = useContext(PopupContext)
  const { balances: accountBalances } = useAccountBalances()
  const [daoProjects, setDaoProjects] = useState([])
  const [showNewOptionInput, setShowNewOptionInput] = useState(false)
  const [newOptionText, setNewOptionText] = useState('')
  const [editingOptionIndex, setEditingOptionIndex] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [showNewShareInput, setShowNewShareInput] = useState(false)
  const [newShareText, setNewShareText] = useState('')
  const [editingShareIndex, setEditingShareIndex] = useState(null)
  const [editingShareText, setEditingShareText] = useState('')
  const [payoutReceiver, setPayoutReceiver] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [editingPayoutIndex, setEditingPayoutIndex] = useState(null)
  const [editingReceiver, setEditingReceiver] = useState('')
  const [editingAmount, setEditingAmount] = useState('')
  const [metaKey, setMetaKey] = useState('')
  const [metaValue, setMetaValue] = useState('')
  const [editingMetaIndex, setEditingMetaIndex] = useState(null)
  const [editingMetaKey, setEditingMetaKey] = useState('')
  const [editingMetaValue, setEditingMetaValue] = useState('')
  const [lotteryMetaFields, setLotteryMetaFields] = useState({
    lotteryPostUrl: '',
    donationPostUrl: '',
    additionalDescription: '',
  })
  const lotteryMetaInitializedRef = useRef(false)
  const lotteryMetaDirtyRef = useRef(false)
  const rawUser = user || ''
  const hiveUser = rawUser?.startsWith('hive:') ? rawUser : rawUser ? `hive:${rawUser}` : ''
  const lowerRaw = rawUser.toLowerCase()
  const lowerHive = hiveUser.toLowerCase()
  const newOptionInputRef = useRef(null)
  const editingInputRef = useRef(null)
  const newShareInputRef = useRef(null)
  const editingShareInputRef = useRef(null)
  const parseOptionList = (str) =>
    (str || '')
      .split(';')
      .map((o) => o.trim())
      .filter(Boolean)
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

  // Default RC limit
  useEffect(() => {
    if (!setParams) return
    if (params?.rcLimit === undefined || params?.rcLimit === null || params?.rcLimit === '') {
      setParams((prev) => ({ ...prev, rcLimit: RC_LIMIT_DEFAULT }))
    }
  }, [params?.rcLimit, setParams])

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
  const isCreateLottery = fn?.name === 'create_lottery'
  const isJoinLottery = fn?.name === 'join_lottery'
  useEffect(() => {
    if (!isJoinLottery || !setParams) return
    const intent = fn?.parameters?.find((p) => p.type === 'vscIntent')
    if (!intent) return
    const current = params?.[intent.name]
    if (!current || current.asset === 'HIVE') return
    setParams((prev) => ({
      ...prev,
      [intent.name]: { ...current, asset: 'HIVE' },
    }))
  }, [fn, isJoinLottery, params, setParams])
  const lotteryMetaParam = useMemo(
    () => fn?.parameters?.find((p) => p.type === 'lottery_meta') || null,
    [fn]
  )
  const lotteryIdParam = useMemo(
    () =>
      fn?.parameters?.find(
        (p) => (p.payloadName || '').toLowerCase() === 'lotteryid'
      ) || null,
    [fn]
  )
  const lotteryIdValue =
    params?.[lotteryIdParam?.name] ??
    params?.[lotteryIdParam?.payloadName || lotteryIdParam?.name]
  const lotteryIdNumber =
    lotteryIdValue === '' || lotteryIdValue === null || lotteryIdValue === undefined
      ? null
      : Number(lotteryIdValue)
  const donationAccountParam = useMemo(
    () =>
      fn?.parameters?.find(
        (p) => (p.payloadName || '').toLowerCase() === 'donationaccount'
      ) || null,
    [fn]
  )
  const donationPercentParam = useMemo(
    () =>
      fn?.parameters?.find(
        (p) => (p.payloadName || '').toLowerCase() === 'donationpercent'
      ) || null,
    [fn]
  )
  const donationAccountValue =
    (donationAccountParam &&
      (params?.[donationAccountParam.name] ??
        params?.[donationAccountParam.payloadName || donationAccountParam.name])) ||
    ''
  const donationPercentValue =
    (donationPercentParam &&
      (params?.[donationPercentParam.name] ??
        params?.[donationPercentParam.payloadName || donationPercentParam.name])) ||
    ''

  const sanitizeNoHash = (val) => String(val || '').replace(/#/g, '')
  const parseLotteryMeta = (raw) => {
    const rawStr = String(raw || '')
    const parts = rawStr.split('###')
    return {
      lotteryPostUrl: parts[0] || '',
      donationPostUrl: parts[1] || '',
      additionalDescription: parts.slice(2).join('###') || '',
    }
  }
  const isSameLotteryMeta = (a, b) =>
    a.lotteryPostUrl === b.lotteryPostUrl &&
    a.donationPostUrl === b.donationPostUrl &&
    a.additionalDescription === b.additionalDescription

  const lotteryMetaFromParams = useMemo(() => {
    if (!lotteryMetaParam) return parseLotteryMeta('')
    const key = lotteryMetaParam.name
    const payloadKey = lotteryMetaParam.payloadName || key
    const raw = params?.[key] ?? params?.[payloadKey] ?? ''
    return parseLotteryMeta(raw)
  }, [lotteryMetaParam, params])

  const hasLotteryDonation =
    (String(donationAccountValue || '').trim().length > 0 &&
      Number(donationPercentValue) > 0) ||
    String(lotteryMetaFromParams.donationPostUrl || '').trim().length > 0
  const showDonationField = hasLotteryDonation

  useEffect(() => {
    if (!lotteryMetaParam) return
    const parsed = lotteryMetaFromParams
    const cleaned = {
      lotteryPostUrl: sanitizeNoHash(parsed.lotteryPostUrl),
      donationPostUrl: sanitizeNoHash(parsed.donationPostUrl),
      additionalDescription: sanitizeNoHash(parsed.additionalDescription),
    }
    setLotteryMetaFields((prev) => (isSameLotteryMeta(prev, cleaned) ? prev : cleaned))
    lotteryMetaInitializedRef.current = true
    lotteryMetaDirtyRef.current = false
  }, [lotteryMetaFromParams, lotteryMetaParam])

  useEffect(() => {
    if (!lotteryMetaParam || !setParams) return
    if (!lotteryMetaInitializedRef.current) return
    if (!lotteryMetaDirtyRef.current) return
    const key = lotteryMetaParam.name
    const payloadKey = lotteryMetaParam.payloadName || key
    const cleaned = {
      lotteryPostUrl: sanitizeNoHash(lotteryMetaFields.lotteryPostUrl),
      donationPostUrl: sanitizeNoHash(lotteryMetaFields.donationPostUrl),
      additionalDescription: sanitizeNoHash(lotteryMetaFields.additionalDescription),
    }
    const effectiveDonation = showDonationField ? cleaned.donationPostUrl : ''
    const combined = [
      cleaned.lotteryPostUrl,
      effectiveDonation,
      cleaned.additionalDescription,
    ].join('###')
    const current = params?.[key] ?? params?.[payloadKey] ?? ''
    if (current === combined) return
    setParams((prev) => ({
      ...prev,
      [key]: combined,
      [payloadKey]: combined,
    }))
    lotteryMetaDirtyRef.current = false
  }, [hasLotteryDonation, lotteryMetaFields, lotteryMetaParam, params, setParams])

  useEffect(() => {
    if (!isCreateLottery || !fn?.parameters?.length || !setParams) return
    const burnParam =
      fn.parameters.find((p) => (p.payloadName || '').toLowerCase() === 'burnpercent') ||
      fn.parameters.find((p) => String(p.name || '').toLowerCase().includes('burn percent'))
    if (!burnParam) return
    const current = params?.[burnParam.name] ?? params?.[burnParam.payloadName || burnParam.name]
    if (current === undefined || current === null || current === '') {
      setParams((prev) => ({
        ...prev,
        [burnParam.name]: '5',
        [burnParam.payloadName || burnParam.name]: '5',
      }))
    }
  }, [isCreateLottery, fn, params, setParams])

  // Fetch DAO projects for dropdowns (via Hasura/urql provider)
  const [{ data: daoData, error: daoError }] = useQuery({
    query: DAO_PROJECTS_QUERY,
    pause: !isDaoContract,
    requestPolicy: 'network-only',
  })

  const [{ data: lotteryTicketData }] = useQuery({
    query: LOTTERY_TICKET_QUERY,
    variables:
      isJoinLottery && Number.isFinite(lotteryIdNumber) ? { id: lotteryIdNumber } : undefined,
    pause: !isJoinLottery || !Number.isFinite(lotteryIdNumber),
    requestPolicy: 'cache-and-network',
  })

  const selectedLotteryTicket = useMemo(() => {
    const entry = lotteryTicketData?.oki_lottery_v2_active?.[0]
    if (!entry) return null
    const priceNum = Number(entry.ticket_price)
    return {
      ticketPrice: Number.isFinite(priceNum) ? priceNum : null,
      asset: entry.asset || 'HIVE',
    }
  }, [lotteryTicketData])

  useEffect(() => {
    if (!isDaoContract) return
    if (daoError) return
    const treasuryRows = daoData?.treasury || []
    const treasuryMap = new Map()
    treasuryRows.forEach((row) => {
      const pid = Number(row.project_id)
      const asset = (row.asset || 'HIVE').toUpperCase()
      const amt = Number(row.amount) || 0
      const signed = row.direction === 'out' ? -amt : amt
      const existing = treasuryMap.get(pid) || {}
      treasuryMap.set(pid, {
        ...existing,
        [asset]: (existing[asset] || 0) + signed,
      })
    })
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
        member_count: 0,
        description: row.description,
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
      if (memberVal && activeVal) existing.member_count += 1
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
        isMember: !!p.member_hit,
        isCreator: userVariants.includes(String(p.created_by || '').toLowerCase()),
        isPublic: p.proposals_members_only === false,
        memberCount: p.member_count || 0,
        description: p.description,
        owner: p.created_by,
        treasuryTotals: treasuryMap.get(p.project_id) || {},
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

  const optionsParam = useMemo(
    () =>
      isProposalCreate
        ? fn?.parameters?.find(
            (p) =>
              (p.payloadName || '').toLowerCase() === 'options' ||
              (p.name || '').toLowerCase().includes('option')
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

  const metaOptions = useMemo(
    () =>
      (metaParam?.metaOptions || []).map((m) => ({
        ...m,
        key: m.key || '',
        hint: m.hint || '',
        staticValue: m.staticValue,
      })),
    [metaParam]
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

  useEffect(() => {
    if (!showNewOptionInput) return
    newOptionInputRef.current?.focus()
  }, [showNewOptionInput])

  useEffect(() => {
    if (editingOptionIndex === null) return
    editingInputRef.current?.focus()
  }, [editingOptionIndex])

  const selectedDaoProject = useMemo(() => {
    if (!projectIdParam) return null
    const pid =
      params[projectIdParam.name] ??
      params[projectIdParam.payloadName || projectIdParam.name]
    if (pid === undefined || pid === null || pid === '') return null
    return daoProjects.find((p) => Number(p.id) === Number(pid)) || null
  }, [daoProjects, params, projectIdParam])

  const proposalIsPoll =
    params?.proposalIsPoll === true || params?.is_poll === true

  const proposalOptions = useMemo(() => {
    const raw = params?.proposalOptions ?? params?.options
    if (Array.isArray(raw)) {
      return raw.filter(Boolean)
    }
    if (typeof raw === 'string') {
      return parseOptionList(raw)
    }
    return []
  }, [params])

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
    if (fn?.name !== 'proposal_create') return
    if (!projectIdParam || !proposalCostParam) return
    const selectedProject =
      params[projectIdParam.name] ??
      params[projectIdParam.payloadName || projectIdParam.name]
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
    const current =
      params[proposalCostParam.name] ??
      params[proposalCostParam.payloadName || proposalCostParam.name]
    if (
      current &&
      Number(current.amount) === Number(desired.amount) &&
      (current.asset || '').toString() === (desired.asset || '').toString()
    ) {
      return
    }
    console.log('[proposal_create] autofill cost', {
      selectedProject,
      desired,
      projectIdParam,
      proposalCostParam,
    })
    setParams((prev) => {
      const next = { ...prev }
      next[proposalCostParam.name] = desired
      next[proposalCostParam.payloadName || proposalCostParam.name] = desired
      return next
    })
  }, [
    daoProjects,
    fn,
    isDaoContract,
    params,
    projectIdParam,
    proposalCostParam,
    setParams,
  ])

  // Pull prefilled project id from session storage as a fallback
  useEffect(() => {
    if (!isProposalCreate || !projectIdParam) return
    try {
      const stored = sessionStorage.getItem(DAO_PROPOSAL_PREFILL_KEY)
      if (stored) {
        const num = Number(stored)
        if (!Number.isNaN(num)) {
          setParams((prev) => {
            const current = prev[projectIdParam.name]
            if (Number(current) === num) return prev
            return {
              ...prev,
              [projectIdParam.name]: num,
              [projectIdParam.payloadName || projectIdParam.name]: num,
            }
          })
        }
        sessionStorage.removeItem(DAO_PROPOSAL_PREFILL_KEY)
      }
    } catch {}
  }, [isProposalCreate, projectIdParam, params, setParams])

  useEffect(() => {
    if (!optionsParam) return
    if (forcePollActive) return
    if (
      params[optionsParam.name] ||
      params[optionsParam.payloadName || optionsParam.name]
    ) {
      setParams((prev) => ({
        ...prev,
        [optionsParam.name]: '',
        [optionsParam.payloadName || optionsParam.name]: '',
      }))
    }
    setShowNewOptionInput(false)
    setNewOptionText('')
    setEditingOptionIndex(null)
    setEditingText('')
  }, [forcePollActive, optionsParam, params, setParams])

  useEffect(() => {
    if (!forcePollActive) return
    setPayoutReceiver('')
    setPayoutAmount('')
    setEditingPayoutIndex(null)
    setEditingReceiver('')
    setEditingAmount('')
    setMetaKey('')
    setMetaValue('')
    setEditingMetaIndex(null)
    setEditingMetaKey('')
    setEditingMetaValue('')
  }, [forcePollActive])

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
    const formatThreeDecimals = (val) => {
      const num = parseFloat(String(val).replace(',', '.'))
      if (!Number.isFinite(num)) return ''
      return num.toFixed(3)
    }
    const isOptionsField =
      isProposalCreate &&
      optionsParam &&
      p === optionsParam
    const isPollField = isProposalCreate && forcePollParam && p === forcePollParam
    const isPayoutField = isProposalCreate && payoutsParam && p === payoutsParam
    const isMetaField = isProposalCreate && metaParam && p === metaParam
    const isCoreProposalField = isOptionsField || isPollField || isPayoutField || isMetaField
    const customLabel =
      (isPollField && 'Poll') ||
      (isOptionsField && 'Options') ||
      (isPayoutField && 'Payouts') ||
      (isMetaField && 'Meta') ||
      p.name
    const labelText = `${customLabel}${(p.mandatory || isCoreProposalField) ? ' *' : ''}`
    const isWinnerSharesField =
      fn?.name === 'create_lottery' &&
      (((p.payloadName || '').toLowerCase() === 'winnershares') ||
        (p.name || '').toLowerCase().includes('winner shares'))

    if (isWinnerSharesField) {
      const rawVal = params[p.name] ?? params[p.payloadName || p.name] ?? ''
      const shareList = String(rawVal)
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => b - a)
      const total = shareList.reduce((sum, n) => sum + n, 0)
      const remaining = 100 - total
      const shareInputStyle = {
        background: 'transparent',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        padding: '6px 8px',
      }

      const updateShares = (nextList) => {
        const sanitized = nextList
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => b - a)
        const serialized = sanitized.join(',')
        setParams((prev) => ({
          ...prev,
          [p.name]: serialized,
          [p.payloadName || p.name]: serialized,
        }))
      }

      const confirmNewShare = () => {
        const nextVal = parseInt(String(newShareText).trim(), 10)
        if (!Number.isFinite(nextVal) || nextVal <= 0) return
        updateShares([...shareList, nextVal])
        setNewShareText('')
        setShowNewShareInput(false)
      }

      const confirmEditShare = () => {
        if (editingShareIndex === null) return
        const nextVal = parseInt(String(editingShareText).trim(), 10)
        if (!Number.isFinite(nextVal) || nextVal <= 0) return
        const next = [...shareList]
        next[editingShareIndex] = nextVal
        updateShares(next)
        setEditingShareIndex(null)
        setEditingShareText('')
      }

      const removeShare = (idx) => {
        const next = shareList.filter((_, i) => i !== idx)
        updateShares(next)
        if (editingShareIndex === idx) {
          setEditingShareIndex(null)
          setEditingShareText('')
        }
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ color: 'var(--color-primary-lighter)', fontSize: '0.95rem' }}>
            {labelText}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {shareList.length === 0 ? (
              <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.8, fontSize: '0.9rem' }}>
                No shares yet.
              </span>
            ) : (
              shareList.map((share, idx) =>
                editingShareIndex === idx ? (
                  <div
                    key={`share-edit-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--color-primary-darkest)',
                      padding: '6px 8px',
                    }}
                  >
                    <input
                      ref={(el) => {
                        if (idx === editingShareIndex) editingShareInputRef.current = el
                      }}
                      type="number"
                      inputMode="numeric"
                      value={editingShareText}
                      onChange={(e) => setEditingShareText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          confirmEditShare()
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--color-primary-darkest)',
                        color: 'var(--color-primary-lighter)',
                        padding: '4px 6px',
                        width: '80px',
                      }}
                    />
                    <span style={{ color: 'var(--color-primary-lighter)' }}>%</span>
                    <button
                      onClick={confirmEditShare}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                      }}
                      title="Confirm share"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                      onClick={() => removeShare(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete share"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`share-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      border: '1px solid var(--color-primary-darkest)',
                      background: 'rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setEditingShareIndex(idx)
                      setEditingShareText(String(share))
                    }}
                    title="Click to edit"
                  >
                    <span style={{ color: 'var(--color-primary-lighter)' }}>{share}%</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeShare(idx)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete share"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )
              )
            )}
          </div>
          <div style={{ color: total === 100 ? 'var(--color-primary)' : 'var(--color-primary-lighter)', fontSize: '0.85rem', opacity: total === 100 ? 1 : 0.8 }}>
            Total: {total}% {total === 100 ? '' : `(${remaining}% remaining)`}
          </div>
          {showNewShareInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={newShareInputRef}
                type="number"
                inputMode="numeric"
                placeholder="Share %"
                value={newShareText}
                onChange={(e) => setNewShareText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmNewShare()
                  }
                }}
                style={{
                  ...shareInputStyle,
                  width: '120px',
                }}
              />
              <button
                onClick={confirmNewShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: '1px solid var(--color-primary-darkest)',
                  color: newShareText.trim() ? 'var(--color-primary)' : 'gray',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
                title="Add share"
              >
                <FontAwesomeIcon icon={faPlusCircle} />
                <span>Add</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewShareInput(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--color-primary-darkest)',
                color: 'var(--color-primary-lighter)',
                padding: '6px 10px',
                cursor: 'pointer',
              }}
              title="Add share"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Add share</span>
            </button>
          )}
        </div>
      )
    }

    if (isDaoProjectCreate && p.payloadName === 'votingSystem') {
      return renderDaoSwitch(p, 'Democratic', 'Stake-based')
    }

    if (isDaoProjectCreate && p.payloadName === 'creatorRestriction') {
      return renderDaoSwitch(p, 'Members', 'Public')
    }

    const isLotteryTicketPrice =
      fn?.name === 'create_lottery' &&
      (p.payloadName || '').toLowerCase() === 'ticketprice'

    if (isLotteryTicketPrice) {
      const formatTicketPrice = (val) => {
        const num = parseFloat(String(val).replace(',', '.'))
        if (!Number.isFinite(num)) return ''
        return num.toFixed(3)
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FloatingLabelInput
            label={labelText}
            type="number"
            value={params[p.name] ?? ''}
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
                    const formatted = formatTicketPrice(clamped)
                    if (formatted && formatted !== e.target.value) {
                      setParams((prev) => ({
                        ...prev,
                        [p.name]: formatted,
                      }))
                    }
                  }
                : undefined
            }
            min={p.min}
            max={p.max}
            step="0.001"
            style={{ marginTop: '4px' }}
          />
          <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.9, marginTop: '4px' }}>HIVE</span>
        </div>
      )
    }

    if (p.type === 'lottery_meta') {
      const updateField = (field) => (e) => {
        const nextVal = sanitizeNoHash(e.target.value)
        lotteryMetaDirtyRef.current = true
        setLotteryMetaFields((prev) => ({ ...prev, [field]: nextVal }))
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <FloatingLabelInput
            label="Lottery Post URL"
            type="text"
            placeholder="https://example.com"
            value={lotteryMetaFields.lotteryPostUrl}
            onChange={updateField('lotteryPostUrl')}
            style={{ marginTop: '4px' }}
          />
          {showDonationField && (
            <FloatingLabelInput
              label="Donation Post URL"
              type="text"
              placeholder="https://example.com"
              value={lotteryMetaFields.donationPostUrl}
              onChange={updateField('donationPostUrl')}
              style={{ marginTop: '4px' }}
            />
          )}
          <FloatingLabelInput
            label="Additional Description"
            type="text"
            placeholder="Optional details"
            value={lotteryMetaFields.additionalDescription}
            onChange={updateField('additionalDescription')}
            style={{ marginTop: '4px' }}
          />
        </div>
      )
    }

    // DAO project selector
    const isProjectIdField =
      isDaoContract &&
      ((p.name || '').toLowerCase().includes('project id') ||
        (p.payloadName || '').toLowerCase() === 'projectid')

    if (isProjectIdField) {
      const rawVal = params[p.name] ?? params[p.payloadName] ?? ''
      const value =
        rawVal === null || rawVal === undefined || rawVal === ''
          ? ''
          : String(rawVal)
      const optionLabel = (proj) => {
        let badge = ''
        if (proj.isMember) badge = 'Member'
        else if (proj.isCreator) badge = 'Creator'
        else if (proj.isPublic) badge = 'Public'
        return `${proj.name} (#${proj.id})${badge ? ' — ' + badge : ''}`
      }
      const optionSubtitle = (proj) => {
        const fmtCost = (val) => {
          const num = Number(val)
          return Number.isFinite(num) ? num.toFixed(3) : '?'
        }
        const fmtTreasury = () => {
          const totals = proj.treasuryTotals || {}
          const entries = Object.entries(totals).filter(([, v]) => Number.isFinite(v))
          if (!entries.length) return null
          return (
            'Treasury: ' +
            entries
              .map(([asset, amt]) => `${amt.toFixed(3)} ${asset}`)
              .join(' • ')
          )
        }
        const parts = []
        if (proj.description) parts.push(proj.description)
        if (proj.owner) parts.push(`Owner: ${proj.owner}`)
        parts.push(`Members: ${proj.memberCount ?? 0}`)
        const treasuryStr = fmtTreasury()
        if (treasuryStr) parts.push(treasuryStr)
        const asset = proj.asset || 'HIVE'
        if (proj.proposal_cost !== undefined && proj.proposal_cost !== null) {
          parts.push(`Proposal cost: ${fmtCost(proj.proposal_cost)} ${asset}`)
        }
        return parts.join(' • ')
      }
      return (
        <NeonListDropdown
          value={value}
          onChange={(val) => {
            const numericVal = Number(val)
            setParams((prev) => {
              const next = {
                ...prev,
                [p.name]: numericVal,
                [p.payloadName || p.name]: numericVal,
              }
              if (fn?.name === 'proposal_create' && proposalCostParam) {
                const proj = daoProjects.find((d) => Number(d.id) === Number(numericVal))
                if (proj && proj.proposal_cost !== undefined && proj.proposal_cost !== null) {
                  const desired = {
                    amount: Number(proj.proposal_cost || 0).toFixed(3),
                    asset: proj.asset,
                  }
                  next[proposalCostParam.name] = desired
                  next[proposalCostParam.payloadName || proposalCostParam.name] = desired
                  console.log('[proposal_create] dropdown autofill cost', { numericVal, desired })
                }
              }
              return next
            })
          }}
          placeholder={daoProjects.length ? 'Select a DAO' : 'No accessible DAOs found'}
          options={daoProjects.map((proj) => ({
            value: String(proj.id),
            label: optionLabel(proj),
            subtitle: optionSubtitle(proj),
          }))}
          showCheck
        />
      )
    }

    // Lottery dropdown selector
    if (p.type === 'lotteryDropdown') {
      const rawVal = params[p.name] ?? params[p.payloadName] ?? ''
      const value =
        rawVal === null || rawVal === undefined || rawVal === ''
          ? ''
          : String(rawVal)

      return (
        <LotteryDropdown
          value={value}
          onChange={(val) => {
            const numericVal = Number(val)
            setParams((prev) => ({
              ...prev,
              [p.name]: numericVal,
              [p.payloadName || p.name]: numericVal,
            }))
          }}
          param={p}
          placeholder={p.hintText || 'Select an active lottery'}
        />
      )
    }

    if (isOptionsField) {
      const optionsList = String(
        params[p.name] ??
          params[p.payloadName || p.name] ??
          ''
      )
        .split(';')
        .map((o) => o.trim())
        .filter(Boolean)

      const updateOptions = (nextList) => {
        const serialized = nextList.join(';')
        setParams((prev) => ({
          ...prev,
          [p.name]: serialized,
          [p.payloadName || p.name]: serialized,
        }))
      }

      const confirmNewOption = () => {
        const trimmed = newOptionText.trim()
        if (!trimmed) return
        updateOptions([...optionsList, trimmed])
        setNewOptionText('')
        setShowNewOptionInput(false)
      }

      const confirmEditOption = () => {
        if (editingOptionIndex === null) return
        const trimmed = editingText.trim()
        const next = [...optionsList]
        next[editingOptionIndex] = trimmed || optionsList[editingOptionIndex]
        updateOptions(next.filter(Boolean))
        setEditingOptionIndex(null)
        setEditingText('')
      }

      const removeOption = (idx) => {
        const next = optionsList.filter((_, i) => i !== idx)
        updateOptions(next)
        if (editingOptionIndex === idx) {
          setEditingOptionIndex(null)
          setEditingText('')
        }
      }

      if (!forcePollActive) return null

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {optionsList.length === 0 ? (
              <span
                style={{
                  color: 'var(--color-primary-lighter)',
                  opacity: 0.8,
                  fontSize: '0.9rem',
                }}
              >
                No options yet.
              </span>
            ) : (
              optionsList.map((opt, idx) =>
                editingOptionIndex === idx ? (
                  <div
                    key={`opt-edit-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--color-primary-darkest)',
                     
                      padding: '6px 8px',
                    }}
                  >
                    <input
                      ref={(el) => {
                        if (idx === editingOptionIndex) editingInputRef.current = el
                      }}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          confirmEditOption()
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--color-primary-darkest)',
                        color: 'var(--color-primary-lighter)',
                        padding: '4px 6px',
                        minWidth: '140px',
                      }}
                    />
                    <button
                      onClick={confirmEditOption}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                      }}
                      title="Confirm option"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                      onClick={() => removeOption(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete option"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`opt-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--color-primary-darkest)',
                     
                      padding: '6px 8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setEditingOptionIndex(idx)
                      setEditingText(opt)
                    }}
                    title="Click to edit"
                  >
                    <span>{opt}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeOption(idx)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete option"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )
              )
            )}
          </div>

          {showNewOptionInput ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--color-primary-darkest)',
               
                padding: '6px 8px',
              }}
            >
              <input
                ref={newOptionInputRef}
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmNewOption()
                  }
                }}
                placeholder="New option"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-primary-darkest)',
                  color: 'var(--color-primary-lighter)',
                  padding: '4px 6px',
                  minWidth: '140px',
                }}
              />
              <button
                onClick={confirmNewOption}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
                title="Add option"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewOptionInput(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--color-primary-darkest)',
                color: 'var(--color-primary)',
                padding: '6px 10px',
                cursor: 'pointer',
               
              }}
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Add option</span>
            </button>
          )}
        </div>
      )
    }

    if (isMetaField) {
      const metaStr = String(
        params[p.name] ??
          params[p.payloadName || p.name] ??
          ''
      )
      const metaList = metaStr
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const sep = entry.indexOf('=')
          if (sep === -1) return null
          const rawKey = entry.slice(0, sep)
          const displayKey = rawKey.startsWith('update_') ? rawKey.slice(7) : rawKey
          return {
            key: displayKey,
            value: entry.slice(sep + 1),
          }
        })
        .filter(Boolean)

      const applyMetaPayloadKey = (key) =>
        key.startsWith('update_') ? key : `update_${key}`

      const updateMeta = (nextList) => {
        const serialized = nextList
          .filter((e) => e.key && e.value)
          .map((e) => `${applyMetaPayloadKey(e.key)}=${e.value}`)
          .join(';')
        setParams((prev) => ({
          ...prev,
          [p.name]: serialized,
          [p.payloadName || p.name]: serialized,
        }))
      }

      const availableOptionsForAdd = metaOptions.filter(
        (opt) => !metaList.some((entry) => entry.key === opt.key)
      )

      const availableOptionsForEdit = metaOptions.filter((opt) => {
        if (editingMetaIndex === null) return !metaList.some((entry) => entry.key === opt.key)
        const currentKey = metaList[editingMetaIndex]?.key
        if (currentKey === opt.key) return true
        return !metaList.some((entry) => entry.key === opt.key)
      })

      const metaTypeForKey = (key) =>
        (metaOptions.find((m) => m.key === key)?.type || 'string').toLowerCase()

      const metaHintForKey = (key) =>
        metaOptions.find((m) => m.key === key)?.hint || ''

      const metaStaticValueForKey = (key) =>
        metaOptions.find((m) => m.key === key)?.staticValue

      const normalizeAccount = (val) => {
        let next = String(val || '').replace(/@/g, '')
        if (!next.startsWith('hive:') && next.trim() !== '') {
          next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
        }
        return next
      }

      const renderMetaValueInput = (currentKey, currentValue, setValue) => {
        const type = metaTypeForKey(currentKey)
        const staticVal = metaStaticValueForKey(currentKey)
        if (staticVal !== undefined) {
          return (
            <span
              style={{
                ...baseInputStyle,
                minWidth: '140px',
                border: '1px dashed var(--color-primary-darkest)',
              }}
            >
              {staticVal}
            </span>
          )
        }

        if (type === 'bool') {
          const checked = String(currentValue).toLowerCase() === 'true'
          return (
            <NeonSwitch
              name=""
              checked={checked}
              onChange={(val) => setValue(val ? 'true' : 'false')}
            />
          )
        }

        if (type === 'account') {
          return (
            <input
              type="text"
              value={normalizeAccount(currentValue)}
              onChange={(e) => setValue(normalizeAccount(e.target.value))}
              onBlur={(e) => setValue(normalizeAccount(e.target.value))}
              placeholder="hive:user"
              style={{ ...baseInputStyle, minWidth: '140px' }}
            />
          )
        }

        if (type === 'int') {
          const handleChange = (e) => {
            const val = e.target.value
            if (/^-?\d*$/.test(val)) setValue(val)
          }
          const handleBlur = (e) => {
            const val = e.target.value
            const num = parseInt(val, 10)
            if (Number.isFinite(num)) setValue(String(num))
          }
          return (
            <input
              type="number"
              step="1"
              value={currentValue}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0"
              style={{ ...baseInputStyle, minWidth: '140px' }}
            />
          )
        }

        if (type === 'float') {
          const handleChange = (e) => {
            const val = e.target.value.replace(',', '.')
            if (/^-?\d*(\.\d*)?$/.test(val)) setValue(val)
          }
          const handleBlur = (e) => {
            const val = e.target.value.replace(',', '.')
            const num = parseFloat(val)
            if (Number.isFinite(num)) setValue(String(num))
          }
          return (
            <input
              type="text"
              inputMode="decimal"
              value={currentValue}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.0"
              style={{ ...baseInputStyle, minWidth: '140px' }}
            />
          )
        }

        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setValue(e.target.value)}
            placeholder="value"
            style={{ ...baseInputStyle, minWidth: '140px' }}
          />
        )
      }

      const validateValue = (key, val) => {
        const type = metaTypeForKey(key)
        if (metaStaticValueForKey(key) !== undefined) return true
        if (type === 'bool') {
          const v = String(val).toLowerCase()
          return v === 'true' || v === 'false'
        }
        if (type === 'account') return normalizeAccount(val).trim().length > 0
        if (type === 'int') return /^-?\d+$/.test(String(val))
        if (type === 'float') return /^-?\d+(?:\.\d+)?$/.test(String(val))
        return String(val).trim().length > 0
      }

      const normalizeValue = (key, val) => {
        const type = metaTypeForKey(key)
        const staticVal = metaStaticValueForKey(key)
        if (staticVal !== undefined && staticVal !== null) return String(staticVal)
        if (type === 'account') return normalizeAccount(val).trim()
        if (type === 'bool') return String(val).toLowerCase() === 'true' ? 'true' : 'false'
        if (type === 'int') return String(parseInt(val, 10))
        if (type === 'float') {
          const num = parseFloat(val)
          return Number.isFinite(num) ? String(num) : ''
        }
        return String(val).trim()
      }

      const confirmNewMeta = () => {
        const key = (metaKey || '').trim()
        const rawVal = (metaValue || '').trim() || metaStaticValueForKey(key) || ''
        const val = metaTypeForKey(key) === 'account' ? normalizeAccount(rawVal) : rawVal
        if (!key || !validateValue(key, val)) return
        updateMeta([...metaList, { key, value: normalizeValue(key, val) }])
        setMetaKey('')
        if (!metaStaticValueForKey(key)) setMetaValue('')
      }

      const confirmEditMeta = () => {
        if (editingMetaIndex === null) return
        const key = (editingMetaKey || '').trim()
        const rawVal =
          (editingMetaValue || '').trim() || metaStaticValueForKey(key) || ''
        const val = metaTypeForKey(key) === 'account' ? normalizeAccount(rawVal) : rawVal
        if (!key || !validateValue(key, val)) return
        const next = [...metaList]
        next[editingMetaIndex] = { key, value: normalizeValue(key, val) }
        updateMeta(next)
        setEditingMetaIndex(null)
        if (!metaStaticValueForKey(key)) setEditingMetaValue('')
      }

      const removeMeta = (idx) => {
        const next = metaList.filter((_, i) => i !== idx)
        updateMeta(next)
        if (editingMetaIndex === idx) {
          setEditingMetaIndex(null)
          setEditingMetaKey('')
          setEditingMetaValue('')
        }
      }

      const baseInputStyle = {
        background: 'transparent',
        border: '1px solid var(--color-primary-darkest)',
       
        color: 'var(--color-primary-lighter)',
        padding: '6px 8px',
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {metaList.length === 0 ? (
              <span
                style={{
                  color: 'var(--color-primary-lighter)',
                  opacity: 0.8,
                  fontSize: '0.9rem',
                }}
              >
                No meta entries yet.
              </span>
            ) : (
              metaList.map((entry, idx) =>
                editingMetaIndex === idx ? (
                  <div
                    key={`meta-edit-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {availableOptionsForEdit.length ? (
                      <NeonListDropdown
                        value={editingMetaKey}
                        onChange={(val) => setEditingMetaKey(val)}
                        placeholder="Select meta key"
                        options={availableOptionsForEdit.map((opt) => ({
                          value: opt.key,
                          label: `${opt.key} (${opt.type})`,
                          subtitle: metaHintForKey(opt.key),
                        }))}
                        style={{ minWidth: '160px' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editingMetaKey}
                        onChange={(e) => setEditingMetaKey(e.target.value)}
                        placeholder="key"
                        style={{ ...baseInputStyle, minWidth: '140px' }}
                      />
                    )}
                    {renderMetaValueInput(
                      editingMetaKey,
                      editingMetaValue,
                      setEditingMetaValue
                    )}
                    <button
                      onClick={confirmEditMeta}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color:
                          editingMetaKey &&
                          (metaStaticValueForKey(editingMetaKey) !== undefined || editingMetaValue)
                            ? 'var(--color-primary)'
                            : 'gray',
                        cursor: 'pointer',
                      }}
                      title="Confirm meta"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                      onClick={() => removeMeta(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete meta"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`meta-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      border: '1px solid var(--color-primary-darkest)',
                     
                      background: 'rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                      flexWrap: 'wrap',
                    }}
                    onClick={() => {
                      setEditingMetaIndex(idx)
                      setEditingMetaKey(entry.key)
                      setEditingMetaValue(entry.value)
                    }}
                    title="Click to edit"
                  >
                    <span style={{ color: 'var(--color-primary-lighter)' }}>{entry.key}</span>
                    <span style={{ color: 'var(--color-primary)' }}>= {entry.value}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeMeta(idx)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete meta"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )
              )
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            {availableOptionsForAdd.length ? (
              <NeonListDropdown
                value={metaKey}
                onChange={(val) => setMetaKey(val)}
                placeholder="Select meta key"
                options={availableOptionsForAdd.map((opt) => ({
                  value: opt.key,
                  label: `${opt.key} (${opt.type})`,
                  subtitle: metaHintForKey(opt.key),
                }))}
                style={{ minWidth: '160px' }}
                title={metaHintForKey(metaKey)}
              />
            ) : metaOptions.length ? (
              <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.8, fontSize: '0.9rem' }}>
                All meta options are already added.
              </span>
            ) : (
              <input
                type="text"
                placeholder="key"
                value={metaKey}
                onChange={(e) => setMetaKey(e.target.value)}
                style={{ ...baseInputStyle, minWidth: '140px' }}
              />
            )}
            {metaKey ? renderMetaValueInput(metaKey, metaValue, setMetaValue) : null}
            {metaHintForKey(metaKey) && (
              <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.85rem', opacity: 0.8, width: '100%' }}>
                {metaHintForKey(metaKey)}
              </span>
            )}
            <button
              onClick={confirmNewMeta}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--color-primary-darkest)',
                color:
                  metaKey &&
                  (metaStaticValueForKey(metaKey) !== undefined || metaValue)
                    ? 'var(--color-primary)'
                    : 'gray',
                padding: '6px 10px',
                cursor: 'pointer',
               
              }}
              title="Add meta"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Add meta</span>
            </button>
          </div>
        </div>
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

    const isDaoVote = fn?.name === 'proposals_vote'
    const isDaoVoteChoices =
      isDaoVote &&
      ((p.payloadName || '').toLowerCase() === 'choices' ||
        (p.name || '').toLowerCase().includes('choice'))

    if (isDaoVoteChoices) {
      const fieldName = p.payloadName || p.name
      const rawVal = params[p.name] ?? params[fieldName] ?? ''

      if (proposalIsPoll) {
        const options = proposalOptions.map((label, idx) => ({
          label,
          value: String(idx),
        }))
        return (
          <NeonListDropdown
            placeholder="Select choice"
            value={String(rawVal)}
            options={options}
            onChange={(val) =>
              setParams((prev) => ({
                ...prev,
                [p.name]: val === null || val === undefined ? '' : String(val),
                [fieldName]: val === null || val === undefined ? '' : String(val),
              }))
            }
          />
        )
      } else {
        const normalized = String(rawVal).toLowerCase()
        const checked = normalized === '1' || normalized === 'true'
        const setChoice = (val) =>
          setParams((prev) => ({
            ...prev,
            [p.name]: val ? '1' : '0',
            [fieldName]: val ? '1' : '0',
          }))
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
              No
            </span>
            <NeonSwitch name="" checked={checked} onChange={setChoice} />
            <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
              Yes
            </span>
          </div>
        )
      }
    }

    if (p.type === 'bool') {
      const falseLabel =
        p.displayFalse ??
        p.DisplayFalse ??
        p.displayfalse ??
        p.display_false ??
        p.boolFalse ??
        null
      const trueLabel =
        p.displayTrue ??
        p.DisplayTrue ??
        p.displaytrue ??
        p.display_true ??
        p.boolTrue ??
        null
     const switchControl = (
       <NeonSwitch
         name=""
         checked={!!params[p.name]}
         onChange={(val) =>
            setParams((prev) => ({ ...prev, [p.name]: val }))
          }
        />
      )
      if (!falseLabel && !trueLabel) return switchControl
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {falseLabel ? (
            <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
              {falseLabel}
            </span>
          ) : null}
          {switchControl}
          {trueLabel ? (
            <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
              {trueLabel}
            </span>
          ) : null}
        </div>
      )
    }

    if (isPayoutField) {
      const payoutStr = String(
        params[p.name] ??
          params[p.payloadName || p.name] ??
          ''
      )
      const payoutList = payoutStr
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const sep = entry.lastIndexOf(':')
          if (sep === -1) return null
          return {
            receiver: entry.slice(0, sep),
            amount: entry.slice(sep + 1),
          }
        })
        .filter(Boolean)

      const normalizeReceiver = (val) => {
        let next = val.replace(/@/g, '')
        if (!next.startsWith('hive:') && next.trim() !== '') {
          next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
        }
        return next
      }

      const sanitizePayoutEntry = (entry) => {
        const receiver = normalizeReceiver(entry?.receiver || '').trim()
        const amount = String(entry?.amount || '').trim()
        return receiver && amount ? { receiver, amount } : null
      }

      const updatePayouts = (nextList) => {
        const sanitized = nextList
          .map((e) => sanitizePayoutEntry(e))
          .filter(Boolean)
        const serialized = sanitized.map((e) => `${e.receiver}:${e.amount}`).join(';')
        setParams((prev) => ({
          ...prev,
          [p.name]: serialized,
          [p.payloadName || p.name]: serialized,
        }))
      }

      const isValidAmount = (val) => /^\d+(?:\.\d{3})$/.test(val)

      const confirmNewPayout = () => {
        const receiver = normalizeReceiver(payoutReceiver).trim()
        const amount = payoutAmount.trim()
        if (!receiver || !isValidAmount(amount)) return
        updatePayouts([...payoutList, { receiver, amount }])
        setPayoutReceiver('')
        setPayoutAmount('')
      }

      const confirmEditPayout = () => {
        if (editingPayoutIndex === null) return
        const receiver = normalizeReceiver(editingReceiver).trim()
        const amount = editingAmount.trim()
        if (!receiver || !isValidAmount(amount)) return
        const next = [...payoutList]
        next[editingPayoutIndex] = { receiver, amount }
        updatePayouts(next)
        setEditingPayoutIndex(null)
        setEditingReceiver('')
        setEditingAmount('')
      }

      const removePayout = (idx) => {
        const next = payoutList.filter((_, i) => i !== idx)
        updatePayouts(next)
        if (editingPayoutIndex === idx) {
          setEditingPayoutIndex(null)
          setEditingReceiver('')
          setEditingAmount('')
        }
      }

      const assetLabel =
        (selectedDaoProject?.asset || 'HIVE').toUpperCase()

      const amountInputStyle = {
        background: 'transparent',
        border: '1px solid var(--color-primary-darkest)',
       
        color: 'var(--color-primary-lighter)',
        padding: '6px 8px',
        minWidth: '100px',
      }

      const addressInputStyle = {
        background: 'transparent',
        border: '1px solid var(--color-primary-darkest)',
       
        color: 'var(--color-primary-lighter)',
        padding: '6px 8px',
        minWidth: '200px',
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {payoutList.length === 0 ? (
              <span
                style={{
                  color: 'var(--color-primary-lighter)',
                  opacity: 0.8,
                  fontSize: '0.9rem',
                }}
              >
                No payouts yet.
              </span>
            ) : (
              payoutList.map((entry, idx) =>
                editingPayoutIndex === idx ? (
                  <div
                    key={`payout-edit-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      type="text"
                      value={editingReceiver}
                      onChange={(e) =>
                        setEditingReceiver(normalizeReceiver(e.target.value))
                      }
                      onBlur={(e) => setEditingReceiver(normalizeReceiver(e.target.value))}
                      placeholder="hive:user"
                      style={addressInputStyle}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.000"
                        value={editingAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.')
                          if (/^\d*(\.\d{0,3})?$/.test(val)) {
                            setEditingAmount(val)
                          }
                        }}
                        onBlur={(e) => setEditingAmount(formatThreeDecimals(e.target.value))}
                        style={amountInputStyle}
                      />
                      <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
                        {assetLabel}
                      </span>
                    </div>
                    <button
                      onClick={confirmEditPayout}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isValidAmount(editingAmount) && editingReceiver ? 'var(--color-primary)' : 'gray',
                        cursor: 'pointer',
                      }}
                      title="Confirm payout"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                      onClick={() => removePayout(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete payout"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`payout-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      border: '1px solid var(--color-primary-darkest)',
                     
                      background: 'rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                      flexWrap: 'wrap',
                    }}
                    onClick={() => {
                      setEditingPayoutIndex(idx)
                      setEditingReceiver(entry.receiver)
                      setEditingAmount(entry.amount)
                    }}
                    title="Click to edit"
                  >
                    <span style={{ color: 'var(--color-primary-lighter)' }}>
                      {entry.receiver}
                    </span>
                    <span style={{ color: 'var(--color-primary)' }}>
                      {entry.amount} {assetLabel}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removePayout(idx)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                      }}
                      title="Delete payout"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )
              )
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="hive:user"
              value={payoutReceiver}
              onChange={(e) => setPayoutReceiver(normalizeReceiver(e.target.value))}
              onBlur={(e) => setPayoutReceiver(normalizeReceiver(e.target.value))}
              style={addressInputStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.000"
                value={payoutAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.')
                  if (/^\d*(\.\d{0,3})?$/.test(val)) {
                    setPayoutAmount(val)
                  }
                }}
                onBlur={(e) => setPayoutAmount(formatThreeDecimals(e.target.value))}
                style={amountInputStyle}
              />
              <span style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
                {assetLabel}
              </span>
            </div>
            <button
              onClick={confirmNewPayout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--color-primary-darkest)',
                color: isValidAmount(payoutAmount) && payoutReceiver ? 'var(--color-primary)' : 'gray',
                padding: '6px 10px',
                cursor: 'pointer',
               
              }}
              title="Add payout"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Add payout</span>
            </button>
          </div>
        </div>
      )
    }

    if (p.type === 'vscIntent') {
      const current = params[p.name] ?? { amount: '', asset: 'HIVE' }
      const available =
        current.asset === 'HIVE' ? balances.hive : balances.hbd

      const parsed = parseFloat(String(current.amount || '').replace(',', '.'))
      const exceeds = !isNaN(parsed) && parsed > available
      const ticketEstimate =
        isJoinLottery &&
        selectedLotteryTicket?.ticketPrice &&
        Number.isFinite(parsed) &&
        parsed > 0
          ? Math.floor(parsed / selectedLotteryTicket.ticketPrice)
          : null
      const ticketEstimateLabel =
        ticketEstimate !== null && Number.isFinite(ticketEstimate)
          ? String(ticketEstimate)
          : null
      const ticketAsset =
        selectedLotteryTicket?.asset
          ? String(selectedLotteryTicket.asset).toUpperCase()
          : 'HIVE'

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
              value={current.amount}
              onChange={onAmountChange}
              onBlur={onAmountBlur}
              style={{
                flex: '0 0 50%',
                borderColor: exceeds ? 'red' : 'var(--color-primary-darkest)',
                boxShadow: exceeds ? '0 0 8px red' : 'none',
              }}
            />

            {isJoinLottery ? (
              <div
                style={{
                  flex: '0 0 20%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-primary-lighter)',
                  fontSize: '0.9rem',
                }}
              >
                <span>HIVE</span>
                <GamblingInfoIcon size={16} context="lottery" />
              </div>
            ) : (
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
                  border: '1px solid var(--color-primary-darkest)',
                }}
              >
                <option value="HIVE">HIVE</option>
                <option value="HBD">HBD</option>
              </select>
            )}

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
          {isJoinLottery && selectedLotteryTicket?.ticketPrice && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-lighter)' }}>
              Tickets: {ticketEstimateLabel ?? '—'} for {selectedLotteryTicket.ticketPrice} {ticketAsset} each
            </div>
          )}
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
          style={{ marginTop: '4px' }}
        />
      )
    }

    if (p.type === 'int') {
      const value = params[p.name] ?? ''
      const handleChange = (e) => {
        const raw = e.target.value
        let sanitized = raw.replace(/[^\d-]/g, '')
        if (sanitized.includes('-')) {
          sanitized = (sanitized.startsWith('-') ? '-' : '') + sanitized.replace(/-/g, '')
        }
        if (sanitized === '' || /^-?\d+$/.test(sanitized)) {
          setParams((prev) => ({ ...prev, [p.name]: sanitized }))
        }
      }
      const handleBlur = (e) => {
        if (e.target.value === '') return
        const clamped = clampNumber(e.target.value, p.min, p.max)
        if (Number.isFinite(clamped)) {
          const normalized = Math.trunc(clamped).toString()
          if (normalized !== e.target.value) {
            setParams((prev) => ({ ...prev, [p.name]: normalized }))
          }
        }
      }
      return (
        <FloatingLabelInput
          label={labelText}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          min={p.min}
          max={p.max}
          style={{ marginTop: '4px' }}
        />
      )
    }

    if (p.type === 'url') {
      const value = params[p.name] ?? ''
      const isValidUrl = (val) => {
        try {
          const url = new URL(val)
          return !!url.protocol && !!url.host
        } catch {
          return false
        }
      }
      const valid = value === '' || isValidUrl(value)
      return (
        <FloatingLabelInput
          label={labelText}
          type="text"
          placeholder="https://example.com"
          value={value}
          onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
          style={{
            marginTop: '4px',
            borderColor: valid ? undefined : 'red',
            boxShadow: valid ? 'none' : '0 0 8px red',
          }}
        />
      )
    }

    return (
      <FloatingLabelInput
        label={labelText}
        type={p.type === 'number' ? 'number' : 'text'}
        value={params[p.name] ?? ''}
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
    const isOptionsField =
      isProposalCreate &&
      optionsParam &&
      p === optionsParam

    if (
      isProposalCreate &&
      forcePollActive &&
      (p === payoutsParam || p === metaParam)
    ) {
      return null
    }
    if (isOptionsField && !forcePollActive) return null
    const hint = (p.hintText || '').trim()
    const labelText = `${p.name}${p.mandatory ? ' *' : ''}`
    return (
      <div key={p.name} style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {renderParamInput(p)}
        </div>
        {hint && (
          <InfoIcon
            tooltip={hint}
            size={16}
            style={{ marginTop: '0' }}
          />
        )}
      </div>
    )
  }

  const parameters = useMemo(() => {
    const list = fn?.parameters ?? []
    return [...list].sort((a, b) => {
      const aIndex = a?.sortIndex ?? Number.MAX_SAFE_INTEGER
      const bIndex = b?.sortIndex ?? Number.MAX_SAFE_INTEGER
      if (aIndex !== bIndex) return aIndex - bIndex
      return (a?.name || '').localeCompare(b?.name || '')
    })
  }, [fn])
  const supportsOptionalGrouping = fn?.parse !== 'game'
  const isProposalCoreParam = (p) =>
    isProposalCreate &&
    (p === forcePollParam || p === optionsParam || p === payoutsParam || p === metaParam)
  const mandatoryParams = supportsOptionalGrouping
    ? parameters.filter((p) => p.mandatory || isProposalCoreParam(p))
    : parameters
  const optionalParams = supportsOptionalGrouping
    ? parameters.filter((p) => !p.mandatory && !isProposalCoreParam(p))
    : []

  const rcLimitValue =
    params?.rcLimit === undefined || params?.rcLimit === null || params?.rcLimit === ''
      ? RC_LIMIT_DEFAULT
      : params.rcLimit

  const handleRcLimitChange = (val) => {
    if (!setParams) return
    const cleaned = String(val).replace(/[^\d.]/g, '')
    // Allow up to 3 decimal places
    if (cleaned !== '' && !/^\d*\.?\d{0,3}$/.test(cleaned)) return
    // Store the value multiplied by 1000 in params
    const numVal = cleaned === '' ? '' : Math.floor(Number(cleaned) * 1000)
    setParams((prev) => ({
      ...prev,
      rcLimit: numVal,
    }))
  }

  const handleRcLimitBlur = () => {
    if (!setParams) return
    const num = Number(params?.rcLimit)
    if (!Number.isFinite(num) || num <= 0) {
      setParams((prev) => ({ ...prev, rcLimit: RC_LIMIT_DEFAULT }))
    } else {
      // Format to 3 decimal places
      const formatted = (num / 1000).toFixed(3)
      setParams((prev) => ({ ...prev, rcLimit: Math.floor(Number(formatted) * 1000) }))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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

            <div style={{ marginTop: '12px', maxWidth: '180px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <FloatingLabelInput
                  label="Max RC"
                  type="text"
                  inputMode="decimal"
                  value={(rcLimitValue / 1000).toFixed(3)}
                  onChange={(e) => handleRcLimitChange(e.target.value)}
                  onBlur={handleRcLimitBlur}
                />
              </div>
              <InfoIcon
                tooltip="Limits resources used for this call (in thousands)"
                size={16}
                style={{ marginTop: '0' }}
              />
            </div>
          </>
        ) : (
          <p>No parameters for this function.</p>
        )}
      </div>
    </div>
  )
}
