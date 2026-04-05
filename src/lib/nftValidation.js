// Contract-enforced limits from magi_nft-contract/contract/internal.go
export const MAX_NAME_LEN = 64
export const MAX_SYMBOL_LEN = 16
export const MAX_URI_LEN = 1024
export const MAX_TOKEN_ID_LEN = 256
export const MAX_ADDRESS_LEN = 256

export function validateTokenId(id) {
  if (id.length > MAX_TOKEN_ID_LEN) return `Token ID exceeds ${MAX_TOKEN_ID_LEN} characters`
  if (id.includes('|')) return 'Token ID cannot contain the pipe character (|)'
  return null
}

export function validateAddress(addr) {
  if (addr.length > MAX_ADDRESS_LEN) return `Address exceeds ${MAX_ADDRESS_LEN} characters`
  if (addr.includes('|')) return 'Address cannot contain the pipe character (|)'
  return null
}
