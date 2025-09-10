'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Confetti to avoid SSR issues, with error handling
const Confetti = dynamic(
  () =>
    import('react-confetti').catch(() => {
      // Silently fail if confetti can't load
      return { default: () => null };
    }),
  {
    ssr: false,
    loading: () => null, // No loading state
  }
);

interface DynamicConfettiProps {
  duration?: number; // Duration in milliseconds
  colors?: string[];
  numberOfPieces?: number;
  recycle?: boolean;
}

export function DynamicConfetti({
  duration = 5000,
  colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ],
  numberOfPieces = 800,
  recycle = false,
}: DynamicConfettiProps) {
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [pieces, setPieces] = useState(numberOfPieces);
  const [gravity, setGravity] = useState(0.1);
  const [opacity, setOpacity] = useState(1);
  const [hasError, setHasError] = useState(false);

  // Get window dimensions
  useEffect(() => {
    try {
      const updateDimensions = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);

      return () => window.removeEventListener('resize', updateDimensions);
    } catch {
      // Silently fail if window is not available
      setHasError(true);
    }
  }, []);

  // Dynamic animation effects
  useEffect(() => {
    if (hasError) return;

    try {
      // Gradually reduce pieces for a fading effect
      const pieceInterval = setInterval(() => {
        setPieces(p => Math.max(0, p - 50));
      }, 300);

      // Increase gravity over time for more natural falling
      const gravityInterval = setInterval(() => {
        setGravity(g => Math.min(0.5, g + 0.02));
      }, 200);

      // Fade out near the end
      const fadeTimeout = setTimeout(() => {
        const fadeInterval = setInterval(() => {
          setOpacity(o => Math.max(0, o - 0.1));
        }, 100);

        return () => clearInterval(fadeInterval);
      }, duration - 1000);

      return () => {
        clearInterval(pieceInterval);
        clearInterval(gravityInterval);
        clearTimeout(fadeTimeout);
      };
    } catch {
      // Silently fail on any animation errors
      setHasError(true);
    }
  }, [duration, hasError]);

  // Don't render if there's an error or window dimensions aren't ready
  if (hasError || windowDimensions.width === 0) return null;

  try {
    return (
      <div style={{ opacity, transition: 'opacity 0.3s ease-out' }}>
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          numberOfPieces={pieces}
          gravity={gravity}
          colors={colors}
          recycle={recycle}
          wind={0.02}
          friction={0.99}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: -10 }}
        />
      </div>
    );
  } catch {
    // If rendering fails, just return null
    return null;
  }
}
