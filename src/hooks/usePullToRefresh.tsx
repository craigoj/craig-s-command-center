import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at top of scroll
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0 || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      // Only pull down
      if (distance > 0 && container.scrollTop === 0) {
        // Prevent default scroll behavior
        e.preventDefault();
        
        // Apply resistance
        const resistedDistance = distance / resistance;
        
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPullDistance(Math.min(resistedDistance, threshold * 1.5));
        });
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      
      startY.current = 0;
      currentY.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, pullDistance, isRefreshing]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isTriggered: pullDistance > threshold,
  };
}
