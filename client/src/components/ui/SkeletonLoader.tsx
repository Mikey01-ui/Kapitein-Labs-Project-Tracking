import React from "react";

interface SkeletonLoaderProps {
  variant?: "dashboard" | "projects" | "project-detail" | "my-hours" | "kanban" | "profile" | "table";
}

export function SkeletonLoader({ variant = "dashboard" }: SkeletonLoaderProps) {
  // Base shimmering bar utility
  const Shimmer = ({ className = "h-4 w-full" }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-[#1B2A3F] ${className}`} />
  );

  // Stats Card Skeleton
  const StatCardSkeleton = () => (
    <div className="rounded-[20px] bg-[#121E30] border border-[#253347]/40 p-6 flex flex-col justify-between h-[100px]">
      <Shimmer className="h-3 w-24" />
      <div className="flex items-baseline justify-between mt-3">
        <Shimmer className="h-8 w-16" />
        <Shimmer className="h-6 w-10" />
      </div>
    </div>
  );

  if (variant === "dashboard") {
    return (
      <div className="space-y-8 select-none">
        {/* Banner Shimmer */}
        <div className="border-b border-dashed border-[#1B2A3F] pb-6">
          <Shimmer className="h-6 w-64 mb-2" />
          <Shimmer className="h-3.5 w-96" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#1B2A3F] border-dashed pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 pb-8">
          {/* Active Projects List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-b border-[#1B2A3F] pb-4 flex justify-between">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-4 w-12" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#1B2A3F]/30 last:border-0">
                  <div className="flex items-center gap-3 flex-1">
                    <Shimmer className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Shimmer className="h-3.5 w-1/3" />
                      <Shimmer className="h-2 w-1/2" />
                    </div>
                  </div>
                  <Shimmer className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Radial Gauge & TRL section */}
          <div className="lg:col-span-5 border-l border-[#1B2A3F] border-dashed lg:pl-8 space-y-6">
            <div className="border-b border-[#1B2A3F] pb-4">
              <Shimmer className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="h-28 w-28 rounded-full border-4 border-dashed border-[#1B2A3F] animate-spin flex items-center justify-center" style={{ animationDuration: "12s" }}>
                <div className="h-20 w-20 rounded-full border border-dashed border-[#1B2A3F]/50" />
              </div>
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-5/6" />
                <Shimmer className="h-3 w-2/3" />
              </div>
            </div>
            <div className="pt-6 border-t border-[#1B2A3F] border-dashed space-y-3">
              <Shimmer className="h-3.5 w-1/3" />
              <Shimmer className="h-2 w-full" />
              <Shimmer className="h-2 w-1/2" />
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
        <div className="flex justify-between items-center border-b border-dashed border-[#1B2A3F] pb-6">
          <div className="space-y-2">
            <Shimmer className="h-6 w-48" />
            <Shimmer className="h-3 w-80" />
          </div>
          <Shimmer className="h-9 w-28 rounded-xl" />
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 border-b border-dashed border-[#1B2A3F] pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[20px] bg-[#121E30] border border-[#253347]/40 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Shimmer className="h-4.5 w-32" />
                <Shimmer className="h-5 w-12 rounded" />
              </div>
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-5/6" />
              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <Shimmer className="h-2.5 w-16" />
                  <Shimmer className="h-2.5 w-8" />
                </div>
                <Shimmer className="h-1.5 w-full rounded-full" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#1B2A3F]/50">
                <Shimmer className="h-3 w-24" />
                <div className="flex -space-x-1.5">
                  <Shimmer className="h-6 w-6 rounded-full" />
                  <Shimmer className="h-6 w-6 rounded-full" />
                  <Shimmer className="h-6 w-6 rounded-full" />
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
          <Shimmer className="h-3 w-28" />
          <div className="flex justify-between items-center border-b border-dashed border-[#1B2A3F] pb-6">
            <div className="space-y-2">
              <Shimmer className="h-6 w-64" />
              <Shimmer className="h-3.5 w-96" />
            </div>
            <Shimmer className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 border-b border-[#1B2A3F] border-dashed pb-8">
          <div className="space-y-2 border-r border-[#1B2A3F]/40 border-dashed pr-4">
            <Shimmer className="h-2.5 w-16" />
            <Shimmer className="h-6 w-12" />
          </div>
          <div className="space-y-2 border-r border-[#1B2A3F]/40 border-dashed pr-4 pl-2">
            <Shimmer className="h-2.5 w-16" />
            <Shimmer className="h-6 w-20" />
          </div>
          <div className="space-y-2 border-r border-[#1B2A3F]/40 border-dashed pr-4 pl-2">
            <Shimmer className="h-2.5 w-16" />
            <Shimmer className="h-6 w-8" />
          </div>
          <div className="space-y-2 pl-2">
            <Shimmer className="h-2.5 w-20" />
            <Shimmer className="h-6 w-16" />
          </div>
        </div>

        {/* Gantt Timeline Placeholder */}
        <div className="bg-[#121E30]/50 border border-[#253347]/30 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-8 w-24 rounded-lg" />
          </div>
          <div className="h-[140px] border border-dashed border-[#1B2A3F] rounded-lg flex items-center justify-center p-4">
            <div className="w-full space-y-4">
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4" />
                <Shimmer className="h-5 w-1/2 rounded bg-teal/20" />
              </div>
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4" />
                <Shimmer className="h-5 w-1/3 rounded" />
              </div>
              <div className="flex gap-4 items-center">
                <Shimmer className="h-6 w-1/4" />
                <Shimmer className="h-5 w-2/3 rounded" />
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
        <div className="border-b border-dashed border-[#1B2A3F] pb-6">
          <Shimmer className="h-6 w-32 mb-2" />
          <Shimmer className="h-3.5 w-60" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-3 border-b border-[#1B2A3F] border-dashed pb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#1B2A3F] border-dashed pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Shimmer className="h-9 w-60 rounded-xl" />
            <Shimmer className="h-9 w-40 rounded-xl" />
            <Shimmer className="h-9 w-48 rounded-xl" />
          </div>
          <Shimmer className="h-9 w-28 rounded-xl" />
        </div>

        {/* Flat list table placeholder */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b border-[#1B2A3F]/50 font-bold">
            <Shimmer className="h-3.5 w-24" />
            <Shimmer className="h-3.5 w-16" />
            <Shimmer className="h-3.5 w-12" />
            <Shimmer className="h-3.5 w-32" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-[#1B2A3F]/20">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-3.5 w-20" />
              <Shimmer className="h-4 w-8" />
              <Shimmer className="h-3 w-40" />
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
        <div className="flex justify-between items-center border-b border-dashed border-[#1B2A3F] pb-4">
          <Shimmer className="h-6 w-60" />
          <div className="flex gap-3">
            <Shimmer className="h-8 w-24 rounded-lg" />
            <Shimmer className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        {/* Columns lane grid */}
        <div className="flex gap-6 overflow-x-auto pb-4 h-full justify-center">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div key={colIdx} className="w-[300px] flex-shrink-0 bg-[#121E30]/20 border border-[#253347]/10 rounded-[20px] p-3 space-y-4 flex flex-col h-[80%]">
              {/* Lane Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shimmer className="h-3 w-3 rounded-full" />
                  <Shimmer className="h-4 w-24" />
                  <Shimmer className="h-4.5 w-6 rounded bg-[#1B2A3F]" />
                </div>
                <Shimmer className="h-4 w-4" />
              </div>
              <div className="border-b border-dashed border-[#1B2A3F]/50" />

              {/* Lane Card list */}
              <div className="space-y-3 flex-1 overflow-hidden">
                {Array.from({ length: colIdx === 0 ? 2 : colIdx === 1 ? 3 : 1 }).map((_, cardIdx) => (
                  <div key={cardIdx} className="rounded-xl bg-[#121E30] border border-[#253347]/30 p-3 space-y-3 shadow">
                    <div className="flex justify-between">
                      <Shimmer className="h-4.5 w-16 rounded" />
                      <Shimmer className="h-4.5 w-12 rounded bg-[#1B2A3F]/60" />
                    </div>
                    <Shimmer className="h-3.5 w-full" />
                    <Shimmer className="h-3.5 w-3/4" />
                    <div className="space-y-1.5 pt-1">
                      <Shimmer className="h-1 w-full rounded" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#1B2A3F]/50">
                      <Shimmer className="h-5 w-5 rounded-full" />
                      <Shimmer className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
              <Shimmer className="h-8 w-full rounded-xl" />
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
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-dashed border-[#1B2A3F] pb-8">
            <Shimmer className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <Shimmer className="h-6 w-40 mx-auto sm:mx-0" />
              <Shimmer className="h-3 w-48 mx-auto sm:mx-0" />
              <Shimmer className="h-5 w-32 rounded bg-teal/10 mx-auto sm:mx-0" />
            </div>
          </div>
          {/* Charts preview mockups */}
          <div className="bg-[#121E30]/40 border border-[#253347]/20 rounded-[20px] p-6 space-y-4">
            <Shimmer className="h-4 w-48" />
            <div className="h-[140px] border border-dashed border-[#1B2A3F] rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-[#121E30]/40 border border-[#253347]/20 rounded-[20px] p-6 space-y-4 h-[200px] flex flex-col justify-between">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-20 w-full" />
            </div>
            <div className="bg-[#121E30]/40 border border-[#253347]/20 rounded-[20px] p-6 space-y-4 h-[200px] flex flex-col justify-between">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-20 w-full" />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 border-l border-[#1B2A3F] border-dashed lg:pl-8 space-y-6">
          <div className="space-y-2">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-2 w-full rounded-full" />
          </div>
          <div className="space-y-3 pt-4 border-t border-[#1B2A3F] border-dashed">
            <Shimmer className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              <Shimmer className="h-6 w-16 rounded" />
              <Shimmer className="h-6 w-24 rounded" />
              <Shimmer className="h-6 w-20 rounded" />
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-[#1B2A3F] border-dashed">
            <Shimmer className="h-4 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1.5">
                <Shimmer className="h-3.5 w-40" />
                <Shimmer className="h-3.5 w-6" />
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
          <div key={i} className="flex justify-between items-center py-4 border-b border-[#1B2A3F]/20">
            <div className="flex items-center gap-3">
              <Shimmer className="h-8 w-8 rounded-full" />
              <Shimmer className="h-4 w-32" />
            </div>
            <Shimmer className="h-3.5 w-40" />
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-12" />
            <Shimmer className="h-6 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
