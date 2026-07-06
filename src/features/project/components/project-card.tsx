import { Link } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
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
  onEdit?: () => void
  onDelete?: () => void
}

const accentMap = {
  sand: 'linear-gradient(160deg, rgba(255,40,75,0.08), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,240,232,0.98))',
  steel:
    'linear-gradient(160deg, rgba(127,135,146,0.14), transparent 48%), linear-gradient(180deg, rgba(248,249,251,0.98), rgba(226,231,236,0.96))',
  mist: 'linear-gradient(160deg, rgba(255,40,75,0.1), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,242,245,0.98))',
  mint: 'linear-gradient(160deg, rgba(227,255,127,0.34), transparent 42%), linear-gradient(180deg, rgba(244,249,243,0.98), rgba(227,239,233,0.96))',
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
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <div className="group relative">
      <Link
        to={`/workspace/${id}`}
        className={cn(
          'group block overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]',
          viewMode === 'list' && 'flex items-center gap-4',
        )}
      >
        <div
          className={cn(
            'relative flex items-start justify-between overflow-hidden rounded-[16px] p-4',
            viewMode === 'grid' ? 'mb-3 aspect-[16/9]' : 'aspect-[4/3] w-[180px] shrink-0',
          )}
          style={{ background: accentMap[variant] }}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/80" />
          <span className="rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
            {nodes} 个节点
          </span>
          <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--text-secondary)] backdrop-blur-sm">
            {initials}
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <div className="inline-flex rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
              PROJECT
            </div>
          </div>
        </div>

        <div className="space-y-1.5 px-1 pb-1 pr-10">
          <div className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</div>
          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{summary}</p>
          <div className="flex items-center justify-between gap-3 pt-1 text-xs text-[var(--text-muted)]">
            <span>更新于 {updatedAt}</span>
            <span className="rounded-full bg-[var(--panel-soft)] px-2 py-1">内容画布</span>
          </div>
        </div>
      </Link>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="更多操作"
            onClick={(event) => event.preventDefault()}
            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-sm)] transition-all group-hover:opacity-100 hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)] focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="end"
            className="z-50 min-w-[140px] rounded-[18px] border border-[var(--border)] bg-[var(--panel)] p-1.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
          >
            <DropdownMenu.Item
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--panel-elevated)] focus:bg-[var(--panel-elevated)]"
            >
              <Pencil className="h-4 w-4" />
              编辑
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onDelete}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[var(--accent-strong)] outline-none transition-colors hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)]"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
