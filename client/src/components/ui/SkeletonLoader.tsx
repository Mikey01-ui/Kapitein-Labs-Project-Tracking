import React from "react";

interface SkeletonLoaderProps {
  variant?: "dashboard" | "projects" | "project-detail" | "my-hours" | "kanban" | "profile" | "table";
}

export function SkeletonLoader({ variant = "dashboard" }: SkeletonLoaderProps) {
  // Base shimmering bar utility with Miltomy dark grey tokens
  const Shimmer = ({ className = "h-4 w-full" }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-[#1f1f1f] ${className}`} />
  );

  // Stats Card Skeleton
  const StatCardSkeleton = () => (
    <div className="rounded bg-[#111111] border border-[#222222] p-6 flex flex-col justify-between h-[100px]">
      <Shimmer className="h-3 w-24 bg-[#262626]" />
      <div className="flex items-baseline justify-between mt-3">
        <Shimmer className="h-7 w-16 bg-[#262626]" />
        <Shimmer className="h-5 w-10 bg-[#262626]" />
      </div>
    </div>
  );

  if (variant === "dashboard") {
    return (
      <div className="space-y-8 select-none">
        {/* Banner Shimmer */}
        <div className="border-b border-dashed border-[#222222] pb-6">
          <Shimmer className="h-6 w-64 mb-2 bg-[#262626]" />
          <Shimmer className="h-3.5 w-96 bg-[#1a1a1a]" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#222222] border-dashed pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 pb-8">
          {/* Active Projects List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-b border-[#222222] pb-4 flex justify-between">
              <Shimmer className="h-4 w-36 bg-[#262626]" />
              <Shimmer className="h-4 w-12 bg-[#262626]" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#222222] last:border-0">
                  <div className="flex items-center gap-3 flex-1">
                    <Shimmer className="h-8 w-8 rounded-full bg-[#262626]" />
                    <div className="space-y-2 flex-1">
                      <Shimmer className="h-3.5 w-1/3 bg-[#262626]" />
                      <Shimmer className="h-2 w-1/2 bg-[#1a1a1a]" />
                    </div>
                  </div>
                  <Shimmer className="h-4 w-16 bg-[#262626]" />
                </div>
              ))}
            </div>
          </div>

          {/* Radial Gauge & Section */}
          <div className="lg:col-span-5 border-l border-[#222222] border-dashed lg:pl-8 space-y-6">
            <div className="border-b border-[#222222] pb-4">
              <Shimmer className="h-4 w-40 bg-[#262626]" />
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="h-28 w-28 rounded-full border-4 border-dashed border-[#222222] animate-spin flex items-center justify-center" style={{ animationDuration: "12s" }}>
                <div className="h-20 w-20 rounded-full border border-dashed border-[#222222]" />
              </div>
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3 w-full bg-[#262626]" />
                <Shimmer className="h-3 w-5/6 bg-[#222222]" />
                <Shimmer className="h-3 w-2/3 bg-[#1a1a1a]" />
              </div>
            </div>
            <div className="pt-6 border-t border-[#222222] border-dashed space-y-3">
              <Shimmer className="h-3.5 w-1/3 bg-[#262626]" />
              <Shimmer className="h-2 w-full bg-[#1a1a1a]" />
              <Shimmer className="h-2 w-1/2 bg-[#1a1a1a]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "projects") {
    return (
      <div className="space-y-8 select-none">
        {/* Header Shimmer */}
        <div className="flex justify-between items-center border-b border-dashed border-[#222222] pb-6">
          <div className="space-y-2">
            <Shimmer className="h-6 w-48 bg-[#262626]" />
            <Shimmer className="h-3 w-80 bg-[#1a1a1a]" />
          </div>
          <Shimmer className="h-9 w-28 rounded bg-[#262626]" />
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 border-b border-dashed border-[#222222] pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded bg-[#111111] border border-[#222222] p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Shimmer className="h-4.5 w-32 bg-[#262626]" />
                <Shimmer className="h-5 w-12 rounded bg-[#1f1f1f]" />
              </div>
              <Shimmer className="h-3 w-full bg-[#1a1a1a]" />
              <Shimmer className="h-3 w-5/6 bg-[#1a1a1a]" />
              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <Shimmer className="h-2.5 w-16 bg-[#1f1f1f]" />
                  <Shimmer className="h-2.5 w-8 bg-[#1f1f1f]" />
                </div>
                <Shimmer className="h-1.5 w-full rounded bg-[#222222]" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#222222]">
                <Shimmer className="h-3 w-24 bg-[#1f1f1f]" />
                <div className="flex -space-x-1.5">
                  <Shimmer className="h-6 w-6 rounded-full bg-[#262626]" />
                  <Shimmer className="h-6 w-6 rounded-full bg-[#262626]" />
                  <Shimmer className="h-6 w-6 rounded-full bg-[#262626]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "project-detail") {
    return (
      <div className="space-y-8 select-none">
        {/* Back navigation & header */}
        <div className="space-y-4">
          <Shimmer className="h-3 w-28 bg-[#1f1f1f]" />
          <div className="flex justify-between items-center border-b border-dashed border-[#222222] pb-6">
            <div className="space-y-2">
              <Shimmer className="h-6 w-64 bg-[#262626]" />
              <Shimmer className="h-3.5 w-96 bg-[#1a1a1a]" />
            </div>
            <Shimmer className="h-9 w-28 rounded bg-[#262626]" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 border-b border-[#222222] border-dashed pb-8">
          <div className="space-y-2 border-r border-[#222222] border-dashed pr-4">
            <Shimmer className="h-2.5 w-16 bg-[#1f1f1f]" />
            <Shimmer className="h-6 w-12 bg-[#262626]" />
          </div>
          <div className="space-y-2 border-r border-[#222222] border-dashed pr-4 pl-2">
            <Shimmer className="h-2.5 w-16 bg-[#1f1f1f]" />
            <Shimmer className="h-6 w-20 bg-[#262626]" />
          </div>
          <div className="space-y-2 border-r border-[#222222] border-dashed pr-4 pl-2">
            <Shimmer className="h-2.5 w-16 bg-[#1f1f1f]" />
            <Shimmer className="h-6 w-8 bg-[#262626]" />
          </div>
          <div className="space-y-2 pl-2">
            <Shimmer className="h-2.5 w-20 bg-[#1f1f1f]" />
            <Shimmer className="h-6 w-16 bg-[#262626]" />
          </div>
        </div>

        {/* Timeline Placeholder */}
        <div className="bg-[#111111] border border-[#222222] rounded p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Shimmer className="h-4 w-32 bg-[#262626]" />
            <Shimmer className="h-8 w-24 rounded bg-[#1f1f1f]" />
          </div>
          <div className="h-[140px] border border-dashed border-[#222222] rounded flex items-center justify-center p-4">
            <div className="w-full space-y-4">
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4 bg-[#1f1f1f]" />
                <Shimmer className="h-5 w-1/2 rounded bg-[#c8ff00]/10" />
              </div>
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4 bg-[#1f1f1f]" />
                <Shimmer className="h-5 w-1/3 rounded bg-[#262626]" />
              </div>
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4 bg-[#1f1f1f]" />
                <Shimmer className="h-5 w-2/3 rounded bg-[#222222]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "my-hours") {
    return (
      <div className="space-y-8 select-none">
        {/* Welcome header */}
        <div className="border-b border-dashed border-[#222222] pb-6">
          <Shimmer className="h-6 w-32 mb-2 bg-[#262626]" />
          <Shimmer className="h-3.5 w-60 bg-[#1a1a1a]" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-3 border-b border-[#222222] border-dashed pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#222222] border-dashed pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Shimmer className="h-9 w-60 rounded bg-[#161616]" />
            <Shimmer className="h-9 w-40 rounded bg-[#161616]" />
            <Shimmer className="h-9 w-48 rounded bg-[#161616]" />
          </div>
          <Shimmer className="h-9 w-28 rounded bg-[#262626]" />
        </div>

        {/* Flat list table placeholder */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b border-[#222222] font-bold">
            <Shimmer className="h-3.5 w-24 bg-[#262626]" />
            <Shimmer className="h-3.5 w-16 bg-[#262626]" />
            <Shimmer className="h-3.5 w-12 bg-[#262626]" />
            <Shimmer className="h-3.5 w-32 bg-[#262626]" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-[#222222]/50">
              <Shimmer className="h-4 w-32 bg-[#1f1f1f]" />
              <Shimmer className="h-3.5 w-20 bg-[#1f1f1f]" />
              <Shimmer className="h-4 w-8 bg-[#1f1f1f]" />
              <Shimmer className="h-3 w-40 bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "kanban") {
    return (
      <div className="space-y-6 select-none h-[calc(100vh-140px)] overflow-hidden">
        {/* Kanban Board controls header */}
        <div className="flex justify-between items-center border-b border-dashed border-[#222222] pb-4">
          <Shimmer className="h-6 w-60 bg-[#262626]" />
          <div className="flex gap-3">
            <Shimmer className="h-8 w-24 rounded bg-[#161616]" />
            <Shimmer className="h-8 w-28 rounded bg-[#161616]" />
          </div>
        </div>

        {/* Columns lane grid */}
        <div className="flex gap-6 overflow-x-auto pb-4 h-full justify-center">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div key={colIdx} className="w-[300px] flex-shrink-0 bg-[#111111] border border-[#222222] rounded p-3 space-y-4 flex flex-col h-[80%]">
              {/* Lane Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shimmer className="h-3 w-3 rounded-full bg-[#c8ff00]/40" />
                  <Shimmer className="h-4 w-24 bg-[#262626]" />
                  <Shimmer className="h-4.5 w-6 rounded bg-[#1f1f1f]" />
                </div>
                <Shimmer className="h-4 w-4 bg-[#1f1f1f]" />
              </div>
              <div className="border-b border-dashed border-[#222222]" />

              {/* Lane Card list */}
              <div className="space-y-3 flex-1 overflow-hidden">
                {Array.from({ length: colIdx === 0 ? 2 : colIdx === 1 ? 3 : 1 }).map((_, cardIdx) => (
                  <div key={cardIdx} className="rounded bg-[#161616] border border-[#262626] p-3 space-y-3 shadow">
                    <div className="flex justify-between">
                      <Shimmer className="h-4.5 w-16 rounded bg-[#262626]" />
                      <Shimmer className="h-4.5 w-12 rounded bg-[#1f1f1f]" />
                    </div>
                    <Shimmer className="h-3.5 w-full bg-[#1f1f1f]" />
                    <Shimmer className="h-3.5 w-3/4 bg-[#1a1a1a]" />
                    <div className="space-y-1.5 pt-1">
                      <Shimmer className="h-1 w-full rounded bg-[#222222]" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#222222]">
                      <Shimmer className="h-5 w-5 rounded-full bg-[#262626]" />
                      <Shimmer className="h-3 w-12 bg-[#1f1f1f]" />
                    </div>
                  </div>
                ))}
              </div>
              <Shimmer className="h-8 w-full rounded bg-[#161616]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 select-none">
        {/* Left main info */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-dashed border-[#222222] pb-8">
            <Shimmer className="h-20 w-20 rounded-full bg-[#262626]" />
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <Shimmer className="h-6 w-40 mx-auto sm:mx-0 bg-[#262626]" />
              <Shimmer className="h-3 w-48 mx-auto sm:mx-0 bg-[#1f1f1f]" />
              <Shimmer className="h-5 w-32 rounded bg-[#c8ff00]/10 mx-auto sm:mx-0" />
            </div>
          </div>
          {/* Charts preview mockups */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 space-y-4">
            <Shimmer className="h-4 w-48 bg-[#262626]" />
            <div className="h-[140px] border border-dashed border-[#222222] rounded" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-[#111111] border border-[#222222] rounded p-6 space-y-4 h-[200px] flex flex-col justify-between">
              <Shimmer className="h-4 w-36 bg-[#262626]" />
              <Shimmer className="h-20 w-full bg-[#161616]" />
            </div>
            <div className="bg-[#111111] border border-[#222222] rounded p-6 space-y-4 h-[200px] flex flex-col justify-between">
              <Shimmer className="h-4 w-40 bg-[#262626]" />
              <Shimmer className="h-20 w-full bg-[#161616]" />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 border-l border-[#222222] border-dashed lg:pl-8 space-y-6">
          <div className="space-y-2">
            <Shimmer className="h-4 w-28 bg-[#262626]" />
            <Shimmer className="h-2 w-full rounded bg-[#1a1a1a]" />
          </div>
          <div className="space-y-3 pt-4 border-t border-[#222222] border-dashed">
            <Shimmer className="h-4 w-32 bg-[#262626]" />
            <div className="flex flex-wrap gap-2">
              <Shimmer className="h-6 w-16 rounded bg-[#161616]" />
              <Shimmer className="h-6 w-24 rounded bg-[#161616]" />
              <Shimmer className="h-6 w-20 rounded bg-[#161616]" />
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-[#222222] border-dashed">
            <Shimmer className="h-4 w-36 bg-[#262626]" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1.5">
                <Shimmer className="h-3.5 w-40 bg-[#1f1f1f]" />
                <Shimmer className="h-3.5 w-6 bg-[#1f1f1f]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-4 select-none w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-4 border-b border-[#222222]">
            <div className="flex items-center gap-3">
              <Shimmer className="h-8 w-8 rounded-full bg-[#262626]" />
              <Shimmer className="h-4 w-32 bg-[#262626]" />
            </div>
            <Shimmer className="h-3.5 w-40 bg-[#1f1f1f]" />
            <Shimmer className="h-4 w-24 bg-[#1f1f1f]" />
            <Shimmer className="h-4 w-12 bg-[#1f1f1f]" />
            <Shimmer className="h-6 w-16 rounded bg-[#161616]" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
