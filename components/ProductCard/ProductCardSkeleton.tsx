export function ProductCardSkeleton() {
  return (
    <div className="border border-gray-100 overflow-hidden">
      <div className="aspect-product bg-gray-200 shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-200 shimmer rounded w-2/3" />
        <div className="h-3 bg-gray-200 shimmer rounded w-full" />
        <div className="h-3 bg-gray-200 shimmer rounded w-4/5" />
        <div className="h-4 bg-gray-200 shimmer rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}
