import { useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCheck } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'

/**
 * Navigation buttons for wizard (Previous / Next / Submit)
 */
export default function WizardNavigation({
  onPrev,
  onNext,
  canGoBack = true,
  canGoForward = true,
  isFirstStep = false,
  isLastStep = false,
  nextLabel,
  prevLabel = 'Back',
  submitLabel = 'Create',
  isSubmitting = false,
  validationIssues = [],
}) {
  const resolvedNextLabel = nextLabel || (isLastStep ? submitLabel : 'Next')
  const [tooltip, setTooltip] = useState(null)

  const isNextDisabled = !canGoForward || isSubmitting
  const hasValidationIssues = validationIssues.length > 0
  const showTooltip = isNextDisabled && !isSubmitting

  const handleMouseEnter = (e) => {
    if (!showTooltip) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  return (
    <div className="wizard-navigation">
      <NeonButton
        onClick={onPrev}
        disabled={isFirstStep || !canGoBack || isSubmitting}
        style={{
          visibility: isFirstStep ? 'hidden' : 'visible',
        }}
      >
        <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '0.5rem' }} />
        <span>{prevLabel}</span>
      </NeonButton>

      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block' }}
      >
        <NeonButton
          onClick={onNext}
          disabled={isNextDisabled}
        >
          <span>{isSubmitting ? 'Processing...' : resolvedNextLabel}</span>
          <FontAwesomeIcon
            icon={isLastStep ? faCheck : faChevronRight}
            style={{ marginLeft: '0.5rem' }}
          />
        </NeonButton>
      </div>

      {tooltip && showTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltip.y - 10,
            left: tooltip.x,
            transform: 'translate(-50%, -100%)',
            zIndex: 2147483647,
            background: 'black',
            border: '1px solid var(--color-warning)',
            padding: '8px 12px',
            color: 'var(--color-warning)',
            fontSize: 'var(--font-size-base)',
            pointerEvents: 'none',
            boxShadow: '0 0 8px rgba(255, 165, 0, 0.3)',
            backdropFilter: 'blur(3px)',
            maxWidth: '300px',
          }}
        >
          {hasValidationIssues ? (
            <>
              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Required fields:</div>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {validationIssues.map((issue, i) => (
                  <li key={i}>{issue.param}</li>
                ))}
              </ul>
            </>
          ) : (
            <div>Please complete all required fields</div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
