import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, Keyboard, MousePointer2, X } from 'lucide-react'

type ShortcutGuideDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ShortcutItem = {
  label: string
  keys: string[]
  note?: string
}

const shortcutGroups: Array<{ title: string; items: ShortcutItem[] }> = [
  {
    title: '编辑',
    items: [
      { label: '撤销', keys: ['Ctrl / ⌘', 'Z'] },
      { label: '重做', keys: ['Ctrl / ⌘', 'Shift', 'Z'] },
      { label: '复制选中节点', keys: ['Ctrl / ⌘', 'D'] },
      { label: '删除选中内容', keys: ['Delete'] },
    ],
  },
  {
    title: '整理',
    items: [
      { label: '组合选中节点', keys: ['Ctrl / ⌘', 'G'] },
      { label: '取消组合', keys: ['Ctrl / ⌘', 'Shift', 'G'] },
      { label: '微移节点', keys: ['方向键'], note: '每次移动 8px' },
      { label: '大步移动', keys: ['Shift', '方向键'], note: '每次移动 24px' },
    ],
  },
  {
    title: '选择与连线',
    items: [
      { label: '清除当前选择', keys: ['Esc'] },
      { label: '追加选择', keys: ['Ctrl / ⌘ / Shift', '点击'] },
      { label: '框选多个节点', keys: ['拖动画布'] },
      { label: '设置关系预设', keys: ['1—6'], note: '先选中一条或多条连线' },
    ],
  },
]

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-h-7 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2 font-mono text-[11px] font-semibold leading-none text-[var(--text-primary)] shadow-[0_2px_0_var(--border)]">
      {children}
    </kbd>
  )
}

export function ShortcutGuideDialog({ open, onOpenChange }: ShortcutGuideDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/24 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(760px,calc(100dvh-32px))] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
          <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--panel-elevated)] px-5 py-5 sm:px-7">
            <div className="pointer-events-none absolute -right-8 -top-12 font-mono text-[120px] font-black leading-none text-[var(--accent-soft)]">
              ⌘
            </div>
            <div className="relative flex items-start gap-3 pr-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold">快捷操作</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                  少点几次按钮，把注意力留在画布上。
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="关闭快捷操作"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-[calc(100dvh-170px)] overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-3">
              {shortcutGroups.map((group, groupIndex) => (
                <section
                  key={group.title}
                  className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-elevated)] p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                    {groupIndex === 2 ? <MousePointer2 className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {group.title}
                  </div>
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 text-[13px] font-medium text-[var(--text-primary)]">{item.label}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.keys.map((key) => <Keycap key={key}>{key}</Keycap>)}
                        </div>
                        {item.note ? <div className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">{item.note}</div> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
              输入框获得焦点时，画布快捷键会自动暂停。
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
