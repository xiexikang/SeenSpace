import { Link } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Ellipsis, Pencil, Star, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { ProjectViewMode } from '../../../types/project'

type ProjectCardProps = {
  id: string
  title: string
  summary: string
  coverImage?: string | null
  updatedAt: string
  nodes: number
  variant?: 'sand' | 'steel' | 'mist' | 'mint'
  isFavorite?: boolean
  isUpdatingFavorite?: boolean
  fromFavorites?: boolean
  viewMode?: ProjectViewMode
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
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
  coverImage,
  updatedAt,
  nodes,
  variant = 'mist',
  isFavorite = false,
  isUpdatingFavorite = false,
  fromFavorites = false,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProjectCardProps) {
  return (
    <div className="group relative h-full">
      <div
        className={cn(
          'relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)] transition-all group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lg)]',
          viewMode === 'grid' ? 'flex h-full flex-col' : 'flex items-center gap-4',
        )}
      >
        <Link
          to={`/workspace/${id}${fromFavorites ? '?from=favorites' : ''}`}
          aria-label={`打开空间：${title}`}
          className="absolute inset-0 z-10 rounded-[20px]"
        />
        <div
          className={cn(
            'relative flex items-start overflow-hidden rounded-[16px] p-4',
            viewMode === 'grid' ? 'mb-3 aspect-[16/9]' : 'aspect-[4/3] w-[180px] shrink-0',
          )}
          style={{ background: accentMap[variant] }}
        >
          {coverImage ? (
            <img
              src={coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/80" />
          {coverImage ? <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" /> : null}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <div
              className={cn(
                'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold',
                coverImage
                  ? 'bg-black/45 text-white backdrop-blur-sm'
                  : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
              )}
            >
              {nodes} 个节点
            </div>
          </div>
        </div>

        <div className={cn('px-1 pb-1', viewMode === 'grid' && 'flex flex-1 flex-col')}>
          <div className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</div>
          <p className={cn('mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]', viewMode === 'grid' && 'min-h-12')}>{summary}</p>
          <div className={cn('relative z-20 flex h-7 items-center justify-between gap-2 pt-1 text-xs text-[var(--text-muted)]', viewMode === 'grid' && 'mt-auto')}>
            <span>更新于 {updatedAt}</span>
            <button
              type="button"
              aria-label={isFavorite ? '取消收藏空间' : '收藏空间'}
              title={isFavorite ? '取消收藏' : '收藏'}
              disabled={isUpdatingFavorite}
              onClick={onToggleFavorite}
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60',
                isFavorite
                  ? 'text-[var(--accent)] hover:bg-[var(--accent-soft)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--panel-elevated)] hover:text-[var(--accent)]',
              )}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="更多操作"
            onClick={(event) => event.preventDefault()}
            className="absolute right-7 top-7 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-sm)] transition-all group-hover:opacity-100 hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)] focus-visible:opacity-100 data-[state=open]:opacity-100"
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
