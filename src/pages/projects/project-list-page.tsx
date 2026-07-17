import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { LightToast } from '../../components/shared/light-toast'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { ProjectCard } from '../../features/project/components/project-card'
import { createProjectCoverDataUrl } from '../../features/project/services/project-cover'
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
  const [projectCoverImage, setProjectCoverImage] = useState<string | null>(null)
  const [coverImageError, setCoverImageError] = useState<string | null>(null)
  const [isProcessingCover, setIsProcessingCover] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

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
    setProjectCoverImage(null)
    setCoverImageError(null)
    setIsProjectDialogOpen(true)
  }

  function openEditDialog(project: ProjectRecord) {
    setEditingProject(project)
    setProjectName(project.name)
    setProjectSummary(project.summary)
    setProjectCoverImage(project.coverImage ?? null)
    setCoverImageError(null)
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
      coverImage: projectCoverImage,
    }
    if (!input.name || !input.summary) return
    if (!input.coverImage) {
      setCoverImageError('请上传空间封面')
      return
    }

    setIsSavingProject(true)
    try {
      if (editingProject) {
        const project = await updateProjectMetadata(editingProject.id, input)
        setProjects((current) => current.map((item) => (item.id === project.id ? project : item)))
        setToastMessage('空间已更新')
      } else {
        const project = await createProject(input)
        setProjects((current) => [project, ...current])
        navigate(`/workspace/${project.id}`, {
          state: {
            actionMessage: '空间已创建',
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

  async function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setCoverImageError(null)
    setIsProcessingCover(true)
    try {
      setProjectCoverImage(await createProjectCoverDataUrl(file))
    } catch (error) {
      setCoverImageError(error instanceof Error ? error.message : '封面处理失败，请重试')
    } finally {
      setIsProcessingCover(false)
      input.value = ''
    }
  }

  function removeCoverImage() {
    setProjectCoverImage(null)
    setCoverImageError('请上传空间封面')
    if (coverInputRef.current) coverInputRef.current.value = ''
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
      setToastMessage('空间已删除')
    } finally {
      setIsDeletingProject(false)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopToolbar
          searchPlaceholder="搜索空间..."
          searchValue={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewProject={handleCreateProject}
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6 md:py-7">
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
                coverImage={project.coverImage}
                updatedAt={formatUpdatedAt(project.updatedAt)}
                nodes={project.nodeCount}
                variant={project.thumbnailVariant}
                viewMode={viewMode}
                onEdit={() => openEditDialog(project)}
                onDelete={() => openDeleteDialog(project)}
              />
            ))}
          </div>

          {isEmptyState ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
              <div>
                <div className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                  {hasSearchQuery ? '没有匹配的空间' : '还没有空间'}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {hasSearchQuery ? '换个关键词试试，或新建一个空间。' : '先创建一个空间，开始整理你的灵感和画布。'}
                </p>
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                  >
                    新建空间
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <Dialog.Root open={isProjectDialogOpen} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/28 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  {editingProject ? '修改空间' : '新建空间'}
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
              <div>
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">空间封面</div>
                <div className="relative aspect-video overflow-hidden rounded-[16px] border border-dashed border-[var(--border-strong)] bg-[var(--panel-soft)]">
                  {projectCoverImage ? (
                    <img src={projectCoverImage} alt="空间封面预览" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--text-secondary)]">
                      {isProcessingCover ? (
                        <LoaderCircle className="h-6 w-6 animate-spin" />
                      ) : (
                        <ImagePlus className="h-6 w-6" />
                      )}
                      <div className="text-sm font-medium">
                        {isProcessingCover ? '正在处理封面...' : '点击上传封面图'}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">JPG、PNG 或 WebP，最大 12MB</div>
                    </div>
                  )}
                  <label
                    htmlFor="project-cover-upload"
                    aria-label={projectCoverImage ? '替换空间封面' : '上传空间封面'}
                    className="absolute inset-0 cursor-pointer"
                  />
                  {projectCoverImage ? (
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      aria-label="移除空间封面"
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm hover:bg-black/70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <input
                  ref={coverInputRef}
                  id="project-cover-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverImageChange}
                  disabled={isProcessingCover || isSavingProject}
                  className="sr-only"
                />
                {coverImageError ? (
                  <div className="mt-2 text-xs font-medium text-[var(--accent-strong)]">{coverImageError}</div>
                ) : null}
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">空间名称</div>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="请输入空间名称"
                  required
                  maxLength={160}
                  autoFocus
                  className="h-11 w-full rounded-[16px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">空间说明</div>
                <textarea
                  value={projectSummary}
                  onChange={(event) => setProjectSummary(event.target.value)}
                  placeholder="请输入空间说明"
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
                  disabled={isSavingProject || isProcessingCover}
                  className="h-10 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSavingProject ? '保存中...' : editingProject ? '保存修改' : '新建空间'}
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
                <Dialog.Title className="text-lg font-semibold">删除空间</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  确认删除“{deletingProject?.name ?? '当前空间'}”吗？删除后不可恢复。
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
