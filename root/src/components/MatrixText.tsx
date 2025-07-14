import React, { useEffect, useRef, useState } from "react";

interface MatrixTextProps {
  text: string;
  className?: string;
  speed?: number; // ms per frame
}

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?";

export const MatrixText: React.FC<MatrixTextProps> = ({ text, className = "", speed = 40 }) => {
  const [display, setDisplay] = useState<string[]>(Array(text.length).fill(""));
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let frame = 0;
    let revealed = 0;
    intervalRef.current = setInterval(() => {
      setDisplay((prev) => {
        return prev.map((char, i) => {
          if (i < revealed) return text[i];
          if (i === revealed) return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          return char;
        });
      });
      frame++;
      if (frame % 4 === 0) {
        revealed++;
        if (revealed > text.length) {
          setDone(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  useEffect(() => {
    if (done) setDisplay(text.split(""));
  }, [done, text]);

  return (
    <span className={`font-mono text-2xl font-semibold tracking-wide ${className}`} aria-label={text} style={{ color: '#00FF41' }}>
      {display.map((char, i) => (
        <span key={i} style={{ opacity: char === text[i] ? 1 : 0.7 }}>{char || " "}</span>
      ))}
    </span>
  );
};

export default MatrixText; 