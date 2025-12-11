import { h } from 'preact';
import './background-effects.css';

/**
 * TwinkleGridEffect
 * Grid of twinkling pixels inspired by the sparkle button effect
 * Optimized for performance with a balanced grid density
 */
export default function TwinkleGridEffect() {
  // Create an optimized grid for fullscreen (80x45 = 3600 twinkles)
  // This provides a good balance between visual density and performance
  const cols = 80;
  const rows = 45;
  const totalTwinkles = cols * rows;

  return (
    <div className="background-effect background-effect--twinkle-grid">
      <div className="twinkle-grid">
        {Array.from({ length: totalTwinkles }).map((_, i) => (
          <div key={`twinkle-${i}`} className="twinkle-pixel"></div>
        ))}
      </div>
    </div>
  );
}
