import { useState, useCallback, useMemo } from 'preact/hooks'

/**
 * Custom hook for wizard state management
 *
 * @param {Object} options
 * @param {Array} options.steps - Array of step definitions { id, title, description }
 * @param {Object} options.params - Current form parameters
 * @param {Array} options.parameters - Parameter definitions from contracts.json
 * @param {Function} options.validateField - Optional custom validation function (param, value) => boolean
 * @param {Function} options.validateStep - Optional step-level validation function (stepId) => { valid: boolean, issues?: string[] }
 * @returns {Object} Wizard state and controls
 */
export function useWizard({
  steps = [],
  params = {},
  parameters = [],
  validateField,
  validateStep,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [visitedSteps, setVisitedSteps] = useState(() => new Set([0]))
  const [showValidationErrors, setShowValidationErrors] = useState(false)

  const currentStep = steps[currentStepIndex] || { id: '', title: '', description: '' }
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Get parameters belonging to a specific step
  const getStepParameters = useCallback((stepId) => {
    return parameters
      .filter(p => p.wizardStep === stepId)
      .sort((a, b) => {
        const aIndex = a?.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bIndex = b?.sortIndex ?? Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })
  }, [parameters])

  // Default field validation
  const defaultValidateField = useCallback((param, value) => {
    if (!param.mandatory) return true

    // Boolean fields with a default value are always valid
    // (they have a defined state even if user hasn't interacted)
    if (param.type === 'bool' && param.default !== undefined) {
      return true
    }

    if (value === undefined || value === null || value === '') return false

    if (param.type === 'vscIntent') {
      if (!value || typeof value !== 'object') return false
      const amount = parseFloat(String(value.amount || '').replace(',', '.'))
      return !isNaN(amount) && amount >= 0 && value.asset
    }

    if (param.type === 'number' || param.type === 'int') {
      const num = parseFloat(value)
      return !isNaN(num)
    }

    if (typeof value === 'string') {
      return value.trim() !== ''
    }

    return true
  }, [])

  // Check if a step is valid (all mandatory fields filled)
  // Note: readOnly fields are skipped since they're auto-populated and user can't fix them
  const isStepValid = useCallback((stepId) => {
    // Review step is always valid (it's just a summary)
    if (stepId === 'review') return true

    // Check step-level validation first
    if (validateStep) {
      const stepResult = validateStep(stepId)
      if (stepResult && !stepResult.valid) return false
    }

    const stepParams = getStepParameters(stepId)

    // Check all fields - custom validators can make non-mandatory fields required
    for (const p of stepParams) {
      if (p.readOnly) continue
      const value = params[p.name] ?? params[p.payloadName]

      // Check custom validator first
      if (validateField) {
        const customResult = validateField(p, value)
        // If custom validator returns a boolean, use it
        if (customResult !== undefined) {
          if (!customResult) return false
          continue // Custom validator passed, move to next field
        }
      }

      // Fall back to default validation for mandatory fields
      if (p.mandatory && !defaultValidateField(p, value)) {
        return false
      }
    }

    return true
  }, [getStepParameters, params, validateField, validateStep, defaultValidateField])

  // Get validation issues for a step (excludes readOnly fields since user can't fix them)
  const getStepValidationIssues = useCallback((stepId) => {
    const stepParams = getStepParameters(stepId)
    const issues = []

    // Check step-level validation first
    if (validateStep) {
      const stepResult = validateStep(stepId)
      if (stepResult && !stepResult.valid && stepResult.issues) {
        stepResult.issues.forEach(issue => {
          issues.push({
            param: issue,
            message: issue
          })
        })
      }
    }

    for (const param of stepParams) {
      // Skip readOnly fields - user can't fix these, they're auto-populated
      if (param.readOnly) continue
      const value = params[param.name] ?? params[param.payloadName]

      // Check custom validator first
      if (validateField) {
        const customResult = validateField(param, value)
        // If custom validator returns a boolean, use it
        if (customResult !== undefined) {
          if (!customResult) {
            issues.push({
              param: param.name,
              message: `${param.name} is required`
            })
          }
          continue // Custom validator handled this field
        }
      }

      // Fall back to default validation for mandatory fields
      if (param.mandatory && !defaultValidateField(param, value)) {
        issues.push({
          param: param.name,
          message: `${param.name} is required`
        })
      }
    }

    return issues
  }, [getStepParameters, params, validateField, validateStep, defaultValidateField])

  // Check if current step can proceed
  const canProceed = useMemo(() => {
    return isStepValid(currentStep.id)
  }, [isStepValid, currentStep.id])

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (isLastStep) return false

    if (!canProceed) {
      setShowValidationErrors(true)
      return false
    }

    const nextIndex = currentStepIndex + 1
    setCurrentStepIndex(nextIndex)
    setVisitedSteps(prev => new Set([...prev, nextIndex]))
    setShowValidationErrors(false)
    return true
  }, [canProceed, isLastStep, currentStepIndex])

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (isFirstStep) return false
    setCurrentStepIndex(prev => prev - 1)
    setShowValidationErrors(false)
    return true
  }, [isFirstStep])

  // Navigate to specific step (only if visited or previous)
  const goToStep = useCallback((index) => {
    if (index < 0 || index >= steps.length) return false

    // Can always go back to visited steps
    if (visitedSteps.has(index) || index < currentStepIndex) {
      setCurrentStepIndex(index)
      setShowValidationErrors(false)
      return true
    }

    // Can only go forward if all previous steps are valid
    for (let i = currentStepIndex; i < index; i++) {
      if (!isStepValid(steps[i].id)) {
        return false
      }
    }

    setCurrentStepIndex(index)
    setVisitedSteps(prev => new Set([...prev, index]))
    setShowValidationErrors(false)
    return true
  }, [steps, visitedSteps, currentStepIndex, isStepValid])

  // Calculate progress (0 to 1)
  const progress = steps.length > 0 ? (currentStepIndex + 1) / steps.length : 0

  // Check if all steps are valid (for final submission)
  const allStepsValid = useMemo(() => {
    return steps.every(step => isStepValid(step.id))
  }, [steps, isStepValid])

  return {
    // Current state
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    canProceed,
    progress,
    visitedSteps,
    showValidationErrors,
    allStepsValid,

    // Navigation
    nextStep,
    prevStep,
    goToStep,

    // Utilities
    getStepParameters,
    isStepValid,
    getStepValidationIssues,
    setShowValidationErrors,
  }
}

export default useWizard
