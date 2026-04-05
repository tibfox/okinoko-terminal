import { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faCoins, faWallet, faSpinner, faPaperPlane, faFire, faHandshake, faUserShield, faPause, faPlay, faHammer, faClockRotateLeft, faShareFromSquare, faArrowUp, faArrowDown, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import { KeyTypes } from '@aioha/aioha'
import { createClient as createWSClient } from 'graphql-ws'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'
import { useNetworkType } from '../terminal/providers/NetworkTypeProvider.jsx'
import ContractDeployPopup from '../terminal/SubTerminals/ContractDeployPopup.jsx'
import TokenInitPopup from './TokenInitPopup.jsx'
import TokenMintPopup from './TokenMintPopup.jsx'
import TokenSendPopup from './TokenSendPopup.jsx'
import TokenBurnPopup from './TokenBurnPopup.jsx'
import TokenApprovePopup from './TokenApprovePopup.jsx'
import TokenTransferOwnerPopup from './TokenTransferOwnerPopup.jsx'
import TokenTransferHistoryPopup from './TokenTransferHistoryPopup.jsx'
import TokenTransferFromPopup from './TokenTransferFromPopup.jsx'
import TokenAdjustAllowancePopup from './TokenAdjustAllowancePopup.jsx'
import TokenActionMenu from './TokenActionMenu.jsx'
import { baseButtonStyle } from './daoHelpers.js'
import DataTable from '../common/DataTable.jsx'

const TABS = {
  BALANCES: 'balances',
  ALLOWANCES: 'allowances',
  YOUR_TOKENS: 'your_tokens',
}

const tabStyle = (isActive) => ({
  flex: 1,
  padding: '10px 12px',
  background: isActive ? 'var(--color-primary-darker)' : 'transparent',
  color: isActive ? 'black' : 'var(--color-primary-lighter)',
  border: '1px solid var(--color-primary-darkest)',
  cursor: 'pointer',
  textTransform: 'uppercase',
  fontSize: 'var(--font-size-base)',
  letterSpacing: '0.05em',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '6px',
  minWidth: '100px',
  fontFamily: 'var(--font-family-base)',
  zIndex: 1,
})

/** Format a numeric balance with the token's decimal places */
function formatTokenBalance(balance, decimals, showAllDecimals = false) {
  if (!balance) return '0'
  if (!decimals) return String(Number(balance))
  const fixed = (balance / (10 ** decimals)).toFixed(decimals)
  if (showAllDecimals) return fixed
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** Fetch deployed code CIDs from the deployer backend */
async function fetchDeployedCodes(deployUrl, tag) {
  try {
    const url = tag ? `${deployUrl}/api/deployed-codes?tag=${tag}` : `${deployUrl}/api/deployed-codes`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return data.codes || []
  } catch {
    return []
  }
}

// Only show contracts created on or after this date
const TOKEN_CUTOFF_DATE = new Date('2026-03-11T00:00:00Z')

/** Query GQL for contracts matching a code CID */
async function fetchContractsByCode(gqlUrl, code) {
  try {
    const res = await fetch(gqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($code: String!) {
          findContract(filterOptions: { byCode: $code }) {
            id name creator code creation_ts
          }
        }`,
        variables: { code },
      }),
    })
    const data = await res.json()
    const contracts = data?.data?.findContract || []
    return contracts.filter((c) => c.creation_ts && new Date(c.creation_ts) >= TOKEN_CUTOFF_DATE)
  } catch {
    return []
  }
}

/** Fetch token overview from indexer hasura (name, symbol, decimals, supply, max_supply) */
async function fetchTokenOverview(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_token_overview(where: { contract_id: { _in: $contractIds } }) {
            contract_id
            name
            symbol
            decimals
            max_supply
            current_supply
            owner
            paused
            init_ts
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_token_overview || []
  } catch {
    return []
  }
}

/** Fetch tokens owned by a specific account (includes transferred-in tokens) */
async function fetchOwnedTokens(indexerHasura, owner) {
  if (!indexerHasura || !owner) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($owner: String!) {
          magi_token_overview(where: { owner: { _eq: $owner } }) {
            contract_id
            name
            symbol
            decimals
            max_supply
            current_supply
            owner
            paused
            init_ts
          }
        }`,
        variables: { owner },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_token_overview || []
  } catch {
    return []
  }
}

/** Fetch user balances from indexer hasura */
async function fetchTokenBalances(indexerHasura, account) {
  if (!indexerHasura || !account) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($account: String!) {
          magi_token_balances(where: { account: { _eq: $account } }) {
            contract_id
            account
            balance
          }
        }`,
        variables: { account },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_token_balances || []
  } catch {
    return []
  }
}

/** Fetch allowances granted BY the current user (user is owner) */
async function fetchOwnerAllowances(indexerHasura, owner) {
  if (!indexerHasura || !owner) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($owner: String!) {
          magi_token_current_allowances(where: { owner: { _eq: $owner }, allowance: { _gt: 0 } }) {
            contract_id
            spender
            allowance
          }
        }`,
        variables: { owner },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_token_current_allowances || []
  } catch {
    return []
  }
}

/** Fetch allowances where current user is the spender */
async function fetchSpenderAllowances(indexerHasura, spender) {
  if (!indexerHasura || !spender) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($spender: String!) {
          magi_token_current_allowances(where: { spender: { _eq: $spender }, allowance: { _gt: 0 } }) {
            contract_id
            owner
            allowance
          }
        }`,
        variables: { spender },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_token_current_allowances || []
  } catch {
    return []
  }
}

export default function TokenPanel({ user, isMobile }) {
  const [activeTab, setActiveTab] = useState(TABS.BALANCES)
  const [userTokens, setUserTokens] = useState([])
  const [tokenStates, setTokenStates] = useState({}) // contractId -> { isInit, name, symbol, decimals, balance, supply, maxSupply }
  const [userBalances, setUserBalances] = useState([]) // [{ contractId, balance, name, symbol, decimals, paused }]
  const [userAllowances, setUserAllowances] = useState([]) // [{ contractId, owner, allowance, name, symbol, decimals, paused }]
  const [ownerAllowances, setOwnerAllowances] = useState([]) // [{ contractId, spender, allowance, name, symbol, decimals, paused }]
  const [loading, setLoading] = useState(false)
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const { aioha } = useAioha()
  const popup = useContext(PopupContext)
  const { networkConfig } = useNetworkType()

  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null

  const deployPollRef = useRef(null)
  const tokensCountRef = useRef(0)

  // Stop deploy polling when a new contract is discovered
  useEffect(() => {
    const prevCount = tokensCountRef.current
    tokensCountRef.current = userTokens.length
    if (deployPollRef.current && userTokens.length > prevCount && prevCount > 0) {
      clearInterval(deployPollRef.current)
      deployPollRef.current = null
    }
  }, [userTokens.length])

  // Cleanup deploy polling on unmount
  useEffect(() => {
    return () => {
      if (deployPollRef.current) clearInterval(deployPollRef.current)
    }
  }, [])

  // Fetch user's deployed token contracts and their state from hasura
  const loadAll = useCallback(async () => {
    if (!user) {
      setUserTokens([])
      setTokenStates({})
      return
    }

    setLoading(true)
    setLoadingBalances(true)

    const codes = await fetchDeployedCodes(networkConfig.contractDeployUrl, 'token')
    const allContracts = []
    for (const code of codes) {
      const contracts = await fetchContractsByCode(networkConfig.graphqlEndpoint, code)
      for (const c of contracts) {
        if (c.creator === hiveAccount) {
          allContracts.push(c)
        }
      }
    }

    // Also fetch tokens owned by the user (includes transferred-in tokens)
    const ownedOverviews = await fetchOwnedTokens(networkConfig.hasuraHttp, hiveAccount)

    // Merge owned tokens that weren't created by the user
    const createdIds = new Set(allContracts.map((c) => c.id))
    for (const o of ownedOverviews) {
      if (!createdIds.has(o.contract_id)) {
        allContracts.push({ id: o.contract_id, name: o.name || '', creator: '' })
      }
    }

    setUserTokens(allContracts)
    setLoading(false)

    // Fetch all user balances first, then fetch overviews for all relevant contracts
    const balances = await fetchTokenBalances(networkConfig.hasuraHttp, hiveAccount)
    const balanceContractIds = balances.map((b) => b.contract_id)
    const ownedContractIds = allContracts.map((c) => c.id)
    const allContractIds = [...new Set([...ownedContractIds, ...balanceContractIds])]

    const overviews = allContractIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, allContractIds)
      : []

    // Build state map for owned/created contracts
    const states = {}
    const balanceMap = {}
    for (const b of balances) {
      balanceMap[b.contract_id] = Number(b.balance) || 0
    }

    for (const c of allContracts) {
      const overview = overviews.find((o) => o.contract_id === c.id)
      if (overview) {
        states[c.id] = {
          isInit: true,
          name: overview.name || '',
          symbol: overview.symbol || '',
          decimals: Number(overview.decimals) || 0,
          supply: Number(overview.current_supply) || 0,
          maxSupply: Number(overview.max_supply) || 0,
          balance: balanceMap[c.id] || 0,
          paused: !!overview.paused,
          owner: overview.owner || '',
          initTs: overview.init_ts || '',
        }
      } else {
        states[c.id] = { isInit: false, name: '', symbol: '', decimals: 0, supply: 0, maxSupply: 0, balance: 0, paused: false, owner: c.creator, initTs: '' }
      }
    }

    // Build balance rows from all user balances (any token, not just owned)
    const balanceRows = []
    for (const b of balances) {
      const bal = Number(b.balance) || 0
      if (bal <= 0) continue
      const overview = overviews.find((o) => o.contract_id === b.contract_id)
      balanceRows.push({
        contractId: b.contract_id,
        balance: bal,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }

    // Fetch allowances where user is spender
    const allowances = await fetchSpenderAllowances(networkConfig.hasuraHttp, hiveAccount)
    const allowanceContractIds = allowances.map((a) => a.contract_id)
    const missingIds = allowanceContractIds.filter((id) => !overviews.find((o) => o.contract_id === id))
    const extraOverviews = missingIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, missingIds)
      : []
    const allOverviews = [...overviews, ...extraOverviews]

    const allowanceRows = []
    for (const a of allowances) {
      const overview = allOverviews.find((o) => o.contract_id === a.contract_id)
      allowanceRows.push({
        contractId: a.contract_id,
        owner: a.owner,
        allowance: Number(a.allowance) || 0,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }

    // Fetch allowances granted by user (user is owner)
    const granted = await fetchOwnerAllowances(networkConfig.hasuraHttp, hiveAccount)
    const grantedContractIds = granted.map((a) => a.contract_id)
    const missingGrantedIds = grantedContractIds.filter((id) => !allOverviews.find((o) => o.contract_id === id))
    const extraGrantedOverviews = missingGrantedIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, missingGrantedIds)
      : []
    const allOverviewsFinal = [...allOverviews, ...extraGrantedOverviews]

    const grantedRows = []
    for (const a of granted) {
      const overview = allOverviewsFinal.find((o) => o.contract_id === a.contract_id)
      grantedRows.push({
        contractId: a.contract_id,
        spender: a.spender,
        allowance: Number(a.allowance) || 0,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }

    setTokenStates(states)
    setUserBalances(balanceRows)
    setUserAllowances(allowanceRows)
    setOwnerAllowances(grantedRows)
    setLoadingBalances(false)
  }, [user, hiveAccount, networkConfig.contractDeployUrl, networkConfig.graphqlEndpoint, networkConfig.hasuraHttp])

  // Load on mount and when dependencies change
  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refreshStates = useCallback(async () => {
    const balances = await fetchTokenBalances(networkConfig.hasuraHttp, hiveAccount)
    const balanceContractIds = balances.map((b) => b.contract_id)
    const ownedContractIds = userTokens.map((c) => c.id)
    const allContractIds = [...new Set([...ownedContractIds, ...balanceContractIds])]

    const overviews = allContractIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, allContractIds)
      : []

    const states = {}
    const balanceMap = {}
    for (const b of balances) {
      balanceMap[b.contract_id] = Number(b.balance) || 0
    }

    for (const c of userTokens) {
      const overview = overviews.find((o) => o.contract_id === c.id)
      if (overview) {
        states[c.id] = {
          isInit: true,
          name: overview.name || '',
          symbol: overview.symbol || '',
          decimals: Number(overview.decimals) || 0,
          supply: Number(overview.current_supply) || 0,
          maxSupply: Number(overview.max_supply) || 0,
          balance: balanceMap[c.id] || 0,
          paused: !!overview.paused,
          owner: overview.owner || '',
          initTs: overview.init_ts || '',
        }
      } else {
        states[c.id] = { isInit: false, name: '', symbol: '', decimals: 0, supply: 0, maxSupply: 0, balance: 0, paused: false, owner: c.creator, initTs: '' }
      }
    }
    setTokenStates(states)

    // Update balance rows
    const balanceRows = []
    for (const b of balances) {
      const bal = Number(b.balance) || 0
      if (bal <= 0) continue
      const overview = overviews.find((o) => o.contract_id === b.contract_id)
      balanceRows.push({
        contractId: b.contract_id,
        balance: bal,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }
    setUserBalances(balanceRows)

    // Update allowance rows
    const allowances = await fetchSpenderAllowances(networkConfig.hasuraHttp, hiveAccount)
    const allowanceContractIds = allowances.map((a) => a.contract_id)
    const missingIds = allowanceContractIds.filter((id) => !overviews.find((o) => o.contract_id === id))
    const extraOverviews = missingIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, missingIds)
      : []
    const allOverviews = [...overviews, ...extraOverviews]

    const allowanceRows = []
    for (const a of allowances) {
      const overview = allOverviews.find((o) => o.contract_id === a.contract_id)
      allowanceRows.push({
        contractId: a.contract_id,
        owner: a.owner,
        allowance: Number(a.allowance) || 0,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }
    setUserAllowances(allowanceRows)

    // Update owner (granted) allowance rows
    const granted = await fetchOwnerAllowances(networkConfig.hasuraHttp, hiveAccount)
    const grantedContractIds = granted.map((a) => a.contract_id)
    const missingGrantedIds = grantedContractIds.filter((id) => !allOverviews.find((o) => o.contract_id === id))
    const extraGrantedOverviews = missingGrantedIds.length
      ? await fetchTokenOverview(networkConfig.hasuraHttp, missingGrantedIds)
      : []
    const allOverviewsFinal = [...allOverviews, ...extraGrantedOverviews]

    const grantedRows = []
    for (const a of granted) {
      const overview = allOverviewsFinal.find((o) => o.contract_id === a.contract_id)
      grantedRows.push({
        contractId: a.contract_id,
        spender: a.spender,
        allowance: Number(a.allowance) || 0,
        name: overview?.name || '',
        symbol: overview?.symbol || '',
        decimals: Number(overview?.decimals) || 0,
        paused: !!overview?.paused,
      })
    }
    setOwnerAllowances(grantedRows)
  }, [userTokens, hiveAccount, networkConfig.hasuraHttp])

  // Real-time subscriptions — only refresh when current user is involved
  useEffect(() => {
    if (!hiveAccount || !networkConfig.hasuraWs) return

    const wsClient = createWSClient({ url: networkConfig.hasuraWs })

    // Transfer events where user is sender or receiver (any contract)
    const transferSub = wsClient.iterate({
      query: `subscription($user: String!) {
        magi_token_transfer_events(
          where: { _or: [{ from: { _eq: $user } }, { to: { _eq: $user } }] }
          order_by: { indexer_block_height: desc }
          limit: 1
        ) { indexer_block_height }
      }`,
      variables: { user: hiveAccount },
    })

    // Init events where user is the owner (catches newly deployed contracts)
    const initSub = wsClient.iterate({
      query: `subscription($owner: String!) {
        magi_token_init_events(
          where: { owner: { _eq: $owner } }
          order_by: { indexer_block_height: desc }
          limit: 1
        ) { indexer_block_height }
      }`,
      variables: { owner: hiveAccount },
    })

    let cancelled = false
    const listen = async (sub) => {
      let isFirst = true
      try {
        for await (const _ of sub) {
          if (cancelled) break
          if (isFirst) { isFirst = false; continue }
          loadAll()
        }
      } catch { /* ignore */ }
    }

    listen(transferSub)
    listen(initSub)

    return () => {
      cancelled = true
      wsClient.dispose()
    }
  }, [hiveAccount, networkConfig.hasuraWs, loadAll])

  // Reset sort when switching tabs
  useEffect(() => {
    setSortCol(null)
    setSortDir('asc')
  }, [activeTab])

  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }, [sortCol])

  const sortRows = useCallback((rows, getVal) => {
    if (!sortCol) return rows
    const sorted = [...rows]
    sorted.sort((a, b) => {
      const va = getVal(a, sortCol)
      const vb = getVal(b, sortCol)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [sortCol, sortDir])

  const SortHeader = ({ label, col, align }) => {
    const icon = sortCol === col ? (sortDir === 'asc' ? faSortUp : faSortDown) : faSort
    return (
      <span
        onClick={() => handleSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      >
        {label}
        <FontAwesomeIcon icon={icon} style={{ fontSize: '0.65rem', opacity: sortCol === col ? 1 : 0.3 }} />
      </span>
    )
  }

  const handleDeployTokenClick = useCallback(() => {
    if (!user) {
      popup?.openPopup?.({
        title: 'Login required',
        body: 'Please connect your account to deploy a token contract.',
      })
      return
    }
    const capturedAioha = aioha
    const capturedUser = user
    const deployState = { isProcessing: false }
    popup?.openPopup?.({
      title: 'Deploy Token Contract',
      body: () => (
        <ContractDeployPopup
          onClose={() => popup?.closePopup?.()}
          aioha={capturedAioha}
          user={capturedUser}
          description="Deploy your own token contract (aligned with ERC-20) to the Magi network."
          filterTag="token"
          hideSourceTabs
          hideTemplateDropdown
          nameLabel="Token Name"
          deployButtonLabel="Deploy Token"
          onProcessingChange={(processing) => { deployState.isProcessing = processing }}
          onDeploySuccess={() => {
            // Poll for the new contract to appear on chain
            if (deployPollRef.current) clearInterval(deployPollRef.current)
            let attempts = 0
            deployPollRef.current = setInterval(() => {
              attempts++
              if (attempts > 24) { // 24 * 5s = 2 min max
                clearInterval(deployPollRef.current)
                deployPollRef.current = null
                return
              }
              loadAll()
            }, 5000)
            loadAll()
          }}
        />
      ),
      width: '40vw',
      confirmClose: () => deployState.isProcessing
        ? 'Deployment is in progress. Are you sure you want to close?'
        : false,
    })
  }, [user, aioha, popup, loadAll])

  const handleInitClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const capturedUser = user
    const contract = userTokens.find((t) => t.id === contractId)
    popup?.openPopup?.({
      title: 'Initialize Token',
      body: () => (
        <TokenInitPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={capturedUser}
          contractId={contractId}
          defaultName={contract?.name || ''}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, refreshStates])

  const getTokenInfo = useCallback((contractId) => {
    if (tokenStates[contractId]) return tokenStates[contractId]
    const b = userBalances.find((x) => x.contractId === contractId)
    if (b) return { name: b.name, symbol: b.symbol, decimals: b.decimals, balance: b.balance }
    return null
  }, [tokenStates, userBalances])

  const handleBurnClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Burn ${info?.symbol || 'Tokens'}`,
      body: () => (
        <TokenBurnPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handleSendClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Send ${info?.symbol || 'Tokens'}`,
      body: () => (
        <TokenSendPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handleMintClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Mint ${info?.symbol || 'Tokens'}`,
      body: () => (
        <TokenMintPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handleApproveClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Approve ${info?.symbol || 'Token'} Spending`,
      body: () => (
        <TokenApprovePopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handleTransferOwnerClick = useCallback((contractId) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Transfer Ownership — ${info?.symbol || 'Token'}`,
      body: () => (
        <TokenTransferOwnerPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handlePauseToggle = useCallback(async (contractId, isPaused) => {
    const action = isPaused ? 'unpause' : 'pause'
    try {
      const res = await aioha.vscCallContract(
        contractId,
        action,
        {},
        10000,
        [],
        KeyTypes.Active,
      )
      if (res?.success) {
        refreshStates()
      } else {
        popup?.openPopup?.({
          title: 'Error',
          body: res?.error || `Failed to ${action} token`,
        })
      }
    } catch (err) {
      popup?.openPopup?.({
        title: 'Error',
        body: err.message || `Failed to ${action} token`,
      })
    }
  }, [aioha, popup, refreshStates])

  const handleTokenInfoClick = useCallback(async (contractId) => {
    // Try local state first, then fetch
    let info = tokenStates[contractId]
    if (!info || !info.isInit) {
      const overviews = await fetchTokenOverview(networkConfig.hasuraHttp, [contractId])
      const o = overviews[0]
      if (o) {
        info = {
          name: o.name || '', symbol: o.symbol || '', decimals: Number(o.decimals) || 0,
          supply: Number(o.current_supply) || 0, maxSupply: Number(o.max_supply) || 0,
          owner: o.owner || '', paused: !!o.paused, initTs: o.init_ts || '',
        }
      }
    }
    if (!info) return
    const bal = userBalances.find((x) => x.contractId === contractId)
    const balance = bal ? bal.balance : (info.balance || 0)
    const decimals = info.decimals || 0

    const supplyPct = info.maxSupply
      ? Math.min(100, ((info.supply || 0) / info.maxSupply) * 100)
      : null

    const InfoTable = ({ items }) => (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-base)' }}>
        <thead>
          <tr>
            {items.map(([label]) => (
              <th key={label} style={{ padding: '0.35rem 0.5rem', color: 'var(--color-primary-darker)', fontWeight: 400, textAlign: 'left', borderBottom: '1px solid var(--color-primary-darkest)' }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {items.map(([label, value, accent]) => (
              <td key={label} style={{ padding: '0.35rem 0.5rem', color: accent || 'var(--color-primary-lightest)', wordBreak: 'break-all' }}>{value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    )

    const SupplyBar = ({ pct }) => (
      <div style={{ padding: '0.25rem 0.5rem 0.5rem' }}>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--color-primary-darkest)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 90 ? '#ff4444' : 'var(--color-primary)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    )

    popup?.openPopup?.({
      title: `${info.symbol || '???'} — Token Info`,
      body: () => (
        <div className="neon-scroll" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '60vh',
          overflowY: 'auto',
          fontSize: 'var(--font-size-base)',
        }}>
          {/* Header: circular badge + name/owner + balance */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.5rem 0',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '2px solid var(--color-primary-darkest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'rgba(0, 0, 0, 0.5)',
            }}>
              <span style={{
                color: 'var(--color-primary)',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>{(info.symbol || '???').slice(0, 4)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
              <div style={{ color: 'var(--color-primary-lightest)', fontSize: '1.5rem', fontWeight: 700 }}>
                {info.name || 'Unknown Token'}
                {info.paused && (
                  <span style={{ color: '#ff4444', marginLeft: '0.5rem', fontSize: 'var(--font-size-base)', fontWeight: 400 }}>
                    <FontAwesomeIcon icon={faPause} style={{ marginRight: '0.25rem' }} />
                    PAUSED
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--color-primary-darker)', wordBreak: 'break-all' }}>
                {info.owner || '-'}
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
              border: '1px solid var(--color-primary-darkest)',
              padding: '0.5rem 0.75rem',
            }}>
              <div style={{ color: 'var(--color-primary-darker)' }}>Your Balance</div>
              <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>
                {formatTokenBalance(balance, decimals)} {info.symbol || '???'}
              </div>
            </div>
          </div>

          {/* Supply table */}
          <InfoTable items={[
            ['Current Supply', formatTokenBalance(info.supply || 0, decimals, true)],
            ['Max Supply', info.maxSupply ? formatTokenBalance(info.maxSupply, decimals, true) : 'Unlimited'],
            ...(supplyPct !== null ? [['Minted', `${supplyPct.toFixed(1)}%`, supplyPct > 90 ? '#ff4444' : undefined]] : []),
          ]} />
          {supplyPct !== null && <SupplyBar pct={supplyPct} />}

          {/* Details table */}
          <InfoTable items={[
            ['Contract', (
              <a
                href={`https://vsc.techcoderx.com/contract/${contractId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                {contractId.slice(0, 8)}...
              </a>
            )],
            ['Decimals', decimals],
            ['Created', info.initTs ? new Date(info.initTs).toLocaleDateString() : '-'],
          ]} />
        </div>
      ),
      width: '35vw',
    })
  }, [tokenStates, userBalances, networkConfig.hasuraHttp, popup])

  const handleHistoryClick = useCallback((contractId) => {
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Transfer History — ${info?.symbol || 'Token'}`,
      body: () => (
        <TokenTransferHistoryPopup
          contractId={contractId}
          tokenInfo={info}
          hasuraHttp={networkConfig.hasuraHttp}
          userAccount={hiveAccount}
        />
      ),
      width: '50vw',
    })
  }, [popup, getTokenInfo, networkConfig.hasuraHttp, hiveAccount])

  const handleTransferFromClick = useCallback((contractId, fromOwner) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    popup?.openPopup?.({
      title: `Transfer From — ${info?.symbol || 'Tokens'}`,
      body: () => (
        <TokenTransferFromPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
          defaultFrom={fromOwner}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, refreshStates])

  const handleAdjustAllowanceClick = useCallback((contractId, spender, mode, currentAllowance) => {
    const capturedAioha = aioha
    const info = getTokenInfo(contractId)
    const bal = userBalances.find((x) => x.contractId === contractId)
    const ownerBalance = bal ? bal.balance : (info?.balance || 0)
    const label = mode === 'increase' ? 'Increase' : 'Decrease'
    popup?.openPopup?.({
      title: `${label} Allowance — ${info?.symbol || 'Token'}`,
      body: () => (
        <TokenAdjustAllowancePopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={capturedAioha}
          user={user}
          contractId={contractId}
          tokenInfo={info}
          spender={spender}
          mode={mode}
          currentAllowance={currentAllowance}
          ownerBalance={ownerBalance}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, getTokenInfo, userBalances, refreshStates])

  const renderBalancesTab = () => {
    if (!user) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>Log in to see your token balances.</p>
    }
    if (loading || loadingBalances) {
      return (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
          Loading balances...
        </p>
      )
    }

    if (userBalances.length === 0) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No token balances found.</p>
    }

    return (
      <DataTable
        headers={[
          { label: <SortHeader label="Symbol" col="symbol" /> },
          { label: <SortHeader label="Name" col="name" /> },
          { label: <SortHeader label="Balance" col="balance" align="right" />, style: { textAlign: 'right' } },
          '',
        ]}
        rows={sortRows(userBalances, (b, col) => {
          switch (col) {
            case 'symbol': return (b.symbol || '').toLowerCase()
            case 'name': return (b.name || '').toLowerCase()
            case 'balance': return b.balance || 0
            default: return 0
          }
        }).map((b) => ({
          key: b.contractId,
          cells: [
            {
              content: (
                <span onClick={() => handleTokenInfoClick(b.contractId)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={b.paused ? faPause : faCoins} style={{ fontSize: '0.75rem', opacity: b.paused ? 0.6 : 0.5 }} title={b.paused ? 'Paused' : ''} />
                  {b.symbol || '???'}
                </span>
              ),
              style: { fontWeight: 700, color: b.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
            },
            b.name,
            { content: formatTokenBalance(b.balance, b.decimals), style: { textAlign: 'right' } },
            {
              content: (
                <TokenActionMenu items={[
                  { label: 'Send', icon: faPaperPlane, onClick: () => handleSendClick(b.contractId), disabled: !b.balance || b.paused },
                  { label: 'Burn', icon: faFire, onClick: () => handleBurnClick(b.contractId), disabled: !b.balance || b.paused },
                  { label: 'Approve', icon: faHandshake, onClick: () => handleApproveClick(b.contractId) },
                  { label: 'Transfer From', icon: faShareFromSquare, onClick: () => handleTransferFromClick(b.contractId), disabled: b.paused },
                  { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(b.contractId) },
                ]} />
              ),
            },
          ],
        }))}
      />
    )
  }

  const renderAllowancesTab = () => {
    if (!user) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>Log in to see your allowances.</p>
    }
    if (loading || loadingBalances) {
      return (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
          Loading allowances...
        </p>
      )
    }

    if (userAllowances.length === 0 && ownerAllowances.length === 0) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No allowances found.</p>
    }

    return (
      <>
        {userAllowances.length > 0 && (
          <>
            <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '8px 2px' }}>
              Spending Allowances
            </div>
            <DataTable
              headers={[
                { label: <SortHeader label="Symbol" col="symbol" /> },
                { label: <SortHeader label="Owner" col="owner" /> },
                { label: <SortHeader label="Allowance" col="allowance" align="right" />, style: { textAlign: 'right' } },
                '',
              ]}
              rows={sortRows(userAllowances, (a, col) => {
                switch (col) {
                  case 'symbol': return (a.symbol || '').toLowerCase()
                  case 'owner': return (a.owner || '').toLowerCase()
                  case 'allowance': return a.allowance || 0
                  default: return 0
                }
              }).map((a) => ({
                key: `spend-${a.contractId}-${a.owner}`,
                cells: [
                  {
                    content: (
                      <span onClick={() => handleTokenInfoClick(a.contractId)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <FontAwesomeIcon icon={a.paused ? faPause : faCoins} style={{ fontSize: '0.75rem', opacity: a.paused ? 0.6 : 0.5 }} title={a.paused ? 'Paused' : ''} />
                        {a.symbol || '???'}
                      </span>
                    ),
                    style: { fontWeight: 700, color: a.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
                  },
                  a.owner,
                  { content: formatTokenBalance(a.allowance, a.decimals), style: { textAlign: 'right' } },
                  {
                    content: (
                      <TokenActionMenu items={[
                        { label: 'Transfer From', icon: faShareFromSquare, onClick: () => handleTransferFromClick(a.contractId, a.owner), disabled: a.paused },
                        { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(a.contractId) },
                      ]} />
                    ),
                  },
                ],
              }))}
            />
          </>
        )}

        {ownerAllowances.length > 0 && (
          <>
            <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '8px 2px', marginTop: userAllowances.length > 0 ? '1rem' : 0 }}>
              Granted Allowances
            </div>
            <DataTable
              headers={[
                { label: <SortHeader label="Symbol" col="symbol" /> },
                { label: <SortHeader label="Spender" col="spender" /> },
                { label: <SortHeader label="Allowance" col="allowance" align="right" />, style: { textAlign: 'right' } },
                '',
              ]}
              rows={sortRows(ownerAllowances, (a, col) => {
                switch (col) {
                  case 'symbol': return (a.symbol || '').toLowerCase()
                  case 'spender': return (a.spender || '').toLowerCase()
                  case 'allowance': return a.allowance || 0
                  default: return 0
                }
              }).map((a) => ({
                key: `grant-${a.contractId}-${a.spender}`,
                cells: [
                  {
                    content: (
                      <span onClick={() => handleTokenInfoClick(a.contractId)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <FontAwesomeIcon icon={a.paused ? faPause : faCoins} style={{ fontSize: '0.75rem', opacity: a.paused ? 0.6 : 0.5 }} title={a.paused ? 'Paused' : ''} />
                        {a.symbol || '???'}
                      </span>
                    ),
                    style: { fontWeight: 700, color: a.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
                  },
                  a.spender,
                  { content: formatTokenBalance(a.allowance, a.decimals), style: { textAlign: 'right' } },
                  {
                    content: (
                      <TokenActionMenu items={[
                        { label: 'Increase', icon: faArrowUp, onClick: () => handleAdjustAllowanceClick(a.contractId, a.spender, 'increase', a.allowance) },
                        { label: 'Decrease', icon: faArrowDown, onClick: () => handleAdjustAllowanceClick(a.contractId, a.spender, 'decrease', a.allowance) },
                        { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(a.contractId) },
                      ]} />
                    ),
                  },
                ],
              }))}
            />
          </>
        )}
      </>
    )
  }

  const renderYourTokensTab = () => {
    if (!user) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>Log in to see your deployed tokens.</p>
    }
    if (loading) {
      return (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
          Loading your token contracts...
        </p>
      )
    }
    // Filter out tokens where ownership has been transferred away
    const ownedTokens = userTokens.filter((t) => {
      const state = tokenStates[t.id]
      if (!state) return true
      return state.owner === hiveAccount
    })

    if (ownedTokens.length === 0) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>You haven't deployed any tokens yet.</p>
    }
    return (
      <DataTable
        headers={[
          { label: <SortHeader label="Symbol" col="symbol" /> },
          { label: <SortHeader label="Name" col="name" /> },
          'Contract ID',
          { label: <SortHeader label="Supply" col="supply" align="right" />, style: { textAlign: 'right' } },
          { label: <SortHeader label="Max Supply" col="maxSupply" align="right" />, style: { textAlign: 'right' } },
          '',
        ]}
        rows={sortRows(ownedTokens, (t, col) => {
          const state = tokenStates[t.id]
          switch (col) {
            case 'symbol': return (state?.symbol || '').toLowerCase()
            case 'name': return (state?.name || t.name || '').toLowerCase()
            case 'supply': return state?.supply || 0
            case 'maxSupply': return state?.maxSupply || 0
            default: return 0
          }
        }).map((t) => {
          const state = tokenStates[t.id]
          const isInitialized = state?.isInit
          return {
            key: t.id,
            cells: [
              {
                content: (
                  <span onClick={() => handleTokenInfoClick(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={state?.paused ? faPause : faCoins} style={{ fontSize: '0.75rem', opacity: state?.paused ? 0.6 : 0.5 }} title={state?.paused ? 'Paused' : ''} />
                    {(isInitialized && state.symbol) || '???'}
                  </span>
                ),
                style: { fontWeight: 700, color: state?.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
              },
              (isInitialized && state.name) || t.name,
              {
                content: (
                  <a
                    href={`https://vsc.techcoderx.com/contract/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {t.id.slice(0, 8)}…
                  </a>
                ),
              },
              { content: isInitialized ? formatTokenBalance(state.supply, state.decimals, true) : '-', style: { textAlign: 'right' } },
              { content: isInitialized ? (state.maxSupply ? formatTokenBalance(state.maxSupply, state.decimals, true) : 'Unlimited') : '-', style: { textAlign: 'right' } },
              {
                content: isInitialized
                  ? (
                    <TokenActionMenu items={[
                      { label: 'Mint', icon: faHammer, onClick: () => handleMintClick(t.id), disabled: state.paused },
                      { label: 'Transfer Ownership', icon: faUserShield, onClick: () => handleTransferOwnerClick(t.id) },
                      { label: state.paused ? 'Unpause' : 'Pause', icon: state.paused ? faPlay : faPause, onClick: () => handlePauseToggle(t.id, state.paused) },
                      { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(t.id) },
                    ]} />
                  )
                  : (
                    <TokenActionMenu items={[
                      { label: 'Initialize', icon: faRocket, onClick: () => handleInitClick(t.id) },
                    ]} />
                  ),
              },
            ],
          }
        })}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button
          className="tabs-button"
          onClick={() => setActiveTab(TABS.BALANCES)}
          style={tabStyle(activeTab === TABS.BALANCES)}
        >
          <FontAwesomeIcon icon={faWallet} style={{ fontSize: '0.75em' }} />
          <span>Balances</span>
        </button>
        <button
          className="tabs-button"
          onClick={() => setActiveTab(TABS.ALLOWANCES)}
          style={tabStyle(activeTab === TABS.ALLOWANCES)}
        >
          <FontAwesomeIcon icon={faHandshake} style={{ fontSize: '0.75em' }} />
          <span>Allowances</span>
        </button>
        <button
          className="tabs-button"
          onClick={() => setActiveTab(TABS.YOUR_TOKENS)}
          style={tabStyle(activeTab === TABS.YOUR_TOKENS)}
        >
          <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.75em' }} />
          <span>Your Tokens</span>
        </button>
      </div>

      {/* Tab content */}
      <div style={{ paddingRight: '12px' }}>
        {activeTab === TABS.BALANCES && renderBalancesTab()}
        {activeTab === TABS.ALLOWANCES && renderAllowancesTab()}
        {activeTab === TABS.YOUR_TOKENS && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                onClick={handleDeployTokenClick}
                style={baseButtonStyle(false)}
                title="Deploy your own token contract"
              >
                <FontAwesomeIcon icon={faRocket} style={{ fontSize: '0.9rem' }} />
                <span>Deploy Your Own Token</span>
              </button>
            </div>
            {renderYourTokensTab()}
          </>
        )}
      </div>
    </div>
  )
}
