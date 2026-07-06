import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Globe, Image, LogOut, NotebookPen, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getCurrentUser, logout, type AuthUser } from '../../features/auth/services/auth-service'

const primaryItems = [
  { label: '全部笔记', icon: NotebookPen, active: true },
  { label: '图片', icon: Image },
  { label: '网页', icon: Globe },
  { label: '收藏', icon: Star },
]

export function LibrarySidebar() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let isActive = true
    getCurrentUser()
      .then((currentUser) => {
        if (isActive) setUser(currentUser)
      })
      .catch(() => {
        if (isActive) setUser(null)
      })
    return () => {
      isActive = false
    }
  }, [])

  const displayName = user?.name || user?.username || 'demo'
  const accountName = user?.username || 'demo'
  const avatarText = displayName.trim().slice(0, 1).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden w-[270px] shrink-0 border-r border-[var(--border)] bg-[color:color-mix(in_srgb,var(--sidebar)_94%,white_6%)] lg:flex lg:flex-col">
      <div className="px-5 pb-6 pt-7">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent)]">
            <FolderOpen className="h-4 w-4" />
          </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">Library</div>
              <div className="text-base font-semibold text-[var(--text-primary)]">素材库</div>
            </div>
          </div>
          <div className="rounded-[16px] bg-[var(--panel-soft)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
            图像优先、快速检索，把灵感集中到一个地方。
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4">
        <div className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          内容分区
        </div>
        <div className="space-y-2">
          {primaryItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-sm transition-colors',
                active
                  ? 'border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                  : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="relative mt-auto border-t border-[var(--border)] p-4">
        <div className="group/account">
          <div className="pointer-events-none absolute bottom-[72px] left-4 right-4 z-20 translate-y-2 opacity-0 transition duration-150 group-hover/account:pointer-events-auto group-hover/account:translate-y-0 group-hover/account:opacity-100 group-focus-within/account:pointer-events-auto group-focus-within/account:translate-y-0 group-focus-within/account:opacity-100">
            <div className="rounded-[20px] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--panel)_96%,var(--background)_4%)] p-3 text-[var(--text-primary)] shadow-[var(--shadow-lg)] backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-1.5 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                  {avatarText}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">@{accountName}</div>
                </div>
                <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-strong)]">
                  Pro
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--panel-soft)] px-3 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--panel-elevated)]"
              >
                <LogOut className="h-4 w-4" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] px-3 py-3 text-left text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--panel-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              {avatarText}
            </div>
            <div className="min-w-0 flex-1 truncate font-medium">{displayName}</div>
            <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-strong)]">
              Pro
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
