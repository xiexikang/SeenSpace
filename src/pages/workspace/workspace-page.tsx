import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { WorkspaceInspector } from '../../components/workspace/workspace-inspector'
import { CanvasStage } from '../../features/canvas/components/canvas-stage'
import { getProjectById, updateProjectCanvas } from '../../features/project/services/project-service'
import type { WorkspaceNode, WorkspaceSnapshot } from '../../types/workspace'

const emptySnapshot: WorkspaceSnapshot = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

export function WorkspacePage() {
  const { projectId } = useParams()
  const [projectName, setProjectName] = useState('Untitled Project')
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [selectedNodeId, setSelectedNodeId] = useState<string>()

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return
      const project = await getProjectById(projectId)
      if (project) {
        setProjectName(project.name)
        setSnapshot(project.canvas)
      }
    }

    void loadProject()
  }, [projectId])

  const selectedNode = useMemo(
    () => snapshot.nodes.find((node) => node.id === selectedNodeId),
    [selectedNodeId, snapshot.nodes],
  )

  async function persistSnapshot(nextSnapshot: WorkspaceSnapshot) {
    setSnapshot(nextSnapshot)
    setSaveState('saving')

    if (projectId) {
      await updateProjectCanvas(projectId, nextSnapshot)
    }

    setSaveState('saved')
  }

  function handleSnapshotChange(nextSnapshot: WorkspaceSnapshot) {
    void persistSnapshot(nextSnapshot)
  }

  function handleNodeChange(updates: {
    title?: string
    description?: string
    meta?: string
  }) {
    if (!selectedNode) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node,
      ),
    }

    void persistSnapshot(nextSnapshot)
  }

  function handleDeleteNode() {
    if (!selectedNode) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.filter((node) => node.id !== selectedNode.id),
      edges: snapshot.edges.filter(
        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id,
      ),
    }

    setSelectedNodeId(undefined)
    void persistSnapshot(nextSnapshot)
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar title="SeenSpace (见间)" rightAction="workspace" />

        <section className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">{projectName}</h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    {saveState === 'saving' ? 'Saving...' : 'Saved locally'}
                  </span>
                  <span>{snapshot.nodes.length} nodes</span>
                </div>
              </div>
            </div>

            <div className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
              {selectedNode ? `${selectedNode.type} selected` : 'Local-first canvas workspace'}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1">
              <CanvasStage
                snapshot={snapshot}
                onSnapshotChange={handleSnapshotChange}
                onSelectionChange={setSelectedNodeId}
              />
            </div>
            <WorkspaceInspector
              node={selectedNode as WorkspaceNode | undefined}
              onChange={handleNodeChange}
              onDelete={handleDeleteNode}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
