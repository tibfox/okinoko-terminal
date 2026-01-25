import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

/**
 * Visual progress indicator for wizard steps
 *
 * Desktop: Horizontal stepper with step names
 * Mobile: Compact progress bar with "Step X of Y" text
 */
export default function WizardProgress({
  steps = [],
  currentIndex = 0,
  visitedSteps = new Set(),
  isStepValid,
  onStepClick,
  isMobile = false,
}) {
  if (steps.length === 0) return null

  // Mobile: compact progress view
  if (isMobile) {
    const progress = ((currentIndex + 1) / steps.length) * 100
    return (
      <div className="wizard-progress wizard-progress--mobile">
        <div className="wizard-progress__mobile-header">
          <span className="wizard-progress__mobile-label">
            Step {currentIndex + 1} of {steps.length}
          </span>
          <span className="wizard-progress__mobile-title">
            {steps[currentIndex]?.title}
          </span>
        </div>
        <div className="wizard-progress__mobile-bar">
          <div
            className="wizard-progress__mobile-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // Desktop: full stepper
  return (
    <div className="wizard-progress">
      {steps.map((step, index) => {
        const isActive = index === currentIndex
        const isCompleted = visitedSteps.has(index) && isStepValid?.(step.id)
        const isVisited = visitedSteps.has(index)
        const canClick = isVisited || index < currentIndex

        return (
          <div
            key={step.id}
            className={[
              'wizard-progress__step',
              isActive && 'wizard-progress__step--active',
              isCompleted && 'wizard-progress__step--completed',
              isVisited && 'wizard-progress__step--visited',
            ].filter(Boolean).join(' ')}
          >
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={[
                  'wizard-progress__connector',
                  isCompleted && index < currentIndex && 'wizard-progress__connector--completed',
                ].filter(Boolean).join(' ')}
              />
            )}

            {/* Step indicator */}
            <button
              type="button"
              className="wizard-progress__indicator"
              onClick={() => canClick && onStepClick?.(index)}
              disabled={!canClick}
              title={step.title}
            >
              {isCompleted && index < currentIndex ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>

            {/* Step label */}
            <span className="wizard-progress__label">
              {step.title}
            </span>
          </div>
        )
      })}
    </div>
  )
}
