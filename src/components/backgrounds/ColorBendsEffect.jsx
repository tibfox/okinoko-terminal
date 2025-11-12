import './background-effects.css'

export default function ColorBendsEffect() {
  return (
    <div className="background-effect background-effect--color-bends" aria-hidden="true">
      <div className="color-bends__layer color-bends__layer--one" />
      <div className="color-bends__layer color-bends__layer--two" />
      <div className="color-bends__layer color-bends__layer--three" />
    </div>
  )
}
