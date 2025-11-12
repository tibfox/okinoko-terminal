import './background-effects.css'

export default function LetterGlitchEffect() {
  return (
    <div className="background-effect background-effect--letter-glitch" aria-hidden="true">
      <div className="letter-glitch__grid" />
      <div className="letter-glitch__noise letter-glitch__noise--one" />
      <div className="letter-glitch__noise letter-glitch__noise--two" />
      <div className="letter-glitch__scanline" />
      <div className="letter-glitch__letters">
        <span>OKINOKO</span>
        <span>TERMINAL</span>
      </div>
    </div>
  )
}
