import { useParams } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { CanvasStage } from '../../features/canvas/components/canvas-stage'

export function WorkspacePage() {
  const { projectId } = useParams()

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar title="SeenSpace (见间)" rightAction="workspace" />

        <section className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex items-center gap-3 px-1">
            <button type="button" className="text-sm text-[var(--text-secondary)]">
              {'<'}
            </button>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {projectId === 'brand-identity' ? 'Brand Identity Exploration' : 'Untitled Project'}
            </h1>
          </div>

          <div className="min-h-0 flex-1">
            <CanvasStage />
          </div>
        </section>
      </main>
    </div>
  )
}
