export function ProductCardSkeleton() {
  return (
    <div className="animate-fade-in" aria-hidden="true">
      {/* Image skeleton — 4:5 */}
      <div className="shimmer w-full" style={{ aspectRatio: '4/5' }} />
      {/* Text skeleton */}
      <div className="pt-3 space-y-2">
        <div className="shimmer h-2.5 w-1/3 rounded" />
        <div className="shimmer h-4 w-4/5 rounded" />
        <div className="shimmer h-3 w-2/5 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image skeletons */}
          <div className="space-y-3">
            <div className="shimmer w-full" style={{ aspectRatio: '4/5' }} />
            <div className="shimmer h-24 w-full rounded" />
          </div>
          {/* Detail skeletons */}
          <div className="space-y-6 pt-4">
            <div className="shimmer h-3 w-1/4 rounded" />
            <div className="shimmer h-8 w-3/4 rounded" />
            <div className="shimmer h-6 w-1/3 rounded" />
            <div className="space-y-2 pt-4">
              <div className="shimmer h-3 w-1/5 rounded" />
              <div className="flex gap-2">
                {[1,2,3,4].map(i => <div key={i} className="shimmer w-12 h-12 rounded" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
