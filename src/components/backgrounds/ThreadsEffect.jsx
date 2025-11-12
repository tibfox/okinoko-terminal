import './background-effects.css'

export default function ThreadsEffect() {
  return (
    <div className="background-effect background-effect--threads" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={`threads__strand threads__strand--${index + 1}`} />
      ))}
    </div>
  )
}
