import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isTriggered: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isTriggered,
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / 60, 1);
  const rotation = Math.min(pullDistance * 3, 360);

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-200"
      style={{
        opacity: isRefreshing ? 1 : opacity,
        transform: `translateX(-50%) translateY(${isRefreshing ? '0' : `-${Math.max(0, 20 - pullDistance)}px`})`,
      }}
    >
      <div className="bg-primary/10 backdrop-blur-sm rounded-full p-3 border border-primary/20">
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <ArrowDown 
            className={`h-5 w-5 transition-colors ${isTriggered ? 'text-primary' : 'text-muted-foreground'}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
