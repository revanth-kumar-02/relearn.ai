import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-800 animate-pulse";
  const variantClasses = {
    text: "h-4 w-full rounded",
    rect: "rounded-xl",
    circle: "rounded-full"
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};

export const PlanCardSkeleton = () => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-border-light dark:border-border-dark flex flex-col gap-3">
    <Skeleton className="h-40 w-full" />
    <Skeleton variant="text" className="w-3/4" />
    <Skeleton variant="text" className="w-1/2" />
    <div className="flex justify-between items-center mt-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton variant="circle" className="h-8 w-8" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border border-border-light dark:border-border-dark space-y-4 animate-pulse">
    <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-32" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-border-light/50 dark:border-border-dark/50 last:border-none">
        <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/4" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    ))}
  </div>
);

export default Skeleton;
