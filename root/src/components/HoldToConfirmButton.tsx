import React, { useRef, useState } from 'react';

interface HoldToConfirmButtonProps {
  onHoldComplete: () => void;
  children: React.ReactNode;
  holdTimeMs?: number;
  className?: string;
  disabled?: boolean;
}

const HOLD_DEFAULT = 3000;
const FILL_DELAY = 200; // ms to show full bar before action

const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  onHoldComplete,
  children,
  holdTimeMs = HOLD_DEFAULT,
  className = '',
  disabled = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = () => {
    if (disabled || holding) return;
    setHolding(true);
    setProgress(0);
    setFinishing(false);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / holdTimeMs) * 100);
      setProgress(pct);
      if (elapsed >= holdTimeMs) {
        clearInterval(timerRef.current!);
        setHolding(false);
        setProgress(100);
        setFinishing(true);
        setTimeout(() => {
          setFinishing(false);
          setProgress(0);
          onHoldComplete();
        }, FILL_DELAY);
      }
    }, 16);
  };

  const cancelHold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setHolding(false);
    setFinishing(false);
    setProgress(0);
  };

  // Mouse/touch events
  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    startHold();
  };
  const handlePointerUp = () => cancelHold();
  const handlePointerLeave = () => cancelHold();

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !holding) {
      e.preventDefault();
      startHold();
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      cancelHold();
    }
  };

  return (
    <button
      type="button"
      className={`relative overflow-hidden select-none min-h-[48px] h-12 ${className}`}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      aria-disabled={disabled}
      tabIndex={0}
      style={{ position: 'relative' }}
    >
      {/* Progress fill animation */}
      <div
        className="absolute left-0 top-0 h-full z-0 transition-all"
        style={{
          width: `${progress}%`,
          background: 'rgba(220, 38, 38, 0.8)', // Tailwind red-600/80
          transition: finishing
            ? `width ${FILL_DELAY}ms linear`
            : holding
            ? 'width 0.1s linear'
            : 'width 0.3s',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      <span className="relative z-10 flex items-center justify-center w-full h-full">
        {children}
      </span>
    </button>
  );
};

export { HoldToConfirmButton };
export default HoldToConfirmButton; 