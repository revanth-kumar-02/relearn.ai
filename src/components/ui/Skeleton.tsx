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

export default Skeleton;
