import { h } from 'preact'
// Helper component to add sparkle effect to buttons
export default function SparkleButton({ onClick, disabled, children }) {
  return (
    <>
      {/* Bottom grid - continuous twinkle (always active) */}
      <div className="pixel-sparkle-grid pixel-sparkle-grid-twinkle">
        {Array.from({ length: 90 }).map((_, i) => (
          <div key={`twinkle-${i}`} className="pixel-sparkle-twinkle"></div>
      ))}
    </div>
    {/* Top grid - black overlay that reveals sparkles on hover */}
    <div className="pixel-sparkle-grid pixel-sparkle-grid-overlay">
      {Array.from({ length: 90 }).map((_, i) => (
        <div key={`overlay-${i}`} className="pixel-sparkle-overlay"></div>
      ))}
    </div>
    {/* Button text - must be above all grids */}
    <span style={{
      position: 'relative',
      zIndex: 3,
      textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000'
    }}>
      {children}
    </span>
  </>
)}
