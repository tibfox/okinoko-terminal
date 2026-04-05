import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faImage, faWallet, faSpinner, faPaperPlane, faFire, faHammer, faClockRotateLeft, faPause, faPlay, faUserShield, faLayerGroup, faHandshake, faLink, faGlobe, faTags, faBoxesStacked, faFilter, faSortUp, faSortDown, faSort, faChevronRight, faChevronDown, faChevronLeft, faList, faGrip, faArrowLeft, faListOl, faKey, faFileLines, faFolder } from '@fortawesome/free-solid-svg-icons'
import { KeyTypes } from '@aioha/aioha'
import { createClient as createWSClient } from 'graphql-ws'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'
import { useNetworkType } from '../terminal/providers/NetworkTypeProvider.jsx'
import ContractDeployPopup from '../terminal/SubTerminals/ContractDeployPopup.jsx'
import NftInitPopup from './NftInitPopup.jsx'
import NftMintPopup from './NftMintPopup.jsx'
import NftSendPopup from './NftSendPopup.jsx'
import NftBurnPopup from './NftBurnPopup.jsx'
import NftHistoryPopup from './NftHistoryPopup.jsx'
import NftMintBatchPopup from './NftMintBatchPopup.jsx'
import NftBatchTransferPopup from './NftBatchTransferPopup.jsx'
import NftBurnBatchPopup from './NftBurnBatchPopup.jsx'
import NftApprovalPopup from './NftApprovalPopup.jsx'
import NftSetUriPopup from './NftSetUriPopup.jsx'
import NftSetBaseUriPopup from './NftSetBaseUriPopup.jsx'
import NftSetPropertiesPopup from './NftSetPropertiesPopup.jsx'
import NftChangeOwnerPopup from './NftChangeOwnerPopup.jsx'
import NftMintSeriesPopup from './NftMintSeriesPopup.jsx'
import NftTokenApprovePopup from './NftTokenApprovePopup.jsx'
import NftSetCollectionMetadataPopup from './NftSetCollectionMetadataPopup.jsx'
import NftDistributePopup from './NftDistributePopup.jsx'
import TokenActionMenu from './TokenActionMenu.jsx'
import NeonListDropdown from '../common/NeonListDropdown.jsx'
import DataTable from '../common/DataTable.jsx'
import NftImage from '../common/NftImage.jsx'

const TABS = {
  YOUR_NFTS: 'your_nfts',
  YOUR_COLLECTIONS: 'your_collections',
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

// ===== Image URL extraction from properties =====

const IMAGE_KEYS = ['image', 'imageurl', 'imageuri', 'icon', 'iconurl', 'thumbnail', 'thumbnailurl']

function extractImageUrl(properties) {
  if (!properties || typeof properties !== 'object') return null
  for (const key of Object.keys(properties)) {
    if (IMAGE_KEYS.includes(key.toLowerCase())) {
      const val = properties[key]
      if (typeof val === 'string' && val.trim()) return val.trim()
    }
  }
  return null
}


// ===== Hasura fetch helpers =====

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
const NFT_CUTOFF_DATE = new Date('2026-03-11T00:00:00Z')

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
    return contracts.filter((c) => c.creation_ts && new Date(c.creation_ts) >= NFT_CUTOFF_DATE)
  } catch {
    return []
  }
}

async function fetchNftOverview(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_nft_overview(where: { contract_id: { _in: $contractIds } }) {
            contract_id
            name
            symbol
            base_uri
            owner
            paused
            token_count
            total_minted
            total_burned
            init_ts
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_overview || []
  } catch {
    return []
  }
}

async function fetchOwnedNftCollections(indexerHasura, owner) {
  if (!indexerHasura || !owner) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($owner: String!) {
          magi_nft_overview(where: { owner: { _eq: $owner } }) {
            contract_id
            name
            symbol
            base_uri
            owner
            paused
            token_count
            total_minted
            total_burned
            init_ts
          }
        }`,
        variables: { owner },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_overview || []
  } catch {
    return []
  }
}

async function fetchNftBalances(indexerHasura, account) {
  if (!indexerHasura || !account) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($account: String!) {
          magi_nft_balances(where: { account: { _eq: $account } }) {
            contract_id
            token_id
            balance
          }
        }`,
        variables: { account },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_balances || []
  } catch {
    return []
  }
}

async function fetchNftTokenSupplies(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_nft_token_supply(where: { contract_id: { _in: $contractIds } }) {
            contract_id
            token_id
            current_supply
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_token_supply || []
  } catch {
    return []
  }
}

async function fetchNftTemplateTokens(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_nft_template_tokens(where: { contract_id: { _in: $contractIds } }) {
            contract_id
            template_id
            token_id
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_template_tokens || []
  } catch {
    return []
  }
}

