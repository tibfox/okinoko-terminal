import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import './background-effects.css';

/**
 * GlitterEffect
 * Sparkling stars/glitter that drift continuously
 */
export default function GlitterEffect() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Seeded random for consistent glitter placement
    let seed = 42;
    function seededRandom() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Generate 60 glitter particles with random properties
    const numParticles = 60;
    const particles = [];

    for (let i = 0; i < numParticles; i++) {
      const x = seededRandom() * 100;
      const y = seededRandom() * 100;
      const size = 6 + seededRandom() * 12; // 6-18px (2x bigger)
      const twinkleDuration = 0.3 + seededRandom() * 0.7; // 0.3-1s for fast glitter
      const driftDuration = 20 + seededRandom() * 20; // 20-40s for drift
      const delay = seededRandom() * 5; // 0-5s

      // Random drift direction - continuous movement
      const angle = seededRandom() * Math.PI * 2; // Random angle
      const speed = 0.5 + seededRandom() * 1; // 0.5-1.5 speed multiplier
      const driftX = Math.cos(angle) * 100 * speed; // Move up to 100px in X
      const driftY = Math.sin(angle) * 100 * speed; // Move up to 100px in Y

      // Random sparkle frequency
      const sparkleRoll = seededRandom();
      let sparkleType;
      if (sparkleRoll < 0.3) {
        sparkleType = 'glitter-twinkle'; // 30% frequent sparkles
      } else if (sparkleRoll < 0.6) {
        sparkleType = 'glitter-twinkle-medium'; // 30% medium sparkles
      } else if (sparkleRoll < 0.85) {
        sparkleType = 'glitter-twinkle-subtle'; // 25% subtle sparkles
      } else {
        sparkleType = 'glitter-twinkle-rare'; // 15% rare sparkles
      }

      // Random star shape - only * and +
      const shapeRoll = seededRandom();
      let shape;
      if (shapeRoll < 0.5) {
        shape = 'plus';
      } else {
        shape = 'star';
      }

      particles.push({
        x,
        y,
        size,
        twinkleDuration,
        driftDuration,
        delay,
        driftX,
        driftY,
        sparkleType,
        shape,
      });
    }

    // Set CSS custom properties for each particle
    particles.forEach((p, idx) => {
      container.style.setProperty(`--glitter-x-${idx}`, `${p.x}%`);
      container.style.setProperty(`--glitter-y-${idx}`, `${p.y}%`);
      container.style.setProperty(`--glitter-size-${idx}`, `${p.size}px`);
      container.style.setProperty(`--glitter-twinkle-duration-${idx}`, `${p.twinkleDuration}s`);
      container.style.setProperty(`--glitter-drift-duration-${idx}`, `${p.driftDuration}s`);
      container.style.setProperty(`--glitter-delay-${idx}`, `${p.delay}s`);
      container.style.setProperty(`--glitter-drift-x-${idx}`, `${p.driftX}px`);
      container.style.setProperty(`--glitter-drift-y-${idx}`, `${p.driftY}px`);
      container.style.setProperty(`--glitter-sparkle-type-${idx}`, p.sparkleType);
      container.style.setProperty(`--glitter-shape-${idx}`, p.shape);
    });

    // Inject dynamic CSS for shape-specific styles
    let styleEl = document.getElementById('glitter-shapes-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'glitter-shapes-style';
      document.head.appendChild(styleEl);
    }

    const shapeStyles = particles.map((p, idx) => {
      if (p.shape === 'plus') {
        return `
          .glitter-particle--${idx}::before {
            width: 100%;
            height: 20%;
          }
          .glitter-particle--${idx}::after {
            width: 20%;
            height: 100%;
          }
        `;
      } else {
        // star shape (*) - rotated 45deg
        return `
          .glitter-particle--${idx}::before {
            width: 100%;
            height: 20%;
            transform: translate(-50%, -50%) rotate(45deg);
          }
          .glitter-particle--${idx}::after {
            width: 20%;
            height: 100%;
            transform: translate(-50%, -50%) rotate(45deg);
          }
        `;
      }
    }).join('\n');

    styleEl.textContent = shapeStyles;

    container.style.setProperty('--glitter-count', numParticles);
  }, []);

  // Layer configuration: offset positions and delays
  const layers = [
    { x: 0, y: 0, delay: 0 },
    { x: 33, y: 33, delay: 1.5 },
    { x: -25, y: 50, delay: 3 },
    { x: 50, y: -20, delay: 0.8 },
    { x: -40, y: -30, delay: 2.2 },
    { x: 15, y: 65, delay: 1.1 },
    { x: -50, y: 15, delay: 2.8 },
    { x: 60, y: -45, delay: 0.5 },
  ];

  return (
    <div ref={containerRef} className="background-effect glitter-effect">
      {layers.map((layer, layerIdx) => (
        <div
          key={`layer-${layerIdx}`}
          className="glitter-layer"
          style={{ transform: `translate(${layer.x}%, ${layer.y}%)` }}
        >
          {Array.from({ length: 60 }, (_, i) => {
            const shapeClass = `glitter-particle glitter-particle--${i}`;
            return (
              <div
                key={`l${layerIdx}-${i}`}
                className={shapeClass}
                data-shape-id={i}
                style={{
                  left: `var(--glitter-x-${i})`,
                  top: `var(--glitter-y-${i})`,
                  width: `var(--glitter-size-${i})`,
                  height: `var(--glitter-size-${i})`,
                  animationDelay: `calc(var(--glitter-delay-${i}) + ${layer.delay}s)`,
                  '--drift-x': `var(--glitter-drift-x-${i})`,
                  '--drift-y': `var(--glitter-drift-y-${i})`,
                  '--twinkle-duration': `var(--glitter-twinkle-duration-${i})`,
                  '--drift-duration': `var(--glitter-drift-duration-${i})`,
                  '--sparkle-type': `var(--glitter-sparkle-type-${i})`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
