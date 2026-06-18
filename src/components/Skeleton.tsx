export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-16 bg-dark-600 rounded" />
        <div className="h-9 w-9 bg-dark-600 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 bg-dark-600 rounded" />
        <div className="h-6 w-28 bg-dark-600 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-4">
          <div className="h-4 w-12 bg-dark-600 rounded" />
          <div className="h-4 flex-1 bg-dark-600 rounded" />
          <div className="h-4 w-24 bg-dark-600 rounded" />
          <div className="h-4 w-16 bg-dark-600 rounded" />
          <div className="h-4 w-16 bg-dark-600 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-3">
          <div className="h-8 w-8 bg-dark-600 rounded-full" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-3/4 bg-dark-600 rounded" />
            <div className="h-3 w-1/2 bg-dark-600 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-32 bg-dark-600 rounded mb-6" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-dark-600 rounded-t"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Skeleton({ variant = 'card', rows, count }: { variant?: 'card' | 'table' | 'list' | 'chart'; rows?: number; count?: number }) {
  switch (variant) {
    case 'table': return <SkeletonTable rows={rows} />;
    case 'list': return <SkeletonList count={count} />;
    case 'chart': return <SkeletonChart />;
    default: return <SkeletonCard />;
  }
}
