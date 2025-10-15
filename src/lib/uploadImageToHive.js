// Uploads an image to Ecency image host using the same flow as HiveFlutterKit.
// Token is a base64 JSON of { signed_message, authors, timestamp, signatures[] },
// signed with the POSTING key. The token goes in the URL path, not the body.


async function signMessageWithPosting(messageJson, username) {
  // Try provider (aioha) first, then fall back to Hive Keychain
  const pi = typeof aioha?.getPI === 'function' ? aioha.getPI() : null

  // 1) Provider has signMessage?
  if (pi && typeof pi.signMessage === 'function') {
    const res = await pi.signMessage(messageJson, 'posting')
    // Normalize possible shapes: {success:boolean,result:string} or just string
    if (res && typeof res === 'object') {
      if (res.success && res.result) return res.result
      throw new Error(res.error || 'Provider signMessage failed')
    }
    if (typeof res === 'string') return res
  }

  // 2) Hive Keychain
  if (typeof window !== 'undefined' && window.hive_keychain) {
    return await new Promise((resolve, reject) => {
      window.hive_keychain.requestSignBuffer(
        username,
        messageJson,
        'Posting', // Posting key
        (resp) => {
          if (resp?.success && resp?.result) resolve(resp.result)
          else reject(new Error(resp?.error || resp?.message || 'Keychain signing failed'))
        }
      )
    })
  }

  throw new Error('No signing provider available (aioha/hive_keychain not found).')
}

export async function uploadImageToHive(file, username) {
  if (!username) throw new Error('Username missing')
  if (!(file instanceof File)) throw new Error('Invalid file object')

  // Ecency endpoint used by Flutter kit
  const uploadUrlServer = 'https://images.ecency.com/hs'

  // Build message (exactly like Flutter)
  const messageObj = {
    signed_message: { type: 'posting', app: 'okinoko.app' }, // app id is arbitrary
    authors: [username],
    timestamp: Math.floor(Date.now() / 1000),
  }

  // Sign the message with POSTING key
  const signature = await signMessageWithPosting(JSON.stringify(messageObj), username)
  messageObj.signatures = [signature]

  // Base64-encode message object to token (Unicode safe)
  const token = btoa(unescape(encodeURIComponent(JSON.stringify(messageObj))))

  // POST to `${server}/${token}` with multipart body containing ONLY the file
  const url = `${uploadUrlServer}/${token}`
  const form = new FormData()
  // Browser will set correct part Content-Type from file.type
  form.append('file', file, file.name)

  const res = await fetch(url, { method: 'POST', body: form })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || !json?.url) {
    throw new Error(`Image upload failed: ${json?.error?.name || JSON.stringify(json) || res.status}`)
  }
  return json.url
}
