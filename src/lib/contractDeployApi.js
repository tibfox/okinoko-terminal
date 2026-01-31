/**
 * API client for the okinoko-contractdeploy service
 *
 * This service handles the preparation of VSC smart contract deployments.
 * The actual signing and broadcasting is done via aioha in the frontend.
 */

const DEFAULT_SERVICE_URL = import.meta.env.VITE_CONTRACT_DEPLOY_URL || 'http://localhost:8090'

/**
 * Start a new contract deployment and return deployment ID for log streaming
 *
 * @param {Object} params - Deployment parameters
 * @param {File} params.wasmFile - The WASM file to deploy
 * @param {string} params.name - Contract name
 * @param {string} [params.description] - Contract description
 * @param {string} [params.owner] - Contract owner (defaults to deployer)
 * @param {boolean} [params.dryRun=false] - If true, simulate without actual deployment
 * @param {string} [params.network] - Network ID (e.g., 'vsc-mainnet' or 'vsc-testnet')
 * @param {string} [params.serviceUrl] - Override service URL
 * @returns {Promise<Object>} Object with deployment_id for log streaming
 */
export async function startDeploy({
  wasmFile,
  name,
  description = '',
  owner = '',
  dryRun = false,
  network = 'vsc-mainnet',
  serviceUrl = DEFAULT_SERVICE_URL,
}) {
  const formData = new FormData()
  formData.append('wasm', wasmFile)
  formData.append('name', name)
  formData.append('description', description)
  formData.append('owner', owner)
  formData.append('dry_run', dryRun.toString())
  formData.append('network', network)

  const response = await fetch(`${serviceUrl}/api/prepare-deploy`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  return response.json()
}

/**
 * Start a contract update and return deployment ID for log streaming
 *
 * @param {Object} params - Update parameters
 * @param {string} params.contractId - Existing contract ID to update
 * @param {File} [params.wasmFile] - New WASM file (optional, only if updating code)
 * @param {string} [params.name] - New contract name
 * @param {string} [params.description] - New contract description
 * @param {string} [params.owner] - New contract owner
 * @param {boolean} [params.dryRun=false] - If true, simulate without actual update
 * @param {string} [params.network] - Network ID (e.g., 'vsc-mainnet' or 'vsc-testnet')
 * @param {string} [params.serviceUrl] - Override service URL
 * @returns {Promise<Object>} Object with deployment_id for log streaming
 */
export async function startUpdate({
  contractId,
  wasmFile = null,
  name = '',
  description = '',
  owner = '',
  dryRun = false,
  network = 'vsc-mainnet',
  serviceUrl = DEFAULT_SERVICE_URL,
}) {
  const formData = new FormData()
  formData.append('contract_id', contractId)
  if (wasmFile) {
    formData.append('wasm', wasmFile)
  }
  formData.append('name', name)
  formData.append('description', description)
  formData.append('owner', owner)
  formData.append('dry_run', dryRun.toString())
  formData.append('network', network)

  const response = await fetch(`${serviceUrl}/api/prepare-update`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  return response.json()
}

/**
 * Subscribe to deployment logs via Server-Sent Events
 *
 * @param {string} deploymentId - The deployment ID to subscribe to
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onLog - Called for each log entry
 * @param {Function} callbacks.onDone - Called when deployment is complete
 * @param {Function} callbacks.onError - Called on error
 * @param {string} [serviceUrl] - Override service URL
 * @returns {Function} Cleanup function to close the connection
 */
export function subscribeToLogs(deploymentId, callbacks, serviceUrl = DEFAULT_SERVICE_URL) {
  const { onLog, onDone, onResult, onError } = callbacks

  const eventSource = new EventSource(`${serviceUrl}/api/logs/${deploymentId}`)

  eventSource.onmessage = (event) => {
    try {
      const logEntry = JSON.parse(event.data)
      if (onLog) onLog(logEntry)
    } catch (err) {
      console.error('Failed to parse log entry:', err)
    }
  }

  // Handle result event (contains operations for signing)
  eventSource.addEventListener('result', (event) => {
    try {
      const result = JSON.parse(event.data)
      if (onResult) onResult(result)
    } catch (err) {
      console.error('Failed to parse result:', err)
    }
  })

  eventSource.addEventListener('done', () => {
    eventSource.close()
    if (onDone) onDone()
  })

  eventSource.onerror = (err) => {
    console.error('SSE error:', err)
    eventSource.close()
    if (onError) onError(err)
  }

  // Return cleanup function
  return () => {
    eventSource.close()
  }
}

/**
 * Check if the contract deploy service is healthy
 *
 * @param {string} [serviceUrl] - Override service URL
 * @returns {Promise<boolean>} True if service is healthy
 */
export async function checkHealth(serviceUrl = DEFAULT_SERVICE_URL) {
  try {
    const response = await fetch(`${serviceUrl}/health`)
    const data = await response.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Replace username placeholders in operations
 *
 * @param {Array} operations - Operations from prepare response
 * @param {string} username - Hive username to substitute
 * @returns {Array} Operations with username substituted
 */
export function substituteUsername(operations, username) {
  return operations.map(op => {
    const opData = JSON.parse(
      JSON.stringify(op.data).replace(/\{\{username\}\}/g, username)
    )
    return [op.type, opData]
  })
}

/**
 * Calculate contract ID from transaction ID
 * VSC contract IDs are prefixed with "vs4" followed by first 8 chars of txid
 *
 * @param {string} txId - Transaction ID from broadcast
 * @returns {string} Contract ID
 */
export function calculateContractId(txId) {
  return `vs4${txId.substring(0, 8)}`
}

// Legacy exports for backwards compatibility
export const prepareDeploy = startDeploy
export const prepareUpdate = startUpdate
