import './background-effects.css'

export default function FaultyTerminalEffect() {
  return (
    <div className="background-effect background-effect--faulty-terminal" aria-hidden="true">
      <div className="faulty-terminal__grid" />
      <div className="faulty-terminal__scan" />
      <div className="faulty-terminal__noise" />
    </div>
  )
}
