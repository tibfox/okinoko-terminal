import { useState, useCallback } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faCheck, faShareNodes } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonIconButton from '../buttons/NeonIconButton.jsx'
import { copyDeepLinkToClipboard } from '../../hooks/useDeepLink.js'

/**
 * CopyUrlButton - Reusable component for copying deep link URLs
 *
 * @param {string} type - Deep link type (from DEEP_LINK_TYPES)
 * @param {string|number} id - Entity ID to include in the deep link
 * @param {string} label - Button label (default: "Share")
 * @param {string} copiedLabel - Label shown after copying (default: "Copied!")
 * @param {string} icon - Icon to use: "link" or "share" (default: "share")
 * @param {boolean} iconOnly - If true, show only the icon without label (default: false)
 * @param {object} style - Additional styles for the button
 * @param {function} onClick - Optional additional click handler
 */
export default function CopyUrlButton({
  type,
  id,
  label = 'Share',
  copiedLabel = 'Copied!',
  icon = 'share',
  iconOnly = false,
  style = {},
  onClick,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (e) => {
    e?.stopPropagation?.()
    const success = await copyDeepLinkToClipboard(type, id)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    onClick?.(e)
  }, [type, id, onClick])

  const iconComponent = icon === 'share' ? faShareNodes : faLink

  const iconElement = (
    <FontAwesomeIcon
      icon={copied ? faCheck : iconComponent}
      style={{ fontSize: '0.9rem' }}
    />
  )

  if (iconOnly) {
    return (
      <NeonIconButton
        onClick={handleCopy}
        style={style}
        title="Copy shareable link"
      >
        {iconElement}
      </NeonIconButton>
    )
  }

  const baseStyle = {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-lighter)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontStyle: 'normal',
    fontSize: 'var(--font-size-base)',
    padding: '0.35em 0.8em',
    cursor: 'pointer',
    border: '1px solid var(--color-primary-darkest)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    ...style,
  }

  return (
    <NeonButton
      onClick={handleCopy}
      style={baseStyle}
      title="Copy shareable link"
    >
      {iconElement}
      <span>{copied ? copiedLabel : label}</span>
    </NeonButton>
  )
}
