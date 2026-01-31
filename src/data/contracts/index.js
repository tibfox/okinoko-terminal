import escrow from './escrow.json'
import gamesInaro from './games-inaro.json'
import dao from './dao.json'
import sdkTests from './sdk-tests.json'
import lottery from './lottery.json'
import gamesGoraku from './games-goraku.json'
import prizes from './prizes.json'
import { getNetworkConfigFromCookie } from '../../components/terminal/providers/NetworkTypeProvider.jsx'

const rawContracts = [
  escrow,
  gamesInaro,
  dao,
  sdkTests,
  lottery,
  gamesGoraku,
  prizes,
]

// Swap vscId with testnetVscId when on testnet
const networkConfig = getNetworkConfigFromCookie()
const isTestnet = networkConfig.vscNetworkId === 'vsc-testnet'

export const contracts = rawContracts.map(contract => {
  if (isTestnet && contract.testnetVscId) {
    return { ...contract, vscId: contract.testnetVscId }
  }
  return contract
})

export default { contracts }
