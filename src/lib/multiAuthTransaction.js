const HIVE_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://hive-api.arcange.eu',
]

let dhiveModule = null
let client = null

async function getDhive() {
  if (!dhiveModule) {
    dhiveModule = await import('@hiveio/dhive')
    client = new dhiveModule.Client(HIVE_NODES)
  }
  return { dhive: dhiveModule, client }
}

/**
 * Creates a transfer transaction that requires signatures from multiple active authorities.
 * Signs with the first authority's key and returns the partially signed transaction
 * for the second authority to sign via aioha.
 *
 * @param {Object} options
 * @param {string} options.from - The account sending the transfer
 * @param {string} options.to - The account receiving the transfer
 * @param {string} options.amount - Amount with asset (e.g., "0.001 HIVE")
 * @param {string} options.memo - Transaction memo
 * @param {string} options.firstSignerUsername - First signer's username (from env)
 * @param {string} options.firstSignerActiveKey - First signer's active private key (from env)
 * @param {string} options.secondSignerUsername - Second signer's username (aioha user)
 * @returns {Promise<Object>} The partially signed transaction
 */
export async function createMultiAuthTransfer({
  from,
  to,
  amount,
  memo,
  firstSignerUsername,
  firstSignerActiveKey,
  secondSignerUsername,
}) {
  const { dhive, client } = await getDhive()

  // Get dynamic global properties for transaction header
  const props = await client.database.getDynamicGlobalProperties()

  // Calculate expiration (30 minutes from now)
  const expireTime = new Date(Date.now() + 30 * 60 * 1000)

  // Create the transfer operation
  // Note: For multi-auth, the 'from' account needs to be configured with multiple authorities
  const operation = [
    'transfer',
    {
      from,
      to,
      amount,
      memo,
    },
  ]

  // Build the transaction
  const transaction = {
    ref_block_num: props.head_block_number & 0xFFFF,
    ref_block_prefix: Buffer.from(props.head_block_id, 'hex').readUInt32LE(4),
    expiration: expireTime.toISOString().slice(0, -5),
    operations: [operation],
    extensions: [],
  }

  // Sign with the first authority's key
  const privateKey = dhive.PrivateKey.fromString(firstSignerActiveKey)
  const signedTransaction = client.broadcast.sign(transaction, privateKey)

  return {
    transaction: signedTransaction,
    requiredAuths: [firstSignerUsername, secondSignerUsername],
  }
}

/**
 * Signs an existing transaction with an additional key using dhive.
 *
 * @param {Object} transaction - The transaction to sign
 * @param {string} privateKey - The private key to sign with
 * @returns {Promise<Object>} The transaction with additional signature
 */
export async function addSignature(transaction, privateKey) {
  const { dhive, client } = await getDhive()
  const key = dhive.PrivateKey.fromString(privateKey)
  return client.broadcast.sign(transaction, key)
}

/**
 * Broadcasts a fully signed transaction to the Hive blockchain.
 *
 * @param {Object} transaction - The fully signed transaction
 * @returns {Promise<Object>} Broadcast result
 */
export async function broadcastTransaction(transaction) {
  const { client } = await getDhive()
  return client.broadcast.send(transaction)
}

/**
 * Gets the serialized transaction digest that needs to be signed.
 * This can be used when the second signer needs to sign via a different method.
 *
 * @param {Object} transaction - The transaction to get digest for
 * @returns {Promise<string>} The hex-encoded digest
 */
export async function getTransactionDigest(transaction) {
  const { dhive, client } = await getDhive()
  const buffer = client.broadcast.serialize(transaction)
  const digest = dhive.cryptoUtils.sha256(buffer)
  return digest.toString('hex')
}

export async function getClient() {
  const { client } = await getDhive()
  return client
}
