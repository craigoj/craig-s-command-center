import { motion, AnimatePresence, Variants } from 'framer-motion';
import React from 'react';

// Animation variants
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Animation presets for common use cases
export const animationPresets = {
  fast: { duration: 0.2, ease: 'easeOut' as const },
  normal: { duration: 0.3, ease: 'easeOut' as const },
  slow: { duration: 0.5, ease: 'easeInOut' as const },
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
  bounce: { type: 'spring' as const, stiffness: 400, damping: 10 },
};

// Animated card wrapper
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, index = 0, className = '', onClick }: AnimatedCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ 
        ...animationPresets.normal, 
        delay: index * 0.1 
      }}
      whileHover={{ 
        y: -4, 
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Animated progress bar
interface AnimatedProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  showValue?: boolean;
}

export function AnimatedProgress({ 
  value, 
  className = '', 
  barClassName = '',
  showValue = false 
}: AnimatedProgressProps) {
  return (
    <div className={`relative h-3 bg-muted rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={`absolute inset-y-0 left-0 bg-primary rounded-full ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {showValue && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground mix-blend-difference"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {value}%
        </motion.span>
      )}
    </div>
  );
}

// Animated number counter
interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedNumber({ value, className = '', suffix = '', prefix = '' }: AnimatedNumberProps) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={animationPresets.fast}
    >
      {prefix}{value}{suffix}
    </motion.span>
  );
}

// Success checkmark animation
export function AnimatedCheckmark({ className = '' }: { className?: string }) {
  return (
    <motion.svg
      className={`w-6 h-6 text-green-500 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      <motion.path
        d="M9 12l2 2 4-4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

// Flame animation for streaks
export function AnimatedFlame({ streak, className = '' }: { streak: number; className?: string }) {
  return (
    <motion.div
      className={`inline-flex items-center gap-1 ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={animationPresets.bounce}
    >
      <motion.span
        className="text-orange-500"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0],
        }}
        transition={{ 
          duration: 0.5, 
          repeat: Infinity, 
          repeatDelay: 2 
        }}
      >
        🔥
      </motion.span>
      <span className="font-bold">{streak}</span>
    </motion.div>
  );
}

// Pulse animation wrapper
export function PulseGlow({ children, active = true, className = '' }: { 
  children: React.ReactNode; 
  active?: boolean;
  className?: string;
}) {
  if (!active) return <div className={className}>{children}</div>;
  
  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(59, 130, 246, 0)',
          '0 0 20px 4px rgba(59, 130, 246, 0.3)',
          '0 0 0 0 rgba(59, 130, 246, 0)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}

// Shake animation on error
export function ShakeOnError({ 
  children, 
  shake = false, 
  className = '' 
}: { 
  children: React.ReactNode; 
  shake?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={shake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
      } : {}}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };
