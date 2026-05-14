import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceSnapshot } from '../../types/workspace'
import { createNode, createSnapshot } from '../../features/workspace/services/workspace-test-utils'
import { WorkspacePage } from './workspace-page'

const getProjectByIdMock = vi.fn()
const updateProjectCanvasMock = vi.fn()

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  useParams: () => ({ projectId: 'project-1' }),
}))

vi.mock('../../components/shared/library-sidebar', () => ({
  LibrarySidebar: () => <div data-testid="library-sidebar" />,
}))

vi.mock('../../components/shared/top-toolbar', () => ({
  TopToolbar: ({ title }: { title: string }) => <div data-testid="top-toolbar">{title}</div>,
}))

vi.mock('../../components/workspace/workspace-inspector', () => ({
  WorkspaceInspector: () => <div data-testid="workspace-inspector" />,
}))

vi.mock('../../features/project/services/project-service', () => ({
  getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
  updateProjectCanvas: (...args: unknown[]) => updateProjectCanvasMock(...args),
}))

vi.mock('../../features/canvas/components/canvas-stage', () => ({
  CanvasStage: ({
    snapshot,
    onSnapshotChange,
  }: {
    snapshot: WorkspaceSnapshot
    onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void
  }) => {
    const oneNodeSnapshot = createSnapshot([createNode({ id: 'node-1', data: { title: 'Node 1' } })])
    const twoNodeSnapshot = createSnapshot([
      createNode({ id: 'node-1', data: { title: 'Node 1' } }),
      createNode({ id: 'node-2', position: { x: 240, y: 0 }, data: { title: 'Node 2' } }),
    ])

    return (
      <div data-testid="canvas-stage-mock">
        <div>Canvas Nodes: {snapshot.nodes.length}</div>
        <button type="button" onClick={() => onSnapshotChange?.(oneNodeSnapshot)}>
          Push One Node Snapshot
        </button>
        <button type="button" onClick={() => onSnapshotChange?.(twoNodeSnapshot)}>
          Push Two Node Snapshot
        </button>
      </div>
    )
  },
}))

describe('WorkspacePage', () => {
  beforeEach(() => {
    getProjectByIdMock.mockResolvedValue({
      id: 'project-1',
      name: 'Undo Test Project',
      canvas: createSnapshot([]),
    })
    updateProjectCanvasMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('supports undo and redo across persisted canvas snapshots', async () => {
    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())
    expect(screen.getByText('0 nodes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Push One Node Snapshot' }))
    await waitFor(() => expect(screen.getByText('1 nodes')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push Two Node Snapshot' }))
    await waitFor(() => expect(screen.getByText('2 nodes')).toBeTruthy())

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() => expect(screen.getByText('1 nodes')).toBeTruthy())

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(screen.getByText('2 nodes')).toBeTruthy())

    await waitFor(() => expect(updateProjectCanvasMock).toHaveBeenCalledTimes(4))
    expect(
      updateProjectCanvasMock.mock.calls.map(
        (call) => (call[1] as WorkspaceSnapshot).nodes.length,
      ),
    ).toEqual([1, 2, 1, 2])
  })

  it('supports redo from the toolbar buttons after an undo', async () => {
    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push One Node Snapshot' }))
    await waitFor(() => expect(screen.getByText('1 nodes')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push Two Node Snapshot' }))
    await waitFor(() => expect(screen.getByText('2 nodes')).toBeTruthy())

    const toolbarButtons = screen.getAllByRole('button')
    const undoButton = toolbarButtons[0]
    const redoButton = toolbarButtons[1]

    fireEvent.click(undoButton)
    await waitFor(() => expect(screen.getByText('1 nodes')).toBeTruthy())

    fireEvent.click(redoButton)
    await waitFor(() => expect(screen.getByText('2 nodes')).toBeTruthy())
  })
})
