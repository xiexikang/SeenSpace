import { cn } from '../../../lib/utils'
import type { ProjectViewMode } from '../../../types/project'

type ProjectCardSkeletonProps = {
  viewMode?: ProjectViewMode
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn('project-skeleton-shimmer rounded-full bg-[var(--panel-soft)]', className)} />
}

export function ProjectCardSkeleton({ viewMode = 'grid' }: ProjectCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)]',
        viewMode === 'grid' ? 'flex h-full flex-col' : 'flex items-center gap-4',
      )}
    >
      <div
        className={cn(
          'project-skeleton-shimmer relative overflow-hidden rounded-[16px] bg-[var(--panel-soft)]',
          viewMode === 'grid' ? 'mb-3 aspect-[16/9] w-full' : 'aspect-[4/3] w-[180px] shrink-0',
        )}
      >
        <div className="absolute bottom-4 left-4 h-6 w-16 rounded-full bg-[var(--panel-elevated)]" />
      </div>

      <div className={cn('min-w-0 px-1 pb-1', viewMode === 'grid' && 'flex flex-1 flex-col')}>
        <SkeletonBlock className="h-5 w-[58%] max-w-48" />
        <div className="mt-3 space-y-2.5">
          <SkeletonBlock className="h-3.5 w-full max-w-xl" />
          <SkeletonBlock className="h-3.5 w-[72%] max-w-md" />
        </div>
        <SkeletonBlock className={cn('h-3 w-24', viewMode === 'grid' ? 'mt-5' : 'mt-4')} />
      </div>
    </div>
  )
}
