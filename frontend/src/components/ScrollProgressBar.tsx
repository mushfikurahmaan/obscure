import React, { useEffect, useState } from 'react';

interface ScrollProgressBarProps {
  containerRef: React.RefObject<HTMLElement>;
  height?: number;
  color?: string;
}

const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  containerRef,
  height = 6,
  color = '#ff9800',
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(percent);
    };

    container.addEventListener('scroll', handleScroll);
    // Set initial value
    handleScroll();
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef]);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 50,
        height,
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: color,
          transition: 'width 0.1s',
          borderRadius: 2,
        }}
      />
    </div>
  );
};

export default ScrollProgressBar; 