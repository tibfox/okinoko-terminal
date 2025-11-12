import './background-effects.css'

export default function DarkVeilEffect() {
  return (
    <div className="background-effect background-effect--dark-veil" aria-hidden="true">
      <div className="dark-veil__mist" />
      <div className="dark-veil__glow" />
      <div className="dark-veil__twist" />
    </div>
  )
}
