import InfoIcon from './InfoIcon.jsx'

/**
 * FormField - A reusable form field wrapper that matches ExecuteForm styling:
 * - Input with InfoIcon tooltip beside it (not in label)
 * - Label with mandatory indicator (*) is passed to child input via render props
 * - Optional helper text below the input
 *
 * Usage with render props (recommended for new code):
 * <FormField
 *   label="Field Name"
 *   mandatory={true}
 *   hintText="Help text for tooltip"
 *   helperText="Text below input"
 * >
 *   {({ labelText }) => (
 *     <FloatingLabelInput label={labelText} ... />
 *   )}
 * </FormField>
 *
 * Usage with regular children (for existing inputs that generate their own labels):
 * <FormField
 *   label="Field Name"
 *   mandatory={true}
 *   hintText="Help text for tooltip"
 * >
 *   <SomeInputThatGeneratesItsOwnLabel />
 * </FormField>
 */
export default function FormField({
  label,
  mandatory = false,
  hintText,
  helperText,
  helperColor,
  children,
  style,
}) {
  // Generate label text with mandatory indicator (like ExecuteForm does)
  const labelText = `${label}${mandatory ? ' *' : ''}`
  const hint = (hintText || '').trim()

  const helperStyle = {
    fontSize: '0.85rem',
    color: helperColor || 'var(--color-primary-darker)',
    marginTop: '0.25rem',
  }

  return (
    <div style={{ paddingTop: '12px', ...style }}>
      {/* Main row: input + info icon */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* Support both render props and regular children */}
          {typeof children === 'function'
            ? children({ labelText })
            : children
          }
        </div>
        {hint && (
          <InfoIcon
            tooltip={hint}
            size={16}
            style={{ marginTop: '12px' }}
          />
        )}
      </div>
      {/* Helper text below */}
      {helperText && (
        <div style={helperStyle}>
          {helperText}
        </div>
      )}
    </div>
  )
}
