import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface XPParticle {
  id: number;
  x: number;
  y: number;
  value: number;
  emoji: string;
}

interface XPDropAnimationProps {
  trigger: { amount: number; timestamp: number } | null;
}

const EMOJIS = ['✨', '⭐', '💎', '🔥', '⚡', '🎯', '🏆'];

const XPDropAnimation: React.FC<XPDropAnimationProps> = ({ trigger }) => {
  const [particles, setParticles] = useState<XPParticle[]>([]);

  const spawnParticles = useCallback((amount: number) => {
    const count = Math.min(Math.max(3, Math.floor(amount / 10)), 12);
    const newParticles: XPParticle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 20, // % from left
      y: 30 + Math.random() * 30, // % from top
      value: Math.ceil(amount / count),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    }));
    setParticles(prev => [...prev, ...newParticles]);

    // Remove after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  }, []);

  useEffect(() => {
    if (trigger && trigger.amount > 0) {
      // Only trigger if the reward is fresh (within the last 2 seconds)
      const isFresh = Date.now() - trigger.timestamp < 2000;
      if (isFresh) {
        spawnParticles(trigger.amount);
      }
    }
  }, [trigger, spawnParticles]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" aria-hidden="true">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 1,
              x: `${p.x}vw`,
              y: `${p.y}vh`,
              scale: 0.3,
            }}
            animate={{
              opacity: [1, 1, 0],
              y: [`${p.y}vh`, `${p.y - 15}vh`, `${p.y - 30}vh`],
              x: [`${p.x}vw`, `${p.x + (Math.random() - 0.5) * 10}vw`],
              scale: [0.3, 1.2, 0.8],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute flex items-center gap-1"
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-sm font-black text-primary drop-shadow-lg">
              +{p.value} XP
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Central flash for big rewards */}
      <AnimatePresence>
        {trigger && trigger.amount >= 50 && (
          <motion.div
            key={`flash-${trigger.timestamp}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0.5, 1.5, 2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/30 to-amber-400/30 blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XPDropAnimation;
