import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { ProjectCard } from '../../features/project/components/project-card'
import {
  createProject,
  ensureProjectSeed,
  listProjects,
} from '../../features/project/services/project-service'
import type { ProjectRecord, ProjectViewMode } from '../../types/project'

function formatUpdatedAt(value: string) {
  const timestamp = new Date(value).getTime()
  const diffMs = Date.now() - timestamp
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString()
}

export function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ProjectViewMode>('grid')

  useEffect(() => {
    async function loadProjects() {
      await ensureProjectSeed()
      const records = await listProjects()
      setProjects(records)
    }

    void loadProjects()
  }, [])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) => {
      const haystack = `${project.name} ${project.summary}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [projects, search])

  async function handleCreateProject() {
    const project = await createProject()
    setProjects((current) => [project, ...current])
    navigate(`/workspace/${project.id}`)
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar
          title="SeenSpace (见间)"
          searchPlaceholder="Search projects..."
          searchValue={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewProject={handleCreateProject}
        />

        <section className="px-6 py-7">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">All Projects</h1>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {filteredProjects.length}
                </span>
              </div>
            </div>
          </div>

          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'
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
              />
            ))}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="mt-10 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
              <div className="mb-2 text-lg font-semibold text-[var(--text-primary)]">No matching projects</div>
              <p className="text-sm text-[var(--text-secondary)]">
                Try a different keyword or create a fresh workspace.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
