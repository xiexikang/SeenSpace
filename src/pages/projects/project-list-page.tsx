import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Trash2, X } from 'lucide-react'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { LightToast } from '../../components/shared/light-toast'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { ProjectCard } from '../../features/project/components/project-card'
import {
  createProject,
  deleteProject,
  ensureProjectSeed,
  listProjects,
  updateProjectMetadata,
} from '../../features/project/services/project-service'
import type { ProjectRecord, ProjectViewMode } from '../../types/project'

function formatUpdatedAt(value: string) {
  const timestamp = new Date(value).getTime()
  const diffMs = Date.now() - timestamp
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return new Date(value).toLocaleDateString('zh-CN')
}

export function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ProjectViewMode>('grid')
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectRecord | null>(null)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectSummary, setProjectSummary] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadProjects() {
      await ensureProjectSeed()
      const records = await listProjects()
      setProjects(records)
    }

    void loadProjects()
  }, [])

  useEffect(() => {
    if (!toastMessage) return

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null)
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) => {
      const haystack = `${project.name} ${project.summary}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [projects, search])
  const hasSearchQuery = search.trim().length > 0
  const isEmptyState = filteredProjects.length === 0

  function openCreateDialog() {
    setEditingProject(null)
    setProjectName('')
    setProjectSummary('')
    setIsProjectDialogOpen(true)
  }

  function openEditDialog(project: ProjectRecord) {
    setEditingProject(project)
    setProjectName(project.name)
    setProjectSummary(project.summary)
    setIsProjectDialogOpen(true)
  }

  function openDeleteDialog(project: ProjectRecord) {
    setDeletingProject(project)
    setIsDeleteDialogOpen(true)
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      name: projectName.trim(),
      summary: projectSummary.trim(),
    }
    if (!input.name || !input.summary) return

    setIsSavingProject(true)
    try {
      if (editingProject) {
        const project = await updateProjectMetadata(editingProject.id, input)
        setProjects((current) => current.map((item) => (item.id === project.id ? project : item)))
        setToastMessage('目录已更新')
      } else {
        const project = await createProject(input)
        setProjects((current) => [project, ...current])
        navigate(`/workspace/${project.id}`, {
          state: {
            actionMessage: '目录已创建',
          },
        })
      }
      setIsProjectDialogOpen(false)
    } finally {
      setIsSavingProject(false)
    }
  }

  function handleCreateProject() {
    openCreateDialog()
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open && isSavingProject) return
    setIsProjectDialogOpen(open)
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (!open && isDeletingProject) return
    setIsDeleteDialogOpen(open)
  }

  async function handleDeleteProject() {
    if (!deletingProject) return

    setIsDeletingProject(true)
    try {
      await deleteProject(deletingProject.id)
      setProjects((current) => current.filter((project) => project.id !== deletingProject.id))
      setIsDeleteDialogOpen(false)
      setDeletingProject(null)
      setToastMessage('目录已删除')
    } finally {
      setIsDeletingProject(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar
          title="SeenSpace (见间)"
          searchPlaceholder="搜索项目..."
          searchValue={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewProject={handleCreateProject}
        />

        <section className="px-4 py-6 md:px-6 md:py-7">
          <div className="mb-6 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_280px] lg:items-end">
              <div>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  Pinboard Workspace
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">全部项目</h1>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {filteredProjects.length}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  用更像内容平台的方式浏览你的工作区。每个项目都保留原有数据、搜索、编辑和删除能力，只更新界面语言。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">已收录</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{projects.length}</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">项目目录</div>
                </div>
                <div className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,40,75,0.98),rgba(205,0,35,0.98))] px-4 py-4 text-white">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/72">状态</div>
                  <div className="mt-1 text-2xl font-semibold">可继续</div>
                  <div className="mt-1 text-xs text-white/72">不影响现有功能</div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                : 'flex flex-col gap-4'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.name}
                summary={project.summary}
                updatedAt={formatUpdatedAt(project.updatedAt)}
                nodes={project.nodeCount}
                initials={project.initials}
                variant={project.thumbnailVariant}
                viewMode={viewMode}
                onEdit={() => openEditDialog(project)}
                onDelete={() => openDeleteDialog(project)}
              />
            ))}
          </div>

          {isEmptyState ? (
            <div className="mt-10 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
              <div className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                {hasSearchQuery ? '没有匹配的项目' : '还没有项目'}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasSearchQuery ? '换个关键词试试，或新建一个工作区。' : '先创建一个项目，开始整理你的灵感和画布。'}
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                >
                  新建项目
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <Dialog.Root open={isProjectDialogOpen} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/28 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  {editingProject ? '修改目录' : '新增目录'}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">目录名称</div>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  required
                  maxLength={160}
                  autoFocus
                  className="h-11 w-full rounded-[16px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">目录说明</div>
                <textarea
                  value={projectSummary}
                  onChange={(event) => setProjectSummary(event.target.value)}
                  required
                  maxLength={500}
                  rows={4}
                  className="min-h-[104px] w-full resize-none rounded-[16px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3 text-sm outline-none"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="h-10 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)]"
                  >
                    取消
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="h-10 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSavingProject ? '保存中...' : editingProject ? '保存修改' : '创建目录'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/28 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">删除目录</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  确认删除“{deletingProject?.name ?? '当前目录'}”吗？删除后不可恢复。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-10 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)]"
                >
                  取消
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingProject ? '删除中...' : '确认删除'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <LightToast message={toastMessage} />
    </div>
  )
}
