import { useMemo } from 'preact/hooks'
import useWizard from '../../hooks/useWizard.js'
import WizardProgress from './WizardProgress.jsx'
import WizardNavigation from './WizardNavigation.jsx'
import WizardStep from './WizardStep.jsx'

/**
 * Main wizard container that orchestrates step navigation and rendering
 *
 * @param {Object} props
 * @param {Array} props.steps - Array of step definitions { id, title, description }
 * @param {Object} props.params - Form parameter state
 * @param {Function} props.setParams - Parameter state setter
 * @param {Array} props.parameters - Array of parameter definitions from contracts.json
 * @param {Function} props.renderField - Function to render a parameter field (from ExecuteForm)
 * @param {Function} props.onComplete - Callback when wizard is finished (last step submitted)
 * @param {Function} props.validateField - Optional custom validation function
 * @param {Function} props.validateStep - Optional step-level validation function (stepId) => { valid: boolean, issues?: string[] }
 * @param {Function} props.renderStepHeader - Optional function to render header content for a step
 * @param {boolean} props.isMobile - Whether to use mobile layout
 * @param {boolean} props.isSubmitting - Whether form is being submitted
 * @param {string} props.submitLabel - Label for the final submit button
 */
export default function WizardContainer({
  steps = [],
  params = {},
  setParams,
  parameters = [],
  renderField,
  onComplete,
  validateField,
  validateStep,
  renderStepHeader,
  isMobile = false,
  isSubmitting = false,
  submitLabel = 'Create',
}) {
  const wizard = useWizard({
    steps,
    params,
    parameters,
    validateField,
    validateStep,
  })

  // Get all parameters (for review step)
  const allParameters = useMemo(() => {
    return [...parameters].sort((a, b) => {
      const aIndex = a?.sortIndex ?? Number.MAX_SAFE_INTEGER
      const bIndex = b?.sortIndex ?? Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })
  }, [parameters])

  // Get parameters for current step
  const currentStepParameters = useMemo(() => {
    if (wizard.currentStep.id === 'review') {
      return allParameters
    }
    return wizard.getStepParameters(wizard.currentStep.id)
  }, [wizard.currentStep.id, wizard.getStepParameters, allParameters])

  // Handle next button click
  const handleNext = () => {
    if (wizard.isLastStep) {
      // Final step - trigger completion
      if (wizard.allStepsValid) {
        onComplete?.()
      } else {
        wizard.setShowValidationErrors(true)
      }
    } else {
      wizard.nextStep()
    }
  }

  // Handle previous button click
  const handlePrev = () => {
    wizard.prevStep()
  }

  // Handle step indicator click
  const handleStepClick = (index) => {
    wizard.goToStep(index)
  }

  return (
    <div className={`wizard-container ${isMobile ? 'wizard-container--mobile' : 'wizard-container--desktop'}`}>
      <WizardProgress
        steps={steps}
        currentIndex={wizard.currentStepIndex}
        visitedSteps={wizard.visitedSteps}
        isStepValid={wizard.isStepValid}
        onStepClick={handleStepClick}
        isMobile={isMobile}
      />

      <div className="wizard-main">
        <WizardStep
          step={wizard.currentStep}
          parameters={currentStepParameters}
          params={params}
          renderField={renderField}
          isReviewStep={wizard.currentStep.id === 'review'}
          showValidationErrors={wizard.showValidationErrors}
          renderHeader={renderStepHeader}
          isMobile={isMobile}
        />

        <WizardNavigation
          onPrev={handlePrev}
          onNext={handleNext}
          canGoBack={!wizard.isFirstStep}
          canGoForward={wizard.canProceed || wizard.isLastStep}
          isFirstStep={wizard.isFirstStep}
          isLastStep={wizard.isLastStep}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
          validationIssues={wizard.canProceed ? [] : wizard.getStepValidationIssues(wizard.currentStep.id)}
        />
      </div>
    </div>
  )
}
