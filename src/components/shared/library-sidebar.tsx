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
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
      <div className="px-5 pb-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--panel-elevated)] text-[var(--text-primary)]">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--text-primary)]">素材库</div>
            <div className="text-xs text-[var(--text-secondary)]">灵感收集</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {primaryItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--panel-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="relative border-t border-[var(--border)] p-3">
        <div className="group/account">
          <div className="pointer-events-none absolute bottom-[60px] left-3 right-3 z-20 translate-y-2 opacity-0 transition duration-150 group-hover/account:pointer-events-auto group-hover/account:translate-y-0 group-hover/account:opacity-100 group-focus-within/account:pointer-events-auto group-focus-within/account:translate-y-0 group-focus-within/account:opacity-100">
            <div className="rounded-xl border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--panel)_94%,var(--background)_6%)] p-2 text-[var(--text-primary)] shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-1.5 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#f4c87d,#8fb7a7_48%,#5d6f91)] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  {avatarText}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">@{accountName}</div>
                </div>
                <span className="rounded-[5px] border border-[var(--border-strong)] bg-[color:color-mix(in_srgb,var(--panel-elevated)_82%,var(--text-primary)_18%)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--text-primary)]">
                  Pro
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[var(--panel)] px-3 text-sm text-[var(--text-primary)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--panel-elevated)_88%,var(--text-primary)_12%)]"
              >
                <LogOut className="h-4 w-4" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#f4c87d,#8fb7a7_48%,#5d6f91)] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
              {avatarText}
            </div>
            <div className="min-w-0 flex-1 truncate font-medium">{displayName}</div>
            <span className="rounded-[5px] border border-[var(--border-strong)] bg-[color:color-mix(in_srgb,var(--panel-elevated)_82%,var(--text-primary)_18%)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--text-primary)]">
              Pro
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
