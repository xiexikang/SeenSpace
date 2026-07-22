import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, KeyRound, LogOut, NotebookPen, Palette, PanelLeftClose, PanelLeftOpen, Pencil, Star, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  getCurrentUser,
  logout,
  updateUserName,
  updateUserPassword,
  type AuthUser,
} from '../../features/auth/services/auth-service'
import { useTheme } from '../../hooks/use-theme'
import logoUrl from '../../assets/logo.png'

const primaryItems = [
  { label: '全部空间', icon: NotebookPen, to: '/', end: true },
  { label: '我的收藏', icon: Star, to: '/favorites', end: false },
]

const sidebarCollapsedStorageKey = 'seenspace-sidebar-collapsed'

export function LibrarySidebar() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isWorkspaceFromFavorites =
    pathname.startsWith('/workspace') && new URLSearchParams(search).get('from') === 'favorites'
  const { resolvedTheme, setTheme } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(sidebarCollapsedStorageKey) === 'true',
  )

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

  useEffect(() => {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(isCollapsed))
  }, [isCollapsed])

  const displayName = user?.name || user?.username || 'demo'
  const accountName = user?.username || 'demo'
  const avatarText = displayName.trim().slice(0, 1).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function openNameDialog() {
    setNameInput(displayName)
    setFormError('')
    setIsNameDialogOpen(true)
  }

  function openPasswordDialog() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setFormError('')
    setIsPasswordDialogOpen(true)
  }

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextName = nameInput.trim()
    if (!nextName) return

    setIsSaving(true)
    setFormError('')
    try {
      const nextUser = await updateUserName(nextName)
      setUser(nextUser)
      setIsNameDialogOpen(false)
    } catch {
      setFormError('昵称修改失败，请稍后重试。')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setFormError('两次输入的新密码不一致。')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      await updateUserPassword(currentPassword, newPassword)
      setIsPasswordDialogOpen(false)
    } catch {
      setFormError('密码修改失败，请检查当前密码。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-[var(--border)] bg-[color:color-mix(in_srgb,var(--sidebar)_94%,white_6%)] transition-[width] duration-200 lg:flex lg:flex-col',
        isCollapsed ? 'w-[76px]' : 'w-[220px]',
      )}
    >
      <div className={cn('flex h-[69px] shrink-0 items-center', isCollapsed ? 'justify-center px-2' : 'gap-3 px-4')}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="展开侧栏"
            title="展开侧栏"
            className="group/logo relative h-9 w-9 shrink-0 rounded-[12px]"
          >
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 rounded-[12px] object-cover shadow-[0_8px_20px_rgba(255,40,75,0.2)] transition-opacity group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-[var(--panel-soft)] text-[var(--text-secondary)] opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
              <PanelLeftOpen className="h-4 w-4" />
            </span>
          </button>
        ) : (
          <>
            <img
              src={logoUrl}
              alt="SeenSpace logo"
              className="h-9 w-9 shrink-0 rounded-[12px] object-cover shadow-[0_8px_20px_rgba(255,40,75,0.2)]"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">SeenSpace</div>
              <div className="mt-0.5 truncate text-xs font-medium text-[var(--text-secondary)]">见间 · 灵感工作台</div>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label="收起侧栏"
              title="收起侧栏"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav className={cn('flex-1', isCollapsed ? 'px-4 pt-5' : 'px-4 pt-6')}>
        <div className={cn('mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]', isCollapsed && 'sr-only')}>
          内容分区
        </div>
        <div className={cn(isCollapsed ? 'flex flex-col items-center gap-1' : 'space-y-2')}>
          {primaryItems.map(({ label, icon: Icon, to, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) => {
                const isItemActive =
                  isActive ||
                  (to === '/' && pathname.startsWith('/workspace') && !isWorkspaceFromFavorites) ||
                  (to === '/favorites' && isWorkspaceFromFavorites)
                return cn(
                  'flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-sm transition-colors',
                  isCollapsed && 'h-10 w-10 justify-center gap-0 rounded-full p-0',
                  isItemActive
                    ? 'border-transparent bg-[color:color-mix(in_srgb,var(--accent)_88%,var(--panel)_12%)] !text-white shadow-[var(--shadow-sm)] [&_span]:!text-white [&_svg]:!text-white'
                    : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]',
                  isCollapsed && isItemActive && 'shadow-none',
                )
              }}
            >
              <Icon className="h-4 w-4" />
              <span className={cn(isCollapsed && 'sr-only')}>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className={cn('relative mt-auto border-t border-[var(--border)]', isCollapsed ? 'p-3' : 'p-4')}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] px-3 py-3 text-left text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--panel-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                {avatarText}
              </div>
              <div className={cn('min-w-0 flex-1 truncate font-medium', isCollapsed && 'hidden')}>{displayName}</div>
              <span className={cn('rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-strong)]', isCollapsed && 'hidden')}>
                Pro
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="start"
              sideOffset={8}
              className="z-50 w-[238px] rounded-[20px] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--panel)_97%,var(--background)_3%)] p-2 text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-sm font-semibold text-white">
                  {avatarText}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{displayName}</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">@{accountName}</div>
                </div>
                <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">Pro</span>
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item onSelect={openNameDialog} className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm outline-none hover:bg-[var(--panel-soft)] focus:bg-[var(--panel-soft)]">
                <Pencil className="h-4 w-4 text-[var(--text-secondary)]" />
                修改昵称
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={openPasswordDialog} className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm outline-none hover:bg-[var(--panel-soft)] focus:bg-[var(--panel-soft)]">
                <KeyRound className="h-4 w-4 text-[var(--text-secondary)]" />
                修改密码
              </DropdownMenu.Item>

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm outline-none hover:bg-[var(--panel-soft)] focus:bg-[var(--panel-soft)] data-[state=open]:bg-[var(--panel-soft)]">
                  <Palette className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="flex-1">主题</span>
                  <span className="text-xs text-[var(--text-muted)]">{resolvedTheme === 'dark' ? '暗色' : '亮色'}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={6}
                    alignOffset={-6}
                    className="z-[60] min-w-[124px] rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-1.5 text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
                  >
                    {[
                      { value: 'light', label: '亮色' },
                      { value: 'dark', label: '暗色' },
                    ].map((item) => (
                      <DropdownMenu.Item
                        key={item.value}
                        onSelect={() => setTheme(item.value)}
                        className="flex h-9 items-center justify-between rounded-[10px] px-3 text-sm outline-none hover:bg-[var(--panel-soft)] focus:bg-[var(--panel-soft)]"
                      >
                        {item.label}
                        {resolvedTheme === item.value ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item
                onSelect={() => void handleLogout()}
                className="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--panel-soft)] px-3 text-sm outline-none hover:bg-[var(--panel-elevated)] focus:bg-[var(--panel-elevated)]"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <Dialog.Root open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/28 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
            <AccountDialogHeader title="修改昵称" />
            <form onSubmit={handleNameSubmit} className="mt-5 space-y-4">
              <AccountInput label="新昵称" placeholder="请输入新昵称" value={nameInput} onChange={setNameInput} autoFocus />
              {formError ? <p className="text-xs text-[var(--accent-strong)]">{formError}</p> : null}
              <AccountDialogActions isSaving={isSaving} />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/28 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
            <AccountDialogHeader title="修改密码" />
            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <AccountInput label="当前密码" placeholder="请输入当前密码" type="password" value={currentPassword} onChange={setCurrentPassword} autoFocus />
              <AccountInput label="新密码" placeholder="请输入新密码" type="password" value={newPassword} onChange={setNewPassword} />
              <AccountInput label="确认新密码" placeholder="请再次输入新密码" type="password" value={confirmPassword} onChange={setConfirmPassword} />
              {formError ? <p className="text-xs text-[var(--accent-strong)]">{formError}</p> : null}
              <AccountDialogActions isSaving={isSaving} />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
  )
}

function AccountDialogHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
      <Dialog.Close asChild>
        <button type="button" aria-label="关闭" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-soft)] hover:text-[var(--text-primary)]">
          <X className="h-4 w-4" />
        </button>
      </Dialog.Close>
    </div>
  )
}

function AccountInput({ label, placeholder, value, onChange, type = 'text', autoFocus = false }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; type?: string; autoFocus?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={type === 'password' ? 6 : 1}
        maxLength={type === 'password' ? 128 : 80}
        autoFocus={autoFocus}
        className="h-11 w-full rounded-[14px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
      />
    </label>
  )
}

function AccountDialogActions({ isSaving }: { isSaving: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Dialog.Close asChild>
        <button type="button" className="h-10 rounded-full border border-[var(--border)] px-4 text-sm font-medium">取消</button>
      </Dialog.Close>
      <button type="submit" disabled={isSaving} className="h-10 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50">
        {isSaving ? '保存中...' : '保存修改'}
      </button>
    </div>
  )
}
