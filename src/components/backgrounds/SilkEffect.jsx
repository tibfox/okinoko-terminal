import './background-effects.css'

export default function SilkEffect() {
  return (
    <div className="background-effect background-effect--silk" aria-hidden="true">
      <div className="silk__ribbon silk__ribbon--one" />
      <div className="silk__ribbon silk__ribbon--two" />
      <div className="silk__ribbon silk__ribbon--three" />
    </div>
  )
}
