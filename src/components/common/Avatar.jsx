import { useState } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserAstronaut } from '@fortawesome/free-solid-svg-icons'

/**
 * Reusable Avatar component for displaying user avatars
 * @param {string} username - The username (with or without 'hive:' prefix)
 * @param {number} size - Size in pixels (default: 140)
 * @param {string} link - Optional URL to wrap avatar in a link
 * @param {string} fallbackChar - Optional character to show in fallback (defaults to icon)
 */
export default function Avatar({ username, size = 140, link, fallbackChar }) {
  const [avatarError, setAvatarError] = useState(false)

  const hiveUser = (username || '').startsWith('hive:')
    ? (username || '').replace(/^hive:/, '')
    : (username || '')
  const avatarUrl = hiveUser ? `https://images.hive.blog/u/${hiveUser}/avatar` : null

  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: '2px solid var(--color-primary)',
    boxShadow: '0 0 10px rgba(0,0,0,0.6)',
  }

  const avatarContent = avatarUrl && !avatarError ? (
    <img
      src={avatarUrl}
      alt={`${hiveUser || 'User'} avatar`}
      onError={() => setAvatarError(true)}
      style={{
        ...baseStyle,
        objectFit: 'cover',
      }}
    />
  ) : (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary)',
        background: fallbackChar ? 'var(--color-primary-darkest)' : 'transparent',
        fontSize: 'var(--font-size-base)',
      }}
    >
      {fallbackChar ? (
        fallbackChar
      ) : (
        <FontAwesomeIcon
          icon={faUserAstronaut}
          style={{ fontSize:'0.9rem'}}
        />
      )}
    </div>
  )

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        {avatarContent}
      </a>
    )
  }

  return avatarContent
}
