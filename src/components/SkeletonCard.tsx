import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="animate-pulse">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonTaskCard() {
  return (
    <Card className="p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </Card>
  );
}

export function SkeletonStats() {
  return (
    <Card className="p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-12 w-24 mb-2" />
      <Skeleton className="h-4 w-full" />
    </Card>
  );
}
