import { useContext } from 'preact/hooks'
import { PopupContext } from '../../popup/context.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHeart } from '@fortawesome/free-solid-svg-icons'

export default function GamblingInfoIcon({ size = 18, style, context = 'lottery' }) {
  const popup = useContext(PopupContext)
  const isGameContext = context === 'game'

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        popup?.openPopup?.({
          title: 'Responsible Play',
          body: () => (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center',
              padding: '10px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '10px',
                paddingTop: '20px'
              }}>
                <FontAwesomeIcon
                  icon={faShieldHeart}
                  style={{
                    fontSize: '64px',
                    color: 'var(--color-primary, #00f5ff)',
                    filter: 'drop-shadow(0 0 8px var(--color-primary, #00f5ff))'
                  }}
                />
              </div>

              <div style={{
                textAlign: 'center',
                lineHeight: 1.6,
                color: 'var(--color-primary-lighter, #9be8ff)',
                fontSize: '0.85rem'
              }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>@tibfox does not endorse gambling</strong> and encourages responsible play.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  {isGameContext ? (
                    <>
                      Playing is <strong>100% optional</strong> and if you want to join: <strong>only stake what you can lose.</strong> Gambling can become addictive — seek help if you need it.
                    </>
                  ) : (
                    <>
                      Gambling can become addictive — seek help if you need it.
                    </>
                  )}
                </p>
              </div>

              <div style={{
                borderTop: '1px solid var(--color-primary-darker, #004d5a)',
                paddingTop: '16px'
              }}>
                <p style={{
                  marginBottom: '10px',
                  fontSize: '0.95rem',
                  color: 'var(--color-primary-lighter, #9be8ff)'
                }}>
                  If you think you have a gambling problem:
                </p>
                <a
                  href="https://www.gambleaware.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-primary, #00f5ff)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    display: 'inline-block',
                    padding: '8px 16px',
                    border: '1px solid var(--color-primary, #00f5ff)',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    background: 'rgba(0, 245, 255, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(0, 245, 255, 0.15)'
                    e.target.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(0, 245, 255, 0.05)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  GambleAware →
                </a>
              </div>
            </div>
          ),
        })
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '6px',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        ...(style || {}),
      }}
      aria-label="Responsible gambling info"
    >
      <span
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          border: '1px solid var(--color-primary-lighter, #00f5ff)',
          background: 'transparent',
          color: 'var(--color-primary-lighter, #00f5ff)',
          fontSize: size * 0.7,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        i
      </span>
    </button>
  )
}
