import React, { useMemo } from 'react';

/**
 * Aurora animated background with floating particles.
 * Uses pure CSS animations for performance (no JS animation loops).
 */
export function AuroraBackground() {
  // Generate random particles once on mount
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
      color: ['#58CC03', '#89E219', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 4)],
    }));
  }, []);

  return (
    <>
      {/* Aurora gradient blobs */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      {/* Floating particles */}
      <div className="aurora-bg" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            }}
          />
        ))}
      </div>
    </>
  );
}
