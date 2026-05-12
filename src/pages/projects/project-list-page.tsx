import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { ProjectCard } from '../../features/project/components/project-card'

const projects = [
  {
    id: 'brand-identity',
    title: 'Brand Identity Exploration',
    summary: 'Moodboards and typographic references for the desktop application.',
    updatedAt: '2h ago',
    nodes: 24,
    initials: 'UI SM',
  },
  {
    id: 'app-ui-components',
    title: 'App UI Components',
    summary: 'Shared library of components for the workspace experience.',
    updatedAt: 'yesterday',
    nodes: 12,
    initials: 'UI',
  },
  {
    id: 'personal-knowledge',
    title: 'Personal Knowledge Notes',
    summary: 'Articles, references, and random thoughts worth revisiting later.',
    updatedAt: '3 days ago',
    nodes: 3,
    initials: 'ME',
  },
  {
    id: 'product-architecture',
    title: 'Product Architecture',
    summary: 'Mapping systems, module ideas, and interaction behaviors.',
    updatedAt: 'last week',
    nodes: 89,
    initials: 'UX AI',
  },
]

export function ProjectListPage() {
  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar title="SeenSpace (见间)" />

        <section className="px-6 py-7">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">All Projects</h1>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {projects.length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
