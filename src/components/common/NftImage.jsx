import { useState, useEffect } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faSpinner } from '@fortawesome/free-solid-svg-icons'

/**
 * Unified NFT image component with loading/fallback handling.
 *
 * Props:
 *   src          - Direct image URL (highest priority)
 *   contractId   - Contract ID for lookup in nftImageUrls
 *   tokenId      - Token ID for lookup in nftImageUrls / baseUri
 *   nftImageUrls - Map of 'contractId:tokenId' -> image URL
 *   baseUri      - Collection base URI (fallback: baseUri + tokenId)
 *   mode         - 'avatar' | 'tile' | 'large' (default: 'tile')
 */

const avatarSize = '1.6rem'

export default function NftImage({ src: directSrc, contractId, tokenId, nftImageUrls, baseUri, mode = 'tile' }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'fail'
  const [aspectRatio, setAspectRatio] = useState(null)

  const src = directSrc
    || (nftImageUrls && contractId && tokenId ? nftImageUrls[`${contractId}:${tokenId}`] : null)
    || (baseUri && tokenId ? `${baseUri}${tokenId}` : null)

  useEffect(() => {
    if (!src) { setStatus('fail'); return }
    setStatus('loading')
    setAspectRatio(null)
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight)
      }
      setStatus('ok')
    }
    img.onerror = () => setStatus('fail')
    img.src = src
    return () => { img.onload = null; img.onerror = null }
  }, [src])

  if (mode === 'avatar') {
    const style = {
      width: avatarSize,
      height: avatarSize,
      borderRadius: '50%',
      objectFit: 'cover',
      flexShrink: 0,
    }
    if (status === 'ok') {
      return <img src={src} alt={tokenId || ''} style={style} />
    }
    return (
      <span style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-primary-darkest)' }}>
        <FontAwesomeIcon icon={faImage} style={{ fontSize: '0.65rem', opacity: 0.5 }} />
      </span>
    )
  }

  if (mode === 'large') {
    const containerBase = {
      width: '100%',
      border: '1px solid var(--color-primary-darkest)',
      background: 'rgba(0, 0, 0, 0.5)',
    }
    if (status === 'loading') {
      return (
        <div style={{ ...containerBase, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '2rem', color: 'var(--color-primary-darkest)' }} />
        </div>
      )
    }
    if (status === 'ok') {
      return (
        <div style={containerBase}>
          <img src={src} alt={tokenId || ''} style={{ width: '100%', display: 'block' }} />
        </div>
      )
    }
    return (
      <div style={{ ...containerBase, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesomeIcon icon={faImage} style={{ fontSize: '3rem', color: 'var(--color-primary-darkest)' }} />
      </div>
    )
  }

  // mode === 'tile' (default)
  if (status === 'loading') return <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '1rem', color: 'var(--color-primary-darkest)' }} />
  if (status !== 'ok') return <FontAwesomeIcon icon={faImage} style={{ fontSize: '2rem', color: 'var(--color-primary-darkest)' }} />
  return <img src={src} alt={tokenId || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}
