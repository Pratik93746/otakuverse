'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Card3DTiltProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

export function Card3DTilt({
  children,
  className = '',
  intensity = 14,
  glare = true,
}: Card3DTiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseXSpring = useSpring(x, { stiffness: 220, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 220, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [0, 1], [intensity, -intensity]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-intensity, intensity]);

  const glareX = useTransform(mouseXSpring, [0, 1], ['0%', '100%']);
  const glareY = useTransform(mouseYSpring, [0, 1], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          rotateX: mounted ? rotateX : 0,
          rotateY: mounted ? rotateY : 0,
          transformOrigin: 'center center',
        }}
        className="w-full h-full will-change-transform transition-shadow duration-300"
      >
        {children}

        {/* Holographic Specular Glare */}
        {glare && isHovered && mounted && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-inherit opacity-30 z-30 transition-opacity duration-300 rounded-[inherit]"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.15) 35%, transparent 70%)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
