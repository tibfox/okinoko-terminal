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

  // Render stepper (used for both mobile and desktop)
  return (
    <div className={`wizard-progress ${isMobile ? 'wizard-progress--mobile-stepper' : ''}`}>
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

            {/* Step label - hidden on mobile */}
            {!isMobile && (
              <span className="wizard-progress__label">
                {step.title}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
