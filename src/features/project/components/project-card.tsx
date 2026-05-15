import { Link } from 'react-router-dom'
import { cn } from '../../../lib/utils'
import type { ProjectViewMode } from '../../../types/project'

type ProjectCardProps = {
  id: string
  title: string
  summary: string
  updatedAt: string
  nodes: number
  initials: string
  variant?: 'sand' | 'steel' | 'mist' | 'mint'
  viewMode?: ProjectViewMode
}

const accentMap = {
  sand: 'linear-gradient(135deg, rgba(204,196,180,0.58), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.86), rgba(239,236,230,0.96))',
  steel:
    'linear-gradient(135deg, rgba(171,178,184,0.5), transparent 58%), linear-gradient(180deg, rgba(237,240,242,0.98), rgba(218,223,227,0.92))',
  mist: 'linear-gradient(135deg, rgba(227,229,232,0.65), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(241,243,245,0.96))',
  mint: 'linear-gradient(135deg, rgba(169,205,202,0.55), transparent 58%), linear-gradient(180deg, rgba(239,248,246,0.98), rgba(219,233,230,0.92))',
} as const

export function ProjectCard({
  id,
  title,
  summary,
  updatedAt,
  nodes,
  initials,
  variant = 'mist',
  viewMode = 'grid',
}: ProjectCardProps) {
  return (
    <Link
      to={`/workspace/${id}`}
      className={cn(
        'group rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5',
        viewMode === 'list' && 'flex items-center gap-4',
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between rounded-[18px] p-3',
          viewMode === 'grid' ? 'mb-3 aspect-[16/9]' : 'aspect-[4/3] w-[180px] shrink-0',
        )}
        style={{ background: accentMap[variant] }}
      >
        <span className="rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
          {nodes} 个节点
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-secondary)]">
          {initials}
        </span>
      </div>

      <div className="space-y-1 px-1 pb-1">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">{summary}</p>
        <div className="pt-2 text-xs text-[var(--text-muted)]">更新于 {updatedAt}</div>
      </div>
    </Link>
  )
}