async function fetchCollectionMetadatas(graphqlEndpoint, contractIds) {
  if (!graphqlEndpoint || !contractIds.length) return {}
  try {
    const results = await Promise.all(
      contractIds.map(async (contractId) => {
        try {
          const res = await fetch(graphqlEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query($contractId: String!, $keys: [String!]!) { getStateByKeys(contractId: $contractId, keys: $keys) }`,
              variables: { contractId, keys: ['collection_metadata'] },
            }),
          })
          const json = await res.json()
          const val = json?.data?.getStateByKeys?.['collection_metadata']
          if (!val) return [contractId, null]
          try {
            let parsed = JSON.parse(val)
            if (typeof parsed === 'string') parsed = JSON.parse(parsed)
            return [contractId, typeof parsed === 'object' && parsed !== null ? parsed : null]
          } catch { return [contractId, null] }
        } catch { return [contractId, null] }
      })
    )
    const map = {}
    for (const [id, meta] of results) { if (meta) map[id] = meta }
    return map
  } catch {
    return {}
  }
}

async function fetchNftMinters(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_nft_all_transfers(
            where: { indexer_contract_id: { _in: $contractIds }, from: { _eq: "" } }
            order_by: { indexer_block_height: asc }
          ) {
            indexer_contract_id
            token_id
            to
            indexer_ts
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_all_transfers || []
  } catch {
    return []
  }
}

async function fetchNftReceiveDates(indexerHasura, contractIds, account) {
  if (!indexerHasura || !contractIds.length || !account) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!, $account: String!) {
          magi_nft_all_transfers(
            where: { indexer_contract_id: { _in: $contractIds }, to: { _eq: $account } }
            order_by: { indexer_block_height: desc }
          ) {
            indexer_contract_id
            token_id
            indexer_ts
          }
        }`,
        variables: { contractIds, account },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_all_transfers || []
  } catch {
    return []
  }
}

async function fetchNftTokenInfo(indexerHasura, contractIds) {
  if (!indexerHasura || !contractIds.length) return []
  try {
    const res = await fetch(indexerHasura, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractIds: [String!]!) {
          magi_nft_token_info(where: { contract_id: { _in: $contractIds } }) {
            contract_id
            token_id
            max_supply
            soulbound
            has_properties
            created_ts
          }
        }`,
        variables: { contractIds },
      }),
    })
    const data = await res.json()
    return data?.data?.magi_nft_token_info || []
  } catch {
    return []
  }
}

const PAGE_SIZE = 50

const pageSelectorStyle = {
  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
  padding: '4px 0', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-base)',
  color: 'var(--color-primary-darker)',
}
const pageArrowStyle = (enabled) => ({
  cursor: enabled ? 'pointer' : 'default',
  color: enabled ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)',
  padding: '2px 6px',
})

function PageSelector({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  return (
    <div style={pageSelectorStyle}>
      <span style={{ color: 'var(--color-primary-darker)' }}>{from}-{to} of {total}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={pageArrowStyle(page > 0)} onClick={() => page > 0 && onPageChange(page - 1)}>
          <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: '0.65rem' }} />
        </span>
        <span style={{ color: 'var(--color-primary-lightest)' }}>
          {page + 1} / {totalPages}
        </span>
        <span style={pageArrowStyle(page < totalPages - 1)} onClick={() => page < totalPages - 1 && onPageChange(page + 1)}>
          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.65rem' }} />
        </span>
      </span>
    </div>
  )
}

// ===== Component =====

export default function NftPanel({ user, isMobile }) {
  const [activeTab, setActiveTab] = useState(TABS.YOUR_NFTS)
  const [userCollections, setUserCollections] = useState([])
  const [collectionStates, setCollectionStates] = useState({})
  const [collectionMetadata, setCollectionMetadata] = useState({})
  const [userNfts, setUserNfts] = useState([])
  const [mintedTokens, setMintedTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingNfts, setLoadingNfts] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mintSearchQuery, setMintSearchQuery] = useState('')
  const [filterCollection, setFilterCollection] = useState('')
  const [filterType, setFilterType] = useState('') // '', 'unique', 'editioned'
  const [filterMinter, setFilterMinter] = useState('')
  const [filterMintDate, setFilterMintDate] = useState('') // '', '24h', '7d', '30d', '90d', '1y'
  const [filterReceivedDate, setFilterReceivedDate] = useState('') // same options
  const [showMintFilters, setShowMintFilters] = useState(false)
  const [mintFilterType, setMintFilterType] = useState('') // '', 'unique', 'editioned'
  const [mintFilterSoulbound, setMintFilterSoulbound] = useState('') // '', 'yes', 'no'
  const [sortCol, setSortCol] = useState(null) // 'collection', 'tokenId', 'balance', 'type', 'minter'
  const [sortDir, setSortDir] = useState('asc')
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nftPanel_expandedGroups')) || {} } catch { return {} }
  })
  const [pageIndexes, setPageIndexes] = useState({}) // key -> current page (0-based)
  const getPage = (key) => pageIndexes[key] || 0
  const setPage = (key, page) => setPageIndexes((prev) => ({ ...prev, [key]: page }))
  const [nftViewMode, setNftViewMode] = useState(() => localStorage.getItem('nftPanel_nftViewMode') || 'tiles')
  const [mintViewMode, setMintViewMode] = useState(() => localStorage.getItem('nftPanel_mintViewMode') || 'tiles')
  const [tilesSelectedCollection, setTilesSelectedCollection] = useState(null) // contractId or null
  const [tilesSelectedTemplate, setTilesSelectedTemplate] = useState(null) // templateId or null
  const [mintTilesSelectedCollection, setMintTilesSelectedCollection] = useState(null) // contractId or null
  const [mintTilesSelectedTemplate, setMintTilesSelectedTemplate] = useState(null) // templateId or null
  const [nftImageUrls, setNftImageUrls] = useState({}) // 'contractId:tokenId' -> image URL
  const [nftNames, setNftNames] = useState({}) // 'contractId:tokenId' -> name string
  const { aioha } = useAioha()
  const popup = useContext(PopupContext)
  const { networkConfig } = useNetworkType()

  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null

  const deployPollRef = useRef(null)
  const collectionsCountRef = useRef(0)

  // Persist view modes and expanded groups to localStorage
  useEffect(() => { localStorage.setItem('nftPanel_nftViewMode', nftViewMode) }, [nftViewMode])
  useEffect(() => { localStorage.setItem('nftPanel_mintViewMode', mintViewMode) }, [mintViewMode])
  useEffect(() => { localStorage.setItem('nftPanel_expandedGroups', JSON.stringify(expandedGroups)) }, [expandedGroups])

  // Stop deploy polling when a new contract is discovered
  useEffect(() => {
    const prevCount = collectionsCountRef.current
    collectionsCountRef.current = userCollections.length
    if (deployPollRef.current && userCollections.length > prevCount && prevCount > 0) {
      clearInterval(deployPollRef.current)
      deployPollRef.current = null
    }
  }, [userCollections.length])

  // Cleanup deploy polling on unmount
  useEffect(() => {
    return () => {
      if (deployPollRef.current) clearInterval(deployPollRef.current)
    }
  }, [])

  const loadAll = useCallback(async () => {
    if (!user) {
      setUserCollections([])
      setCollectionStates({})
      setUserNfts([])
      return
    }

    setLoading(true)
    setLoadingNfts(true)

    const codes = await fetchDeployedCodes(networkConfig.contractDeployUrl, 'nft')
    const allContracts = []
    for (const code of codes) {
      const contracts = await fetchContractsByCode(networkConfig.graphqlEndpoint, code)
      for (const c of contracts) {
        if (c.creator === hiveAccount) {
          allContracts.push(c)
        }
      }
    }

    // Also fetch collections owned by user (includes transferred-in)
    const ownedOverviews = await fetchOwnedNftCollections(networkConfig.hasuraHttp, hiveAccount)
    const createdIds = new Set(allContracts.map((c) => c.id))
    for (const o of ownedOverviews) {
      if (!createdIds.has(o.contract_id)) {
        allContracts.push({ id: o.contract_id, name: o.name || '', creator: '' })
      }
    }

    setUserCollections(allContracts)
    setLoading(false)

    // Fetch overviews for all contracts
    const balances = await fetchNftBalances(networkConfig.hasuraHttp, hiveAccount)
    const balanceContractIds = [...new Set(balances.map((b) => b.contract_id))]
    const ownedContractIds = allContracts.map((c) => c.id)
    const allContractIds = [...new Set([...ownedContractIds, ...balanceContractIds])]

    const overviews = allContractIds.length
      ? await fetchNftOverview(networkConfig.hasuraHttp, allContractIds)
      : []

    // Build state map for collections
    const states = {}
    for (const c of allContracts) {
      const overview = overviews.find((o) => o.contract_id === c.id)
      if (overview) {
        states[c.id] = {
          isInit: true,
          name: overview.name || '',
          symbol: overview.symbol || '',
          baseUri: overview.base_uri || '',
          owner: overview.owner || '',
          paused: !!overview.paused,
          tokenCount: Number(overview.token_count) || 0,
          totalMinted: Number(overview.total_minted) || 0,
          totalBurned: Number(overview.total_burned) || 0,
          initTs: overview.init_ts || '',
        }
      } else {
        states[c.id] = { isInit: false, name: '', symbol: '', baseUri: '', owner: c.creator, paused: false, tokenCount: 0, totalMinted: 0, totalBurned: 0, initTs: '' }
      }
    }
    setCollectionStates(states)

    fetchCollectionMetadatas(networkConfig.graphqlEndpoint, allContractIds).then(setCollectionMetadata)

    // Fetch token supplies, minters, template relationships, token info, and receive dates
    const [supplies, mintEvents, templateTokens, tokenInfos, receiveDates] = await Promise.all([
      fetchNftTokenSupplies(networkConfig.hasuraHttp, allContractIds),
      fetchNftMinters(networkConfig.hasuraHttp, allContractIds),
      fetchNftTemplateTokens(networkConfig.hasuraHttp, allContractIds),
      fetchNftTokenInfo(networkConfig.hasuraHttp, allContractIds),
      fetchNftReceiveDates(networkConfig.hasuraHttp, allContractIds, hiveAccount ? `hive:${hiveAccount}` : ''),
    ])

    // Build supply lookup: contractId:tokenId -> supply
    const supplyMap = {}
    for (const s of supplies) {
      supplyMap[`${s.contract_id}:${s.token_id}`] = Number(s.current_supply) || 0
    }

    // Build minter + mint date lookup
    const minterMap = {}
    const mintDateMap = {}
    for (const e of mintEvents) {
      const key = `${e.indexer_contract_id}:${e.token_id}`
      if (!minterMap[key]) {
        minterMap[key] = e.to || ''
        mintDateMap[key] = e.indexer_ts || ''
      }
    }

    // Build template lookup: contractId:tokenId -> templateId
    const templateMap = {}
    for (const t of templateTokens) {
      templateMap[`${t.contract_id}:${t.token_id}`] = t.template_id
    }

    // Build soulbound + hasProperties + maxSupply + createdTs lookups
    const soulboundMap = {}
    const hasPropertiesMap = {}
    const maxSupplyMap = {}
    const createdTsMap = {}
    for (const t of tokenInfos) {
      const key = `${t.contract_id}:${t.token_id}`
      soulboundMap[key] = !!t.soulbound
      hasPropertiesMap[key] = !!t.has_properties
      maxSupplyMap[key] = Number(t.max_supply) || 0
      createdTsMap[key] = t.created_ts || ''
    }

    // Build receive date lookup (most recent transfer to user for each token)
    const receiveDateMap = {}
    for (const r of receiveDates) {
      const key = `${r.indexer_contract_id}:${r.token_id}`
      if (!receiveDateMap[key]) receiveDateMap[key] = r.indexer_ts || ''
    }

    // Build NFT rows from user balances
    const nftRows = []
    for (const b of balances) {
      const bal = Number(b.balance) || 0
      if (bal <= 0) continue
      const overview = overviews.find((o) => o.contract_id === b.contract_id)
      const key = `${b.contract_id}:${b.token_id}`
      const supply = supplyMap[key] || 0
      const maxSupply = maxSupplyMap[key] || 0
      nftRows.push({
        contractId: b.contract_id,
        tokenId: b.token_id,
        balance: bal,
        collectionName: overview?.name || '',
        symbol: overview?.symbol || '',
        paused: !!overview?.paused,
        supply,
        maxSupply,
        isUnique: maxSupply <= 1 && supply <= 1 && bal <= 1,
        minter: minterMap[key] || '',
        mintDate: mintDateMap[key] || createdTsMap[key] || '',
        receivedDate: receiveDateMap[key] || '',
        templateId: templateMap[key] || null,
        soulbound: soulboundMap[key] || false,
        hasProperties: hasPropertiesMap[key] || false,
      })
    }
    setUserNfts(nftRows)

    // Build "your mints" — all tokens in collections the user owns
    const ownedContractSet = new Set(allContracts.filter((c) => {
      const st = states[c.id]
      return st && st.owner === hiveAccount
    }).map((c) => c.id))

    const mintRows = []
    for (const s of supplies) {
      if (!ownedContractSet.has(s.contract_id)) continue
      const sup = Number(s.current_supply) || 0
      if (sup <= 0) continue
      const overview = overviews.find((o) => o.contract_id === s.contract_id)
      const key = `${s.contract_id}:${s.token_id}`
      const maxSup = maxSupplyMap[key] || 0
      mintRows.push({
        contractId: s.contract_id,
        tokenId: s.token_id,
        supply: sup,
        maxSupply: maxSup,
        isUnique: maxSup <= 1 && sup <= 1,
        collectionName: overview?.name || '',
        symbol: overview?.symbol || '',
        minter: minterMap[key] || '',
        templateId: templateMap[key] || null,
        soulbound: soulboundMap[key] || false,
        hasProperties: hasPropertiesMap[key] || false,
      })
    }
    setMintedTokens(mintRows)

    setLoadingNfts(false)
  }, [user, hiveAccount, networkConfig.contractDeployUrl, networkConfig.graphqlEndpoint, networkConfig.hasuraHttp])

  // Fetch user's deployed NFT contracts and balances
  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refreshStates = useCallback(async () => {
    const balances = await fetchNftBalances(networkConfig.hasuraHttp, hiveAccount)
    const balanceContractIds = [...new Set(balances.map((b) => b.contract_id))]
    const ownedContractIds = userCollections.map((c) => c.id)
    const allContractIds = [...new Set([...ownedContractIds, ...balanceContractIds])]

    const overviews = allContractIds.length
      ? await fetchNftOverview(networkConfig.hasuraHttp, allContractIds)
      : []

    const states = {}
    for (const c of userCollections) {
      const overview = overviews.find((o) => o.contract_id === c.id)
      if (overview) {
        states[c.id] = {
          isInit: true,
          name: overview.name || '',
          symbol: overview.symbol || '',
          baseUri: overview.base_uri || '',
          owner: overview.owner || '',
          paused: !!overview.paused,
          tokenCount: Number(overview.token_count) || 0,
          totalMinted: Number(overview.total_minted) || 0,
          totalBurned: Number(overview.total_burned) || 0,
          initTs: overview.init_ts || '',
        }
      } else {
        states[c.id] = { isInit: false, name: '', symbol: '', baseUri: '', owner: c.creator, paused: false, tokenCount: 0, totalMinted: 0, totalBurned: 0, initTs: '' }
      }
    }
    setCollectionStates(states)

    fetchCollectionMetadatas(networkConfig.graphqlEndpoint, allContractIds).then(setCollectionMetadata)

    const [supplies, mintEvents, templateTokens, tokenInfos, receiveDates] = await Promise.all([
      fetchNftTokenSupplies(networkConfig.hasuraHttp, allContractIds),
      fetchNftMinters(networkConfig.hasuraHttp, allContractIds),
      fetchNftTemplateTokens(networkConfig.hasuraHttp, allContractIds),
      fetchNftTokenInfo(networkConfig.hasuraHttp, allContractIds),
      fetchNftReceiveDates(networkConfig.hasuraHttp, allContractIds, hiveAccount ? `hive:${hiveAccount}` : ''),
    ])
    const supplyMap = {}
    for (const s of supplies) supplyMap[`${s.contract_id}:${s.token_id}`] = Number(s.current_supply) || 0
    const minterMap = {}
    const mintDateMap = {}
    for (const e of mintEvents) {
      const key = `${e.indexer_contract_id}:${e.token_id}`
      if (!minterMap[key]) {
        minterMap[key] = e.to || ''
        mintDateMap[key] = e.indexer_ts || ''
      }
    }
    const templateMap = {}
    for (const t of templateTokens) {
      templateMap[`${t.contract_id}:${t.token_id}`] = t.template_id
    }
    const soulboundMap = {}
    const hasPropertiesMap = {}
    const maxSupplyMap = {}
    const createdTsMap = {}
    for (const t of tokenInfos) {
      const key = `${t.contract_id}:${t.token_id}`
      soulboundMap[key] = !!t.soulbound
      hasPropertiesMap[key] = !!t.has_properties
      maxSupplyMap[key] = Number(t.max_supply) || 0
      createdTsMap[key] = t.created_ts || ''
    }
    const receiveDateMap = {}
    for (const r of receiveDates) {
      const key = `${r.indexer_contract_id}:${r.token_id}`
      if (!receiveDateMap[key]) receiveDateMap[key] = r.indexer_ts || ''
    }

    const nftRows = []
    for (const b of balances) {
      const bal = Number(b.balance) || 0
      if (bal <= 0) continue
      const overview = overviews.find((o) => o.contract_id === b.contract_id)
      const key = `${b.contract_id}:${b.token_id}`
      const supply = supplyMap[key] || 0
      const maxSupply = maxSupplyMap[key] || 0
      nftRows.push({
        contractId: b.contract_id,
        tokenId: b.token_id,
        balance: bal,
        collectionName: overview?.name || '',
        symbol: overview?.symbol || '',
        paused: !!overview?.paused,
        supply,
        maxSupply,
        isUnique: maxSupply <= 1 && supply <= 1 && bal <= 1,
        minter: minterMap[key] || '',
        mintDate: mintDateMap[key] || createdTsMap[key] || '',
        receivedDate: receiveDateMap[key] || '',
        templateId: templateMap[key] || null,
        soulbound: soulboundMap[key] || false,
        hasProperties: hasPropertiesMap[key] || false,
      })
    }
    setUserNfts(nftRows)

    // Build "your mints"
    const ownedContractSet = new Set(userCollections.filter((c) => {
      const st = states[c.id]
      return st && st.owner === hiveAccount
    }).map((c) => c.id))

    const mintRows = []
    for (const s of supplies) {
      if (!ownedContractSet.has(s.contract_id)) continue
      const sup = Number(s.current_supply) || 0
      if (sup <= 0) continue
      const overview = overviews.find((o) => o.contract_id === s.contract_id)
      const key = `${s.contract_id}:${s.token_id}`
      const maxSup = maxSupplyMap[key] || 0
      mintRows.push({
        contractId: s.contract_id,
        tokenId: s.token_id,
        supply: sup,
        maxSupply: maxSup,
        isUnique: maxSup <= 1 && sup <= 1,
        collectionName: overview?.name || '',
        symbol: overview?.symbol || '',
        minter: minterMap[key] || '',
        templateId: templateMap[key] || null,
        soulbound: soulboundMap[key] || false,
        hasProperties: hasPropertiesMap[key] || false,
      })
    }
    setMintedTokens(mintRows)
  }, [userCollections, hiveAccount, networkConfig.hasuraHttp])

  // Fetch image URLs from properties for NFTs that have them (or inherit from templates)
  useEffect(() => {
    const allTokens = [...userNfts, ...mintedTokens]
    if (!allTokens.length || !networkConfig.graphqlEndpoint) return

    // Group by contractId — include tokens with own properties AND template IDs
    const byContract = {}
    for (const n of allTokens) {
      if (n.hasProperties) {
        if (!byContract[n.contractId]) byContract[n.contractId] = new Set()
        byContract[n.contractId].add(n.tokenId)
      }
      if (n.templateId) {
        if (!byContract[n.contractId]) byContract[n.contractId] = new Set()
        byContract[n.contractId].add(n.templateId)
      }
    }
    if (!Object.keys(byContract).length) return

    let cancelled = false
    ;(async () => {
      const imageMap = {}
      const nameMap = {}
      for (const [contractId, tokenIdSet] of Object.entries(byContract)) {
        const keys = [...tokenIdSet].map((id) => `props|${id}`)
        try {
          const res = await fetch(networkConfig.graphqlEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query($contractId: String!, $keys: [String!]!) { getStateByKeys(contractId: $contractId, keys: $keys) }`,
              variables: { contractId, keys },
            }),
          })
          const json = await res.json()
          const state = json?.data?.getStateByKeys
          if (!state) continue
          for (const tokenId of tokenIdSet) {
            const val = state[`props|${tokenId}`]
            if (!val) continue
            try {
              let parsed = JSON.parse(val)
              if (typeof parsed === 'string') parsed = JSON.parse(parsed)
              const url = extractImageUrl(parsed)
              if (url) imageMap[`${contractId}:${tokenId}`] = url
              if (parsed?.name) nameMap[`${contractId}:${tokenId}`] = parsed.name
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      // For tokens that inherit from a template, use the template's image/name
      for (const n of allTokens) {
        const key = `${n.contractId}:${n.tokenId}`
        if (n.templateId) {
          const tplKey = `${n.contractId}:${n.templateId}`
          if (!imageMap[key] && imageMap[tplKey]) imageMap[key] = imageMap[tplKey]
          if (!nameMap[key] && nameMap[tplKey]) nameMap[key] = nameMap[tplKey]
        }
      }
      if (!cancelled) {
        setNftImageUrls(imageMap)
        setNftNames(nameMap)
      }
    })()
    return () => { cancelled = true }
  }, [userNfts, mintedTokens, networkConfig.graphqlEndpoint])

  // Real-time subscriptions — only refresh when current user is involved
  useEffect(() => {
    if (!hiveAccount || !networkConfig.hasuraWs) return

    const wsClient = createWSClient({ url: networkConfig.hasuraWs })

    // Transfer events where user is sender or receiver (any contract)
    const transferSub = wsClient.iterate({
      query: `subscription($user: String!) {
        magi_nft_transfer_single_events(
          where: { _or: [{ from: { _eq: $user } }, { to: { _eq: $user } }] }
          order_by: { indexer_block_height: desc }
          limit: 1
        ) { indexer_block_height }
      }`,
      variables: { user: hiveAccount },
    })

    const batchTransferSub = wsClient.iterate({
      query: `subscription($user: String!) {
        magi_nft_transfer_batch_events(
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
        magi_nft_init_events(
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
    listen(batchTransferSub)
    listen(initSub)

    return () => {
      cancelled = true
      wsClient.dispose()
    }
  }, [hiveAccount, networkConfig.hasuraWs, loadAll])

  // ===== Handlers =====

  const handleDeployClick = useCallback(() => {
    if (!user) {
      popup?.openPopup?.({ title: 'Login required', body: 'Please connect your account to deploy an NFT contract.' })
      return
    }
    const capturedAioha = aioha
    const capturedUser = user
    const deployState = { isProcessing: false }
    popup?.openPopup?.({
      title: 'Deploy NFT Contract',
      body: () => (
        <ContractDeployPopup
          onClose={() => popup?.closePopup?.()}
          aioha={capturedAioha}
          user={capturedUser}
          description="Deploy your own NFT contract (aligned with ERC-1155) to the Magi network. In your new collection you can mint nfts."
          filterTag="nft"
          hideSourceTabs
          hideTemplateDropdown
          nameLabel="Collection Name"
          deployButtonLabel="Deploy NFT Contract"
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
      confirmClose: () => deployState.isProcessing ? 'Deployment is in progress. Are you sure you want to close?' : false,
    })
  }, [user, aioha, popup, loadAll])

  const handleInitClick = useCallback((contractId) => {
    const contract = userCollections.find((c) => c.id === contractId)
    popup?.openPopup?.({
      title: 'Initialize NFT Collection',
      body: () => (
        <NftInitPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          defaultName={contract?.name || ''}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, userCollections, refreshStates])

  const handleMintClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftMintPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleMintMoreClick = useCallback((contractId, tokenId, isEditioned) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint — ${state?.symbol || 'NFT'} — ${tokenId}`,
      body: () => (
        <NftMintPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
          initialTokenId={tokenId}
          initialEditioned={isEditioned}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleSendClick = useCallback((contractId, tokenId, balance, isUnique) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Send — ${state?.symbol || 'NFT'} #${tokenId}`,
      body: () => (
        <NftSendPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          tokenId={tokenId}
          balance={balance}
          isUnique={isUnique}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleDistributeClick = useCallback((contractId, tokenId, balance) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Distribute — ${state?.symbol || 'NFT'} #${tokenId}`,
      body: () => (
        <NftDistributePopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          tokenId={tokenId}
          balance={balance}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleBurnClick = useCallback((contractId, tokenId, balance, isUnique) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Burn — ${state?.symbol || 'NFT'} #${tokenId}`,
      body: () => (
        <NftBurnPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          tokenId={tokenId}
          balance={balance}
          isUnique={isUnique}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleHistoryClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `History — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftHistoryPopup
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
          userAccount={hiveAccount}
        />
      ),
      width: '50vw',
    })
  }, [popup, collectionStates, networkConfig.hasuraHttp, hiveAccount])

  const handleCollectionInfoClick = useCallback(async (contractId) => {
    let info = collectionStates[contractId]
    if (!info || !info.isInit) {
      const overviews = await fetchNftOverview(networkConfig.hasuraHttp, [contractId])
      const o = overviews[0]
      if (o) {
        info = {
          name: o.name || '', symbol: o.symbol || '', baseUri: o.base_uri || '',
          owner: o.owner || '', paused: !!o.paused,
          tokenCount: Number(o.token_count) || 0, totalMinted: Number(o.total_minted) || 0,
          totalBurned: Number(o.total_burned) || 0, initTs: o.init_ts || '',
        }
      }
    }
    if (!info) return

    const userNftCount = userNfts.filter((n) => n.contractId === contractId).reduce((sum, n) => sum + n.balance, 0)

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
            {items.map(([label, value]) => (
              <td key={label} style={{ padding: '0.35rem 0.5rem', color: 'var(--color-primary-lightest)', wordBreak: 'break-all' }}>{value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    )

    const iconUrl = collectionMetadata[contractId]?.icon || null
    popup?.openPopup?.({
      title: `${info.symbol || '???'} — Collection Info`,
      body: () => (
        <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', fontSize: 'var(--font-size-base)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: '2px solid var(--color-primary-darkest)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, background: 'rgba(0, 0, 0, 0.5)', overflow: 'hidden',
            }}>
              {iconUrl ? (
                <NftImage src={iconUrl} mode="tile" />
              ) : (
                <span style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {(info.symbol || '???').slice(0, 4)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
              <div style={{ color: 'var(--color-primary-lightest)', fontSize: '1.5rem', fontWeight: 700 }}>
                {info.name || 'Unknown Collection'}
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
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0,
              border: '1px solid var(--color-primary-darkest)', padding: '0.5rem 0.75rem',
            }}>
              <div style={{ color: 'var(--color-primary-darker)' }}>You Own</div>
              <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>
                {userNftCount} NFT{userNftCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Supply table */}
          <InfoTable items={[
            ['Unique Tokens', info.tokenCount],
            ['Total Minted', info.totalMinted],
            ['Total Burned', info.totalBurned],
          ]} />

          {/* Details table */}
          <InfoTable items={[
            ['Contract', (
              <a href={`https://vsc.techcoderx.com/contract/${contractId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                {contractId.slice(0, 8)}...
              </a>
            )],
            ['Base URI', info.baseUri || '-'],
            ['Created', info.initTs ? new Date(info.initTs).toLocaleDateString() : '-'],
          ]} />
        </div>
      ),
      width: '35vw',
    })
  }, [collectionStates, collectionMetadata, userNfts, networkConfig.hasuraHttp, popup])

  const handleNftDetailClick = useCallback(async (nft) => {
    const state = collectionStates[nft.contractId] || {}
    const baseUri = state.baseUri || ''
    let imgSrc = nftImageUrls[`${nft.contractId}:${nft.tokenId}`] || (baseUri ? `${baseUri}${nft.tokenId}` : null)

    // Fetch properties from contract state (own + inherited from template)
    let properties = null
    let inheritedProperties = null
    try {
      const query = `query GetProps($contractId: String!, $keys: [String!]!) {
        getStateByKeys(contractId: $contractId, keys: $keys)
      }`
      const keys = [`props|${nft.tokenId}`]
      if (nft.templateId && nft.templateId !== nft.tokenId) keys.push(`props|${nft.templateId}`)
      const res = await fetch(networkConfig.graphqlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { contractId: nft.contractId, keys } }),
      })
      const json = await res.json()
      const stateData = json?.data?.getStateByKeys
      if (stateData) {
        const ownVal = stateData[`props|${nft.tokenId}`]
        if (ownVal) {
          try { properties = JSON.parse(ownVal) } catch { properties = ownVal }
        }
        if (nft.templateId && nft.templateId !== nft.tokenId) {
          const tplVal = stateData[`props|${nft.templateId}`]
          if (tplVal) {
            try { inheritedProperties = JSON.parse(tplVal) } catch { inheritedProperties = tplVal }
          }
        }
      }
    } catch { /* ignore */ }

    // Effective properties: own if available, otherwise inherited
    const effectiveProperties = properties || inheritedProperties

    // Use image URL from properties if available
    if (effectiveProperties && typeof effectiveProperties === 'object') {
      const propImg = extractImageUrl(effectiveProperties)
      if (propImg) imgSrc = propImg
    }

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
            {items.map(([label, value]) => (
              <td key={label} style={{ padding: '0.35rem 0.5rem', color: 'var(--color-primary-lightest)', wordBreak: 'break-all' }}>{value}</td>
            ))}
          </tr>
        </tbody>
      </table>
    )

    popup?.openPopup?.({
      title: `${state.symbol || '???'} — ${nft.tokenId}`,
      body: () => (
          <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', fontSize: 'var(--font-size-base)', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            {/* Image */}
            <NftImage src={imgSrc} mode="large" />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                <div style={{ color: 'var(--color-primary-lightest)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {nft.tokenId}
                </div>
                <div style={{ color: 'var(--color-primary-darker)' }}>
                  <span onClick={() => { popup?.closePopup?.(); handleCollectionInfoClick(nft.contractId) }} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                    {state.name || state.symbol || nft.contractId.slice(0, 12) + '…'}
                  </span>
                </div>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0,
                border: '1px solid var(--color-primary-darkest)', padding: '0.5rem 0.75rem',
              }}>
                {nft.isUnique ? (
                  <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>Unique</div>
                ) : (
                  <>
                    <div style={{ color: 'var(--color-primary-darker)' }}>Editioned</div>
                    <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>
                      {nft.balance ?? nft.supply ?? '?'}/{nft.maxSupply || nft.supply || '?'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Token info table */}
            <InfoTable items={[
              ['Properties', nft.templateId && nft.tokenId !== nft.templateId ? 'Inherited' : 'Own'],
              ['Soulbound', nft.soulbound ? 'Yes' : 'No'],
              ['Minter', nft.minter ? nft.minter.replace('hive:', '') : '-'],
              ...(nft.templateId && nft.templateId !== nft.tokenId ? [['Template', nft.templateId]] : []),
            ]} />

            {/* Details table */}
            <InfoTable items={[
              ['Contract', (
                <a href={`https://vsc.techcoderx.com/contract/${nft.contractId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  {nft.contractId.slice(0, 8)}...
                </a>
              )],
              ['Collection', state.symbol || '???'],
              ...(baseUri ? [['URI', (
                <span style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>{baseUri}{nft.tokenId}</span>
              )]] : []),
            ]} />

            {/* Properties */}
            {(properties || inheritedProperties) && (
              <div>
                <div style={{ color: 'var(--color-primary-darker)', marginBottom: '0.35rem' }}>
                  Properties
                  {!properties && inheritedProperties && (
                    <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: 'var(--font-size-base)' }}>
                      (inherited from {nft.templateId})
                    </span>
                  )}
                </div>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--color-primary-darkest)',
                  padding: '0.5rem',
                  color: 'var(--color-primary)',
                  fontFamily: 'monospace',
                  fontSize: 'var(--font-size-label)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                  maxHeight: '200px',
                  overflow: 'auto',
                }}>
                  {typeof (properties || inheritedProperties) === 'object' ? JSON.stringify(properties || inheritedProperties, null, 2) : (properties || inheritedProperties)}
                </pre>
              </div>
            )}

          </div>
        ),
      width: '35vw',
    })
  }, [collectionStates, networkConfig.graphqlEndpoint, popup, handleCollectionInfoClick, nftImageUrls])

  const handlePauseToggle = useCallback(async (contractId, isPaused) => {
    const action = isPaused ? 'unpause' : 'pause'
    try {
      const res = await aioha.vscCallContract(contractId, action, {}, 10000, [], KeyTypes.Active)
      if (res?.success) {
        refreshStates()
      } else {
        popup?.openPopup?.({ title: 'Error', body: res?.error || `Failed to ${action}` })
      }
    } catch (err) {
      popup?.openPopup?.({ title: 'Error', body: err.message || `Failed to ${action}` })
    }
  }, [aioha, popup, refreshStates])

  const handleMintBatchClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint Batch — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftMintBatchPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleBatchTransferClick = useCallback((contractId, filteredNfts) => {
    const state = collectionStates[contractId]
    const nftsForCollection = filteredNfts || userNfts.filter((n) => n.contractId === contractId)
    popup?.openPopup?.({
      title: `Batch Transfer — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftBatchTransferPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          userNfts={nftsForCollection}
          collectionInfo={state}
          nftImageUrls={nftImageUrls}
          baseUri={state?.baseUri}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, userNfts, refreshStates, nftImageUrls])

  const handleBurnBatchClick = useCallback((contractId, filteredNfts) => {
    const state = collectionStates[contractId]
    const nftsForCollection = filteredNfts || userNfts.filter((n) => n.contractId === contractId)
    popup?.openPopup?.({
      title: `Batch Burn — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftBurnBatchPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          userNfts={nftsForCollection}
          collectionInfo={state}
          nftImageUrls={nftImageUrls}
          baseUri={state?.baseUri}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, userNfts, refreshStates, nftImageUrls])

  const handleApprovalClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Approval — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftApprovalPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  const handleSetUriClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Set Token URI — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftSetUriPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  const handleSetBaseUriClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Set Base URI — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftSetBaseUriPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  const handleSetPropertiesClick = useCallback((contractId, tokenId, templateId, hasProperties) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Set Properties — ${state?.symbol || 'NFT'} #${tokenId}`,
      body: () => (
        <NftSetPropertiesPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          tokenId={tokenId}
          templateId={templateId && templateId !== tokenId ? templateId : null}
          hasOwnProperties={!!hasProperties}
          collectionInfo={state}
          graphqlEndpoint={networkConfig.graphqlEndpoint}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates, networkConfig])

  const handleChangeOwnerClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Transfer Ownership — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftChangeOwnerPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  const handleMintSeriesClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint Series — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftMintSeriesPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleMintBatchForTemplate = useCallback((contractId, templateTokenId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint Batch — ${state?.symbol || 'NFT'} — ${templateTokenId}`,
      body: () => (
        <NftMintBatchPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          hasuraHttp={networkConfig.hasuraHttp}
          initialTemplateId={templateTokenId}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleMintSeriesForTemplate = useCallback((contractId, templateTokenId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Mint Series — ${state?.symbol || 'NFT'} — ${templateTokenId}`,
      body: () => (
        <NftMintSeriesPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          user={user}
          contractId={contractId}
          collectionInfo={state}
          initialTemplateId={templateTokenId}
          hasuraHttp={networkConfig.hasuraHttp}
        />
      ),
      width: '35vw',
    })
  }, [user, aioha, popup, collectionStates, refreshStates])

  const handleTokenApproveClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Token Approval — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftTokenApprovePopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  const handleSetCollectionMetadataClick = useCallback((contractId) => {
    const state = collectionStates[contractId]
    popup?.openPopup?.({
      title: `Collection Metadata — ${state?.symbol || 'NFT'}`,
      body: () => (
        <NftSetCollectionMetadataPopup
          onClose={() => popup?.closePopup?.()}
          onSuccess={refreshStates}
          aioha={aioha}
          contractId={contractId}
          collectionInfo={state}
        />
      ),
      width: '35vw',
    })
  }, [aioha, popup, collectionStates, refreshStates])

  // ===== Filter & Sort =====

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

  const uniqueCollections = useMemo(() => {
    const seen = new Map()
    for (const n of userNfts) {
      if (!seen.has(n.contractId)) seen.set(n.contractId, n.symbol || n.contractId.slice(0, 8))
    }
    return [...seen.entries()] // [[contractId, label], ...]
  }, [userNfts])

  const uniqueMinters = useMemo(() => {
    const set = new Set()
    for (const n of userNfts) { if (n.minter) set.add(n.minter) }
    return [...set].sort()
  }, [userNfts])

  const filteredSortedNfts = useMemo(() => {
    let rows = userNfts

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter((n) => n.tokenId.toLowerCase().includes(q))
    }

    // Apply filters
    if (filterCollection) rows = rows.filter((n) => n.contractId === filterCollection)
    if (filterType === 'unique') rows = rows.filter((n) => n.isUnique)
    if (filterType === 'editioned') rows = rows.filter((n) => !n.isUnique)
    if (filterMinter) rows = rows.filter((n) => n.minter === filterMinter)
    const dateRangeMs = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000, '1y': 31536000000 }
    if (filterMintDate) {
      const cutoff = Date.now() - dateRangeMs[filterMintDate]
      rows = rows.filter((n) => n.mintDate && new Date(n.mintDate).getTime() >= cutoff)
    }
    if (filterReceivedDate) {
      const cutoff = Date.now() - dateRangeMs[filterReceivedDate]
      rows = rows.filter((n) => n.receivedDate && new Date(n.receivedDate).getTime() >= cutoff)
    }

    // Apply sort
    if (sortCol) {
      const sorted = [...rows]
      sorted.sort((a, b) => {
        let va, vb
        switch (sortCol) {
          case 'collection': va = a.symbol.toLowerCase(); vb = b.symbol.toLowerCase(); break
          case 'tokenId': va = a.tokenId.toLowerCase(); vb = b.tokenId.toLowerCase(); break
          case 'balance': va = a.balance; vb = b.balance; break
          case 'type': va = (a.templateId && a.tokenId !== a.templateId) ? 1 : 0; vb = (b.templateId && b.tokenId !== b.templateId) ? 1 : 0; break
          case 'minter': va = a.soulbound ? 1 : 0; vb = b.soulbound ? 1 : 0; break
          default: return 0
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      return sorted
    }

    return rows
  }, [userNfts, searchQuery, filterCollection, filterType, filterMinter, filterMintDate, filterReceivedDate, sortCol, sortDir])

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

  // ===== Shared tile components =====

  const CollectionTile = ({ contractId, onClick, actions, subtitle }) => {
    const state = collectionStates[contractId]
    const isInitialized = state?.isInit
    const collSymbol = (isInitialized && state.symbol) || '???'
    const collName = (isInitialized && state.name) || ''
    const collIcon = collectionMetadata[contractId]?.icon || null

    return (
      <div
        onClick={onClick}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          padding: '10px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          transition: 'border-color 0.15s', background: 'rgba(0, 0, 0, 0.2)',
          position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
      >
        {actions && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
            {actions}
          </div>
        )}
        <div style={{
          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-primary-darkest)', overflow: 'hidden',
        }}>
          <NftImage src={collIcon} mode="tile" />
        </div>
        <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700, fontSize: 'var(--font-size-base)', textAlign: 'center', wordBreak: 'break-all', width: '100%' }}>
          {collSymbol}
        </div>
        {collName && collName !== collSymbol && (
          <div style={{ color: 'var(--color-primary-darker)', fontSize: 'calc(var(--font-size-base) * 0.75)', textAlign: 'center' }}>
            {collName}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary-darker)' }}>
            {subtitle}
          </div>
        )}
        {!isInitialized && (
          <span style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary)', opacity: 0.7 }}>Not initialized</span>
        )}
        {state?.paused && (
          <span style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary)', opacity: 0.7 }}>Paused</span>
        )}
      </div>
    )
  }

  // ===== Render tabs =====

  // ===== Tiles view helpers =====

  const tilesCollectionData = useMemo(() => {
    const map = {}
    for (const n of filteredSortedNfts) {
      if (!map[n.contractId]) map[n.contractId] = { nfts: [], totalBalance: 0 }
      map[n.contractId].nfts.push(n)
      map[n.contractId].totalBalance += n.balance
    }
    return map
  }, [filteredSortedNfts])

  const selectedCollectionNfts = useMemo(() => {
    if (!tilesSelectedCollection) return []
    return filteredSortedNfts.filter((n) => n.contractId === tilesSelectedCollection)
  }, [tilesSelectedCollection, filteredSortedNfts])

  const renderTilesView = () => {
    if (!tilesSelectedCollection) {
      // Level 1: Collection tiles
      const contractIds = Object.keys(tilesCollectionData)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
            <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>All Collections</span>
            <span style={{ marginLeft: 'auto' }}>{contractIds.length} collection{contractIds.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {contractIds.map((contractId) => {
              const data = tilesCollectionData[contractId]
              return (
                <CollectionTile
                  key={contractId}
                  contractId={contractId}
                  onClick={() => setTilesSelectedCollection(contractId)}
                  subtitle={`${data.nfts.length} NFT${data.nfts.length !== 1 ? 's' : ''}`}
                />
              )
            })}
          </div>
        </div>
      )
    }

    const contractId = tilesSelectedCollection
    const state = collectionStates[contractId] || {}
    const symbol = state.symbol || '???'
    const baseUri = state.baseUri || ''
    // Filter out template NFTs, then group
    const nfts = selectedCollectionNfts.filter((n) => !(n.templateId && n.tokenId === n.templateId))

    // Group children by templateId — only form a group if >1 share the same template
    const tplBuckets = {}
    const noTemplate = []
    for (const n of nfts) {
      if (n.templateId) {
        if (!tplBuckets[n.templateId]) tplBuckets[n.templateId] = []
        tplBuckets[n.templateId].push(n)
      } else {
        noTemplate.push(n)
      }
    }
    const groups = {} // templateId -> children (only if >1)
    const standalone = [...noTemplate]
    for (const [tplId, children] of Object.entries(tplBuckets)) {
      if (children.length > 1) {
        children.sort((a, b) => a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true }))
        groups[tplId] = children
      } else {
        standalone.push(...children)
      }
    }

    const getNftDisplayName = (n) => nftNames[`${n.contractId}:${n.tokenId}`] || n.tokenId

    const renderNftTile = (n) => {
      const imgSrc = nftImageUrls[`${n.contractId}:${n.tokenId}`] || (baseUri ? `${baseUri}${n.tokenId}` : null)
      const displayName = getNftDisplayName(n)
      return (
        <div
          key={`${n.contractId}-${n.tokenId}`}
          onClick={() => handleNftDetailClick(n)}
          style={{
            position: 'relative',
            border: '1px solid var(--color-primary-darkest)',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'border-color 0.15s',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
            <TokenActionMenu items={[
              { label: 'Send', icon: faPaperPlane, onClick: () => handleSendClick(n.contractId, n.tokenId, n.balance, n.isUnique), disabled: n.paused || n.soulbound },
              ...(!n.isUnique ? [{ label: 'Distribute', icon: faBoxesStacked, onClick: () => handleDistributeClick(n.contractId, n.tokenId, n.balance), disabled: n.paused || n.soulbound }] : []),
              { label: 'Burn', icon: faFire, onClick: () => handleBurnClick(n.contractId, n.tokenId, n.balance, n.isUnique), disabled: n.paused },
              { label: 'Approve Operator', icon: faHandshake, onClick: () => handleApprovalClick(n.contractId) },
              { label: 'Approve Token', icon: faKey, onClick: () => handleTokenApproveClick(n.contractId) },
              { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(n.contractId) },
            ]} />
          </div>
          <div style={{
            width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-primary-darkest)', overflow: 'hidden',
          }}>
            <NftImage src={imgSrc} mode="tile" />
          </div>
          <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700, fontSize: 'var(--font-size-base)', textAlign: 'center', wordBreak: 'break-all', width: '100%' }}>
            {displayName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 'calc(var(--font-size-base) * 0.75)' }}>
            <span style={{ color: 'var(--color-primary-darker)' }}>
              {n.isUnique ? 'Unique' : `Editioned (${n.balance}/${n.maxSupply || n.supply})`}
            </span>
            <span style={{ color: 'var(--color-primary-darker)' }}>
              {n.symbol}
            </span>
          </div>
          {n.soulbound && (
            <span style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary)', opacity: 0.7 }}>Soulbound</span>
          )}
        </div>
      )
    }

    const renderTileGrid = (items, pgKey) => {
      const page = getPage(pgKey)
      const total = items.length
      const totalPages = Math.ceil(total / PAGE_SIZE)
      const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      return (
        <>
          {totalPages > 1 && <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
          }}>
            {visible.map(renderNftTile)}
          </div>
          {totalPages > 1 && <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />}
        </>
      )
    }

    const backBtn = (onClick) => (
      <span
        onClick={onClick}
        style={{
          cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center',
          gap: '4px', padding: '2px 6px', border: '1px solid var(--color-primary-darkest)',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
      >
        <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '0.7em' }} />
      </span>
    )

    // ── Level 3: NFTs inside a template group ──
    if (tilesSelectedTemplate) {
      const children = groups[tilesSelectedTemplate] || []
      const tplName = nftNames[`${contractId}:${tilesSelectedTemplate}`] || tilesSelectedTemplate
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)' }}>
            {backBtn(() => setTilesSelectedTemplate(null))}
            <span onClick={() => { setTilesSelectedCollection(null); setTilesSelectedTemplate(null) }} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
              All Collections
            </span>
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
            <span onClick={() => setTilesSelectedTemplate(null)} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
              {symbol}
            </span>
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
            <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>{tplName}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--color-primary-darker)' }}>
              {children.length} NFT{children.length !== 1 ? 's' : ''}
            </span>
          </div>
          {children.length === 0
            ? <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No NFTs in this group.</p>
            : renderTileGrid(children, `tile-tpl-${contractId}:${tilesSelectedTemplate}`)
          }
        </div>
      )
    }

    // ── Level 2: groups + standalone inside a collection ──
    const groupEntries = Object.entries(groups)
    // Build combined tile items: folder tiles for groups + NFT tiles for standalone
    const allItems = []

    // Folder tiles for groups
    for (const [tplId, children] of groupEntries) {
      const tplImgSrc = nftImageUrls[`${contractId}:${tplId}`] || (baseUri ? `${baseUri}${tplId}` : null)
      const tplName = nftNames[`${contractId}:${tplId}`] || tplId
      allItems.push({ type: 'group', tplId, children, tplImgSrc, tplName })
    }
    // Standalone NFT tiles
    for (const n of standalone) {
      allItems.push({ type: 'nft', nft: n })
    }

    const visibleCount = nfts.length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-base)' }}>
          {backBtn(() => { setTilesSelectedCollection(null); setTilesSelectedTemplate(null) })}
          <span onClick={() => { setTilesSelectedCollection(null); setTilesSelectedTemplate(null) }} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
            All Collections
          </span>
          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
          <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>
            {symbol}
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--color-primary-darker)' }}>
            {visibleCount} NFT{visibleCount !== 1 ? 's' : ''}
          </span>
        </div>
        {visibleCount === 0 ? (
          <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No NFTs in this collection.</p>
        ) : (() => {
          const page = getPage(`tile-l2-${contractId}`)
          const total = allItems.length
          const totalPages = Math.ceil(total / PAGE_SIZE)
          const visible = allItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          return (
            <>
              {totalPages > 1 && <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(`tile-l2-${contractId}`, p)} />}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
              }}>
                {visible.map((item) => {
                  if (item.type === 'group') {
                    return (
                      <div
                        key={`grp-${item.tplId}`}
                        onClick={() => setTilesSelectedTemplate(item.tplId)}
                        style={{
                          position: 'relative',
                          border: '1px solid var(--color-primary-darkest)',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'border-color 0.15s',
                          background: 'rgba(0, 0, 0, 0.2)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
                      >
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
                          <TokenActionMenu items={[
                            { label: 'Batch Transfer', icon: faBoxesStacked, onClick: () => handleBatchTransferClick(contractId, item.children) },
                            { label: 'Batch Burn', icon: faLayerGroup, onClick: () => handleBurnBatchClick(contractId, item.children) },
                          ]} />
                        </div>
                        <div style={{
                          position: 'absolute', top: '6px', left: '6px', zIndex: 2,
                          background: 'rgba(0, 0, 0, 0.7)', padding: '2px 6px',
                          fontSize: 'calc(var(--font-size-base) * 0.7)', color: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <FontAwesomeIcon icon={faFolder} style={{ fontSize: '0.7em' }} />
                          {item.children.length}
                        </div>
                        <div style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-primary-darkest)', overflow: 'hidden',
                        }}>
                          <NftImage src={item.tplImgSrc} mode="tile" />
                        </div>
                        <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700, fontSize: 'var(--font-size-base)', textAlign: 'center', wordBreak: 'break-all', width: '100%' }}>
                          {item.tplName}
                        </div>
                        <div style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary-darker)' }}>
                          {item.children.length} NFT{item.children.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )
                  }
                  return renderNftTile(item.nft)
                })}
              </div>
              {totalPages > 1 && <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(`tile-l2-${contractId}`, p)} />}
            </>
          )
        })()}
      </div>
    )
  }

  const renderYourNftsTab = () => {
    if (!user) return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>Log in to see your NFTs.</p>
    if (loading || loadingNfts) {
      return (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
          Loading NFTs...
        </p>
      )
    }
    if (userNfts.length === 0) {
      return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No NFTs found.</p>
    }

    const hasActiveFilters = filterCollection || filterType || filterMinter || filterMintDate || filterReceivedDate

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Toolbar: Filter + View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              ...tabStyle(showFilters),
              flex: 'none',
              padding: '0.4em 0.8em',
              position: 'relative',
            }}
          >
            <FontAwesomeIcon icon={faFilter} style={{ fontSize: '0.75em' }} />
            <span>Filter</span>
            {hasActiveFilters && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--color-primary)',
              }} />
            )}
          </button>
          {hasActiveFilters && (
            <span
              onClick={() => { setFilterCollection(''); setFilterType(''); setFilterMinter(''); setFilterMintDate(''); setFilterReceivedDate('') }}
              style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', cursor: 'pointer', userSelect: 'none' }}
            >
              Clear filters
            </span>
          )}
          <input
            type="text"
            value={searchQuery}
            onInput={(e) => { setSearchQuery(e.target.value); setPageIndexes({}) }}
            placeholder="Search token ID..."
            style={{
              flex: '1 1 120px', maxWidth: '220px', padding: '0.35em 0.6em',
              background: 'transparent', border: '1px solid var(--color-primary-darkest)',
              color: 'var(--color-primary-lightest)', fontSize: 'var(--font-size-base)',
              fontFamily: 'var(--font-family-base)', outline: 'none',
            }}
          />
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
              {filteredSortedNfts.length}{filteredSortedNfts.length !== userNfts.length ? ` / ${userNfts.length}` : ''} NFTs
            </span>
            {/* View mode toggle */}
            <span style={{ display: 'flex', border: '1px solid var(--color-primary-darkest)' }}>
              <span
                onClick={() => setNftViewMode('tiles')}
                style={{
                  padding: '4px 8px', cursor: 'pointer',
                  background: nftViewMode === 'tiles' ? 'var(--color-primary-darker)' : 'transparent',
                  color: nftViewMode === 'tiles' ? 'black' : 'var(--color-primary-darker)',
                  display: 'flex', alignItems: 'center',
                }}
                title="Tiles view"
              >
                <FontAwesomeIcon icon={faGrip} style={{ fontSize: '0.85em' }} />
              </span>
              <span
                onClick={() => { setNftViewMode('table'); setTilesSelectedCollection(null); setTilesSelectedTemplate(null) }}
                style={{
                  padding: '4px 8px', cursor: 'pointer',
                  background: nftViewMode === 'table' ? 'var(--color-primary-darker)' : 'transparent',
                  color: nftViewMode === 'table' ? 'black' : 'var(--color-primary-darker)',
                  display: 'flex', alignItems: 'center',
                  borderLeft: '1px solid var(--color-primary-darkest)',
                }}
                title="Table view"
              >
                <FontAwesomeIcon icon={faList} style={{ fontSize: '0.85em' }} />
              </span>
            </span>
          </span>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem',
            border: '1px solid var(--color-primary-darkest)', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Collection</span>
              <NeonListDropdown
                value={filterCollection}
                onChange={setFilterCollection}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  ...uniqueCollections.map(([id, label]) => ({ value: id, label })),
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Type</span>
              <NeonListDropdown
                value={filterType}
                onChange={setFilterType}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  { value: 'unique', label: 'Unique' },
                  { value: 'editioned', label: 'Editioned' },
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Minter</span>
              <NeonListDropdown
                value={filterMinter}
                onChange={setFilterMinter}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  ...uniqueMinters.map((m) => ({ value: m, label: m.replace('hive:', '') })),
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Mint Date</span>
              <NeonListDropdown
                value={filterMintDate}
                onChange={setFilterMintDate}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  { value: '24h', label: 'Last 24h' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                  { value: '1y', label: 'Last year' },
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Received</span>
              <NeonListDropdown
                value={filterReceivedDate}
                onChange={setFilterReceivedDate}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  { value: '24h', label: 'Last 24h' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                  { value: '1y', label: 'Last year' },
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
          </div>
        )}

        {nftViewMode === 'tiles' ? renderTilesView() : (
          <>
            {/* Table */}
            <DataTable
              headers={[
                { label: <SortHeader label="Token ID" col="tokenId" />, style: {} },
                { label: <SortHeader label="Properties" col="type" />, style: {} },
                { label: <SortHeader label="Soulbound" col="minter" />, style: {} },
                '',
              ]}
              rows={(() => {
                // Group by collection, then by templateId within each collection
                const collections = {}
                for (const n of filteredSortedNfts) {
                  if (!collections[n.contractId]) collections[n.contractId] = []
                  collections[n.contractId].push(n)
                }

                const nftRow = (n, indent) => ({
                  key: `${n.contractId}-${n.tokenId}`,
                  onClick: () => handleNftDetailClick(n),
                  cells: [
                    {
                      content: (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: indent ? '1.2rem' : 0 }}>
                          <NftImage contractId={n.contractId} tokenId={n.tokenId} nftImageUrls={nftImageUrls} baseUri={collectionStates[n.contractId]?.baseUri} mode="avatar" />
                          {n.tokenId}
                          {!n.isUnique && n.balance > 0 && <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>({n.balance})</span>}
                        </span>
                      ),
                      style: indent ? { color: 'var(--color-primary-darker)' } : {},
                    },
                    {
                      content: n.templateId && n.tokenId !== n.templateId ? 'Inherited' : 'Own',
                      style: { color: n.templateId && n.tokenId !== n.templateId ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
                    },
                    {
                      content: n.soulbound ? 'Yes' : 'No',
                      style: { color: n.soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)' },
                    },
                    {
                      content: (
                        <TokenActionMenu items={[
                          { label: 'Send', icon: faPaperPlane, onClick: () => handleSendClick(n.contractId, n.tokenId, n.balance, n.isUnique), disabled: n.paused || n.soulbound },
                          ...(!n.isUnique ? [{ label: 'Distribute', icon: faBoxesStacked, onClick: () => handleDistributeClick(n.contractId, n.tokenId, n.balance), disabled: n.paused || n.soulbound }] : []),
                          { label: 'Burn', icon: faFire, onClick: () => handleBurnClick(n.contractId, n.tokenId, n.balance, n.isUnique), disabled: n.paused },
                          { label: 'Approve Operator', icon: faHandshake, onClick: () => handleApprovalClick(n.contractId) },
                          { label: 'Approve Token', icon: faKey, onClick: () => handleTokenApproveClick(n.contractId) },
                          { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(n.contractId) },
                        ]} />
                      ),
                    },
                  ],
                })

                const nftTableRows = []
                for (const [contractId, nfts] of Object.entries(collections)) {
                  const state = collectionStates[contractId]
                  const collKey = `col:${contractId}`
                  const isCollExp = expandedGroups[collKey] !== false // default expanded
                  const collName = state?.name || nfts[0]?.symbol || contractId.slice(0, 12) + '…'
                  const collSymbol = state?.symbol || nfts[0]?.symbol || '???'

                  // Collection header row
                  const collIconUrl = collectionMetadata[contractId]?.icon || null
                  nftTableRows.push({
                    key: collKey,
                    cells: [
                      {
                        content: (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <span onClick={() => setExpandedGroups((prev) => ({ ...prev, [collKey]: !(prev[collKey] !== false) }))}>
                              <FontAwesomeIcon icon={isCollExp ? faChevronDown : faChevronRight} style={{ fontSize: '0.65rem', width: '10px' }} />
                            </span>
                            {collIconUrl && <NftImage src={collIconUrl} mode="avatar" />}
                            <span onClick={() => handleCollectionInfoClick(contractId)} style={{ cursor: 'pointer', fontWeight: 700 }}>
                              {collSymbol}
                            </span>
                            <span style={{ color: 'var(--color-primary-darker)', fontWeight: 400 }}>
                              {collName !== collSymbol ? collName : ''}
                            </span>
                            <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>({nfts.length})</span>
                          </span>
                        ),
                        style: { color: nfts[0]?.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
                      },
                      '', '', '',
                    ],
                  })

                  if (!isCollExp) continue

                  // Within collection, group by templateId
                  const templateGroups = {}
                  const standalone = []
                  for (const n of nfts) {
                    if (n.templateId) {
                      const gk = `${contractId}:${n.templateId}`
                      if (!templateGroups[gk]) templateGroups[gk] = { template: null, children: [] }
                      if (n.tokenId === n.templateId) templateGroups[gk].template = n
                      else templateGroups[gk].children.push(n)
                    } else {
                      standalone.push(n)
                    }
                  }

                  for (const [gk, group] of Object.entries(templateGroups)) {
                    if (!group.template) {
                      for (const c of group.children) nftTableRows.push(nftRow(c, true))
                      continue
                    }
                    const isExp = !!expandedGroups[gk]
                    const totalCount = 1 + group.children.length
                    // Template group header
                    nftTableRows.push({
                      key: `nft-group-${gk}`,
                      cells: [
                        {
                          content: (
                            <span onClick={() => setExpandedGroups((prev) => ({ ...prev, [gk]: !prev[gk] }))} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingLeft: '1.2rem' }}>
                              <NftImage contractId={contractId} tokenId={group.template.tokenId} nftImageUrls={nftImageUrls} baseUri={state?.baseUri} mode="avatar" />
                              <FontAwesomeIcon icon={isExp ? faChevronDown : faChevronRight} style={{ fontSize: '0.65rem', width: '10px' }} />
                              {group.template.tokenId}
                              <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>({totalCount})</span>
                            </span>
                          ),
                        },
                        { content: 'Own', style: { color: 'var(--color-primary)' } },
                        {
                          content: group.template.soulbound ? 'Yes' : 'No',
                          style: { color: group.template.soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)' },
                        },
                        {
                          content: (
                            <TokenActionMenu items={[
                              { label: 'Batch Transfer', icon: faBoxesStacked, onClick: () => handleBatchTransferClick(contractId, group.children), disabled: group.template.paused },
                              { label: 'Batch Burn', icon: faLayerGroup, onClick: () => handleBurnBatchClick(contractId, group.children), disabled: group.template.paused },
                              { label: 'Approve Operator', icon: faHandshake, onClick: () => handleApprovalClick(contractId) },
                              { label: 'Approve Token', icon: faKey, onClick: () => handleTokenApproveClick(contractId) },
                              { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(contractId) },
                            ]} />
                          ),
                        },
                      ],
                    })
                    if (isExp) {
                      group.children.sort((a, b) => a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true }))
                      const pgKey = `nft-grp-${gk}`
                      const page = getPage(pgKey)
                      const total = group.children.length
                      const totalPages = Math.ceil(total / PAGE_SIZE)
                      const visible = group.children.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                      if (totalPages > 1) nftTableRows.push({ key: `pg-top-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
                      for (const c of visible) nftTableRows.push(nftRow(c, true))
                      if (totalPages > 1) nftTableRows.push({ key: `pg-bot-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
                    }
                  }
                  {
                    const pgKey = `nft-sa-${contractId}`
                    const page = getPage(pgKey)
                    const total = standalone.length
                    const totalPages = Math.ceil(total / PAGE_SIZE)
                    const visible = standalone.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                    if (totalPages > 1) nftTableRows.push({ key: `pg-top-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
                    for (const n of visible) nftTableRows.push(nftRow(n, true))
                    if (totalPages > 1) nftTableRows.push({ key: `pg-bot-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
                  }
                }
                return nftTableRows
              })()}
            />
          </>
        )}
      </div>
    )
  }

  const renderYourCollectionsTab = () => {
    if (!user) return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>Log in to see your NFT collections.</p>
    if (loading || loadingNfts) {
      return (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
          Loading collections...
        </p>
      )
    }

    const ownedCollections = userCollections.filter((c) => {
      const state = collectionStates[c.id]
      if (!state) return true
      return state.owner === hiveAccount
    })

    // Build mints grouped by collection
    let filteredMints = mintedTokens
    if (mintSearchQuery) {
      const q = mintSearchQuery.toLowerCase()
      filteredMints = filteredMints.filter((m) => m.tokenId.toLowerCase().includes(q))
    }
    if (mintFilterType === 'unique') filteredMints = filteredMints.filter((m) => m.isUnique)
    if (mintFilterType === 'editioned') filteredMints = filteredMints.filter((m) => !m.isUnique)
    if (mintFilterSoulbound === 'yes') filteredMints = filteredMints.filter((m) => m.soulbound)
    if (mintFilterSoulbound === 'no') filteredMints = filteredMints.filter((m) => !m.soulbound)
    const hasMintFilters = mintFilterType || mintFilterSoulbound
    const mintsByContract = {}
    for (const m of filteredMints) {
      if (!mintsByContract[m.contractId]) mintsByContract[m.contractId] = []
      mintsByContract[m.contractId].push(m)
    }

    const collectionActions = (contractId) => {
      const state = collectionStates[contractId]
      const isInitialized = state?.isInit
      if (!isInitialized) {
        return <TokenActionMenu items={[
          { label: 'Initialize', icon: faRocket, onClick: () => handleInitClick(contractId) },
        ]} />
      }
      return <TokenActionMenu items={[
        { label: 'Mint', icon: faHammer, onClick: () => handleMintClick(contractId), disabled: state.paused },
        { label: 'Mint Batch', icon: faLayerGroup, onClick: () => handleMintBatchClick(contractId), disabled: state.paused },
        { label: 'Mint Series', icon: faListOl, onClick: () => handleMintSeriesClick(contractId), disabled: state.paused },
        { label: 'Set Base URI', icon: faGlobe, onClick: () => handleSetBaseUriClick(contractId) },
        { label: 'Set Collection Metadata', icon: faFileLines, onClick: () => handleSetCollectionMetadataClick(contractId) },
        { label: state.paused ? 'Unpause' : 'Pause', icon: state.paused ? faPlay : faPause, onClick: () => handlePauseToggle(contractId, state.paused) },
        { label: 'Transfer Ownership', icon: faUserShield, onClick: () => handleChangeOwnerClick(contractId) },
        { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(contractId) },
      ]} />
    }

    const toggleGroup = (groupKey) => {
      setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
    }

    const mintRow = (m, indent) => ({
      key: `${m.contractId}-${m.tokenId}`,
      onClick: () => handleNftDetailClick(m),
      cells: [
        {
          content: (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: indent ? '1.2rem' : 0 }}>
              <NftImage contractId={m.contractId} tokenId={m.tokenId} nftImageUrls={nftImageUrls} baseUri={collectionStates[m.contractId]?.baseUri} mode="avatar" />
              {m.tokenId}
              {!m.isUnique && m.supply > 0 && <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>({m.supply})</span>}
            </span>
          ),
          style: indent ? { color: 'var(--color-primary-darker)' } : {},
        },
        {
          content: m.templateId && m.tokenId !== m.templateId ? 'Inherited' : 'Own',
          style: { color: m.templateId && m.tokenId !== m.templateId ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
        },
        {
          content: m.soulbound ? 'Yes' : 'No',
          style: { color: m.soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)' },
        },
        {
          content: (
            <TokenActionMenu items={[
              { label: 'Mint', icon: faHammer, onClick: () => handleMintMoreClick(m.contractId, m.tokenId, !m.isUnique), disabled: m.paused || m.isUnique },
              { label: 'Send', icon: faPaperPlane, onClick: () => handleSendClick(m.contractId, m.tokenId, m.balance || m.supply, m.isUnique), disabled: m.paused || (m.tokenId === m.templateId) },
              { label: 'Set Properties', icon: faTags, onClick: () => handleSetPropertiesClick(m.contractId, m.tokenId, m.templateId, m.hasProperties) },
              { label: 'Set Token URI', icon: faLink, onClick: () => handleSetUriClick(m.contractId) },
              { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(m.contractId) },
            ]} />
          ),
        },
      ],
    })

    const rows = []
    // Build rows for each owned collection
    for (const c of ownedCollections) {
      const contractId = c.id
      const state = collectionStates[contractId]
      const isInitialized = state?.isInit
      const collKey = `mint-col:${contractId}`
      const isCollExp = expandedGroups[collKey] !== false
      const collSymbol = (isInitialized && state.symbol) || '???'
      const collName = (isInitialized && state.name) || c.name || ''
      const mints = mintsByContract[contractId] || []
      const collIcon = collectionMetadata[contractId]?.icon || null
      const mintCount = mints.length
      const tokenCount = isInitialized ? state.tokenCount : 0

      // Collection header row
      rows.push({
        key: collKey,
        cells: [
          {
            content: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span onClick={() => setExpandedGroups((prev) => ({ ...prev, [collKey]: !(prev[collKey] !== false) }))} style={{ cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={isCollExp ? faChevronDown : faChevronRight} style={{ fontSize: '0.65rem', width: '10px' }} />
                </span>
                {collIcon
                  ? <NftImage src={collIcon} mode="avatar" />
                  : <FontAwesomeIcon icon={state?.paused ? faPause : faImage} style={{ fontSize: '0.75rem', opacity: state?.paused ? 0.6 : 0.5 }} />
                }
                <span onClick={() => handleCollectionInfoClick(contractId)} style={{ cursor: 'pointer', fontWeight: 700 }}>
                  {collSymbol}
                </span>
                {collName && collName !== collSymbol && <span style={{ color: 'var(--color-primary-darker)', fontWeight: 400 }}>{collName}</span>}
                <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>
                  ({mintCount}{isInitialized ? ` / ${tokenCount} tokens` : ''})
                </span>
              </span>
            ),
            style: { color: state?.paused ? 'var(--color-primary-darker)' : 'var(--color-primary)' },
          },
          '', '',
          { content: collectionActions(contractId) },
        ],
      })

      if (!isCollExp) continue

      if (!isInitialized) {
        rows.push({ key: `${collKey}-empty`, cells: [{ content: <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', width: '100%' }}><button onClick={() => handleInitClick(contractId)} style={{ padding: '0.5em 1.2em', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)' }}>Initialize</button></div>, colSpan: 4 }] })
        continue
      }

      if (mints.length === 0) {
        rows.push({ key: `${collKey}-empty`, cells: [{ content: <span style={{ paddingLeft: '1.2rem', color: 'var(--color-primary-darker)' }}>No tokens minted yet</span>, colSpan: 4 }] })
        continue
      }

      // Within collection, group by templateId
      const templateGroups = {}
      const standalone = []
      for (const m of mints) {
        if (m.templateId) {
          const gk = `${contractId}:${m.templateId}`
          if (!templateGroups[gk]) templateGroups[gk] = { template: null, children: [] }
          if (m.tokenId === m.templateId) templateGroups[gk].template = m
          else templateGroups[gk].children.push(m)
        } else {
          standalone.push(m)
        }
      }
      for (const [key, group] of Object.entries(templateGroups)) {
        group.children.sort((a, b) => a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true }))
        if (!group.template) {
          standalone.push(...group.children)
          delete templateGroups[key]
        }
      }

      for (const [groupKey, group] of Object.entries(templateGroups)) {
        const isExpanded = !!expandedGroups[groupKey]
        const totalCount = 1 + group.children.length
        rows.push({
          key: `group-${groupKey}`,
          cells: [
            {
              content: (
                <span onClick={() => toggleGroup(groupKey)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingLeft: '1.2rem' }}>
                  <NftImage contractId={contractId} tokenId={group.template.tokenId} nftImageUrls={nftImageUrls} baseUri={state?.baseUri} mode="avatar" />
                  <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} style={{ fontSize: '0.65rem', width: '10px' }} />
                  {group.template.tokenId}
                  <span style={{ color: 'var(--color-primary-darker)', fontSize: 'var(--font-size-base)' }}>({totalCount})</span>
                </span>
              ),
            },
            { content: 'Own', style: { color: 'var(--color-primary)' } },
            {
              content: group.template.soulbound ? 'Yes' : 'No',
              style: { color: group.template.soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)' },
            },
            {
              content: (
                <TokenActionMenu items={[
                  { label: 'Mint', icon: faHammer, onClick: () => handleMintMoreClick(contractId, group.template.tokenId, !group.template.isUnique), disabled: group.template.paused },
                  { label: 'Mint Series', icon: faListOl, onClick: () => handleMintSeriesForTemplate(contractId, group.template.tokenId), disabled: group.template.paused },
                  { label: 'Batch Transfer', icon: faBoxesStacked, onClick: () => handleBatchTransferClick(contractId, group.children), disabled: group.template.paused },
                  { label: 'Batch Burn', icon: faLayerGroup, onClick: () => handleBurnBatchClick(contractId, group.children), disabled: group.template.paused },
                  { label: 'Set Properties', icon: faTags, onClick: () => handleSetPropertiesClick(contractId, group.template.tokenId, group.template.templateId, group.template.hasProperties) },
                  { label: 'Set Token URI', icon: faLink, onClick: () => handleSetUriClick(contractId) },
                  { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(contractId) },
                ]} />
              ),
            },
          ],
        })
        if (isExpanded) {
          const pgKey = `mint-grp-${groupKey}`
          const page = getPage(pgKey)
          const total = group.children.length
          const totalPages = Math.ceil(total / PAGE_SIZE)
          const visible = group.children.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          if (totalPages > 1) rows.push({ key: `pg-top-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
          for (const child of visible) rows.push(mintRow(child, true))
          if (totalPages > 1) rows.push({ key: `pg-bot-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
        }
      }
      {
        const pgKey = `mint-sa-${contractId}`
        const page = getPage(pgKey)
        const total = standalone.length
        const totalPages = Math.ceil(total / PAGE_SIZE)
        const visible = standalone.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        if (totalPages > 1) rows.push({ key: `pg-top-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
        for (const m of visible) rows.push(mintRow(m, true))
        if (totalPages > 1) rows.push({ key: `pg-bot-${pgKey}`, cells: [{ content: <PageSelector page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />, colSpan: 4 }] })
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handleDeployClick} style={{ ...tabStyle(false), flex: 'none', padding: '0.4em 0.8em' }} title="Create your own NFT contract">
            <FontAwesomeIcon icon={faRocket} style={{ fontSize: '0.75em' }} />
            <span>Create</span>
          </button>
          <button
            onClick={() => setShowMintFilters((v) => !v)}
            style={{
              ...tabStyle(showMintFilters),
              flex: 'none',
              padding: '0.4em 0.8em',
              position: 'relative',
            }}
          >
            <FontAwesomeIcon icon={faFilter} style={{ fontSize: '0.75em' }} />
            <span>Filter</span>
            {hasMintFilters && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--color-primary)',
              }} />
            )}
          </button>
          {hasMintFilters && (
            <span
              onClick={() => { setMintFilterType(''); setMintFilterSoulbound('') }}
              style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', cursor: 'pointer', userSelect: 'none' }}
            >
              Clear
            </span>
          )}
          <input
            type="text"
            value={mintSearchQuery}
            onInput={(e) => { setMintSearchQuery(e.target.value); setPageIndexes({}) }}
            placeholder="Search token ID..."
            style={{
              flex: '1 1 120px', maxWidth: '220px', padding: '0.35em 0.6em',
              background: 'transparent', border: '1px solid var(--color-primary-darkest)',
              color: 'var(--color-primary-lightest)', fontSize: 'var(--font-size-base)',
              fontFamily: 'var(--font-family-base)', outline: 'none',
            }}
          />
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', border: '1px solid var(--color-primary-darkest)' }}>
              <span
                onClick={() => setMintViewMode('tiles')}
                style={{
                  padding: '4px 8px', cursor: 'pointer',
                  background: mintViewMode === 'tiles' ? 'var(--color-primary-darker)' : 'transparent',
                  color: mintViewMode === 'tiles' ? 'black' : 'var(--color-primary-darker)',
                  display: 'flex', alignItems: 'center',
                }}
                title="Tiles view"
              >
                <FontAwesomeIcon icon={faGrip} style={{ fontSize: '0.85em' }} />
              </span>
              <span
                onClick={() => { setMintViewMode('table'); setMintTilesSelectedCollection(null); setMintTilesSelectedTemplate(null) }}
                style={{
                  padding: '4px 8px', cursor: 'pointer',
                  background: mintViewMode === 'table' ? 'var(--color-primary-darker)' : 'transparent',
                  color: mintViewMode === 'table' ? 'black' : 'var(--color-primary-darker)',
                  display: 'flex', alignItems: 'center',
                  borderLeft: '1px solid var(--color-primary-darkest)',
                }}
                title="Table view"
              >
                <FontAwesomeIcon icon={faList} style={{ fontSize: '0.85em' }} />
              </span>
            </span>
          </span>
        </div>
        {showMintFilters && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem',
            border: '1px solid var(--color-primary-darkest)', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Type</span>
              <NeonListDropdown
                value={mintFilterType}
                onChange={setMintFilterType}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  { value: 'unique', label: 'Unique' },
                  { value: 'editioned', label: 'Editioned' },
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', flex: 1 }}>
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lightest)' }}>Soulbound</span>
              <NeonListDropdown
                value={mintFilterSoulbound}
                onChange={setMintFilterSoulbound}
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  { value: 'yes', label: 'Non-transferable' },
                  { value: 'no', label: 'Transferable' },
                ]}
                buttonStyle={{ padding: '0.4rem 2rem 0.4rem 0.6rem', fontSize: 'var(--font-size-base)' }}
              />
            </div>
          </div>
        )}
        {ownedCollections.length === 0 ? (
          <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>You haven't created any NFT collections yet.</p>
        ) : mintViewMode === 'tiles' ? (() => {
          const renderMintNftTile = (m) => {
            const mState = collectionStates[m.contractId] || {}
            const baseUri = mState.baseUri || ''
            const imgSrc = nftImageUrls[`${m.contractId}:${m.tokenId}`] || (baseUri ? `${baseUri}${m.tokenId}` : null)
            const isTemplate = m.tokenId === m.templateId
            return (
              <div
                key={`${m.contractId}-${m.tokenId}`}
                onClick={() => handleNftDetailClick(m)}
                style={{
                  border: '1px solid var(--color-primary-darkest)',
                  padding: '10px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  transition: 'border-color 0.15s', background: 'rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
              >
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
                  <TokenActionMenu items={[
                    { label: 'Mint', icon: faHammer, onClick: () => handleMintMoreClick(m.contractId, m.tokenId, !m.isUnique), disabled: m.paused || m.isUnique },
                    { label: 'Send', icon: faPaperPlane, onClick: () => handleSendClick(m.contractId, m.tokenId, m.balance || m.supply, m.isUnique), disabled: m.paused || isTemplate },
                    { label: 'Burn', icon: faFire, onClick: () => handleBurnClick(m.contractId, m.tokenId, m.balance || m.supply, m.isUnique), disabled: m.paused },
                    { label: 'Set Properties', icon: faTags, onClick: () => handleSetPropertiesClick(m.contractId, m.tokenId, m.templateId, m.hasProperties) },
                    { label: 'Set Token URI', icon: faLink, onClick: () => handleSetUriClick(m.contractId) },
                    { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(m.contractId) },
                  ]} />
                </div>
                <div style={{
                  width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-primary-darkest)', overflow: 'hidden',
                }}>
                  <NftImage src={imgSrc} mode="tile" />
                </div>
                <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700, fontSize: 'var(--font-size-base)', textAlign: 'center', wordBreak: 'break-all', width: '100%' }}>
                  {m.tokenId}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 'calc(var(--font-size-base) * 0.75)' }}>
                  <span style={{ color: 'var(--color-primary-darker)' }}>
                    {m.isUnique ? 'Unique' : `Editioned (${m.supply}/${m.maxSupply || m.supply})`}
                  </span>
                  <span style={{ color: 'var(--color-primary-darker)' }}>
                    {m.symbol}
                  </span>
                </div>
                {m.soulbound && (
                  <span style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary)', opacity: 0.7 }}>Soulbound</span>
                )}
              </div>
            )
          }

          const renderTileGrid = (items, pgKey) => {
            const pg = getPage(pgKey)
            const tot = items.length
            const tp = Math.ceil(tot / PAGE_SIZE)
            const vis = items.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE)
            return (
              <>
                {tp > 1 && <PageSelector page={pg} totalPages={tp} total={tot} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {vis.map(renderMintNftTile)}
                </div>
                {tp > 1 && <PageSelector page={pg} totalPages={tp} total={tot} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(pgKey, p)} />}
              </>
            )
          }

          const backBtn = (onClick) => (
            <span
              onClick={onClick}
              style={{
                cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center',
                gap: '4px', padding: '2px 6px', border: '1px solid var(--color-primary-darkest)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '0.7em' }} />
            </span>
          )

          // ── Level 3: children of a selected template ──
          if (mintTilesSelectedCollection && mintTilesSelectedTemplate) {
            const contractId = mintTilesSelectedCollection
            const templateId = mintTilesSelectedTemplate
            const state = collectionStates[contractId] || {}
            const collSymbol = (state.isInit && state.symbol) || '???'
            const mints = mintsByContract[contractId] || []
            const children = mints.filter((m) => m.templateId === templateId && m.tokenId !== templateId)
            children.sort((a, b) => a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true }))

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)' }}>
                  {backBtn(() => setMintTilesSelectedTemplate(null))}
                  <span onClick={() => { setMintTilesSelectedCollection(null); setMintTilesSelectedTemplate(null) }} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
                    All Collections
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
                  <span onClick={() => setMintTilesSelectedTemplate(null)} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
                    {collSymbol}
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
                  <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>{templateId}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-primary-darker)' }}>
                    {children.length} NFT{children.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {children.length === 0
                  ? <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No child tokens for this template.</p>
                  : renderTileGrid(children, `mtile-tpl-${contractId}:${templateId}`)
                }
              </div>
            )
          }

          // ── Level 2: templates + standalone inside a collection ──
          if (mintTilesSelectedCollection) {
            const contractId = mintTilesSelectedCollection
            const state = collectionStates[contractId] || {}
            const isInitialized = state.isInit
            const collSymbol = (isInitialized && state.symbol) || '???'
            const collName = (isInitialized && state.name) || ''
            const mints = mintsByContract[contractId] || []
            const baseUri = state.baseUri || ''

            // group by template
            const tplGroups = {}
            const standalone = []
            for (const m of mints) {
              if (m.templateId) {
                const gk = m.templateId
                if (!tplGroups[gk]) tplGroups[gk] = { template: null, children: [] }
                if (m.tokenId === m.templateId) tplGroups[gk].template = m
                else tplGroups[gk].children.push(m)
              } else {
                standalone.push(m)
              }
            }
            for (const [key, group] of Object.entries(tplGroups)) {
              group.children.sort((a, b) => a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true }))
              if (!group.template) { standalone.push(...group.children); delete tplGroups[key] }
            }

            // Build tile items: template "folder" tiles + standalone NFT tiles
            const templateEntries = Object.entries(tplGroups)

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)' }}>
                  {backBtn(() => setMintTilesSelectedCollection(null))}
                  <span onClick={() => setMintTilesSelectedCollection(null)} style={{ color: 'var(--color-primary-darker)', cursor: 'pointer' }}>
                    All Collections
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.55em', color: 'var(--color-primary-darkest)' }} />
                  <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>
                    {collSymbol}
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>Actions</span>{collectionActions(contractId)}</span>
                </div>
                {!isInitialized ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}><button onClick={() => handleInitClick(contractId)} style={{ padding: '0.5em 1.2em', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)' }}>Initialize</button></div>
                ) : mints.length === 0 ? (
                  <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No tokens minted yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {/* Template folder tiles */}
                    {templateEntries.map(([tplId, group]) => {
                      const tplImg = nftImageUrls[`${contractId}:${tplId}`] || (baseUri ? `${baseUri}${tplId}` : null)
                      const childCount = group.children.length
                      return (
                        <div
                          key={`tpl-${tplId}`}
                          onClick={() => setMintTilesSelectedTemplate(tplId)}
                          style={{
                            border: '1px solid var(--color-primary-darkest)',
                            padding: '10px', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            transition: 'border-color 0.15s', background: 'rgba(0, 0, 0, 0.2)',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-darkest)' }}
                        >
                          {group.template && (
                            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
                              <TokenActionMenu items={[
                                { label: 'Mint', icon: faHammer, onClick: () => handleMintMoreClick(contractId, tplId, !group.template.isUnique), disabled: group.template.paused },
                                { label: 'Mint Series', icon: faListOl, onClick: () => handleMintSeriesForTemplate(contractId, tplId), disabled: group.template.paused },
                                { label: 'Batch Transfer', icon: faBoxesStacked, onClick: () => handleBatchTransferClick(contractId, group.children), disabled: group.template.paused },
                                { label: 'Batch Burn', icon: faLayerGroup, onClick: () => handleBurnBatchClick(contractId, group.children), disabled: group.template.paused },
                                { label: 'Set Properties', icon: faTags, onClick: () => handleSetPropertiesClick(contractId, tplId, group.template.templateId, group.template.hasProperties) },
                                { label: 'Set Token URI', icon: faLink, onClick: () => handleSetUriClick(contractId) },
                                { label: 'History', icon: faClockRotateLeft, onClick: () => handleHistoryClick(contractId) },
                              ]} />
                            </div>
                          )}
                          <div style={{
                            position: 'absolute', top: '6px', left: '6px', zIndex: 2,
                            background: 'rgba(0, 0, 0, 0.7)', padding: '2px 6px',
                            fontSize: 'calc(var(--font-size-base) * 0.7)', color: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <FontAwesomeIcon icon={faFolder} style={{ fontSize: '0.7em' }} />
                            {childCount}
                          </div>
                          <div style={{
                            width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-primary-darkest)', overflow: 'hidden',
                          }}>
                            <NftImage src={tplImg} mode="tile" />
                          </div>
                          <div style={{ color: 'var(--color-primary-lightest)', fontWeight: 700, fontSize: 'var(--font-size-base)', textAlign: 'center', wordBreak: 'break-all', width: '100%' }}>
                            {tplId}
                          </div>
                          <div style={{ fontSize: 'calc(var(--font-size-base) * 0.75)', color: 'var(--color-primary-darker)' }}>
                            Template · {childCount} child{childCount !== 1 ? 'ren' : ''}
                          </div>
                        </div>
                      )
                    })}
                    {/* Standalone NFT tiles */}
                    {standalone.map(renderMintNftTile)}
                  </div>
                )}
              </div>
            )
          }

          // ── Level 1: collection tiles ──
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
                <span style={{ color: 'var(--color-primary-lightest)', fontWeight: 700 }}>All Collections</span>
                <span style={{ marginLeft: 'auto' }}>{ownedCollections.length} collection{ownedCollections.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {ownedCollections.map((c) => {
                  const contractId = c.id
                  const mints = mintsByContract[contractId] || []
                  const state = collectionStates[contractId]
                  const isInitialized = state?.isInit
                  const tokenCount = isInitialized ? state.tokenCount : 0
                  return (
                    <CollectionTile
                      key={contractId}
                      contractId={contractId}
                      onClick={() => setMintTilesSelectedCollection(contractId)}
                      actions={collectionActions(contractId)}
                      subtitle={`${mints.length} minted${isInitialized ? ` / ${tokenCount} tokens` : ''}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })() : (
          <DataTable
            headers={[
              { label: <SortHeader label="Token ID" col="tokenId" /> },
              { label: <SortHeader label="Properties" col="type" /> },
              { label: <SortHeader label="Soulbound" col="soulbound" /> },
              '',
            ]}
            rows={rows}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button className="tabs-button" onClick={() => setActiveTab(TABS.YOUR_NFTS)} style={tabStyle(activeTab === TABS.YOUR_NFTS)}>
          <FontAwesomeIcon icon={faWallet} style={{ fontSize: '0.75em' }} />
          <span>Your NFTs</span>
        </button>
        <button className="tabs-button" onClick={() => setActiveTab(TABS.YOUR_COLLECTIONS)} style={tabStyle(activeTab === TABS.YOUR_COLLECTIONS)}>
          <FontAwesomeIcon icon={faHammer} style={{ fontSize: '0.75em' }} />
          <span>Your Collections</span>
        </button>
      </div>

      <div style={{ paddingRight: '12px' }}>
        {activeTab === TABS.YOUR_NFTS && renderYourNftsTab()}
        {activeTab === TABS.YOUR_COLLECTIONS && renderYourCollectionsTab()}
      </div>
    </div>
  )
}
