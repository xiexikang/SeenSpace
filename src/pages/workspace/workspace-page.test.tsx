import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceSnapshot } from '../../types/workspace'
import { createEdge, createNode, createSnapshot } from '../../features/workspace/services/workspace-test-utils'
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
  WorkspaceInspector: ({
    selectedNodeCount,
    selectedEdgeCount,
    activeGroupLabel,
    batchCategory,
    batchTagsText,
    batchEdgeLabel,
    onBatchCategoryChange,
    onBatchTagsChange,
    onBatchEdgeLabelChange,
    onApplyBatchCategory,
    onApplyBatchTags,
    onApplyBatchEdgeLabel,
    onCreateGroup,
    onUngroup,
  }: {
    selectedNodeCount: number
    selectedEdgeCount: number
    activeGroupLabel?: string
    batchCategory: string
    batchTagsText: string
    batchEdgeLabel: string
    onBatchCategoryChange: (value: string) => void
    onBatchTagsChange: (value: string) => void
    onBatchEdgeLabelChange: (value: string) => void
    onApplyBatchCategory: () => void
    onApplyBatchTags: () => void
    onApplyBatchEdgeLabel: () => void
    onCreateGroup: () => void
    onUngroup: () => void
  }) => (
    <div data-testid="workspace-inspector">
      <div>Inspector Selected Nodes: {selectedNodeCount}</div>
      <div>Inspector Selected Edges: {selectedEdgeCount}</div>
      <div>Inspector Active Group: {activeGroupLabel ?? 'none'}</div>
      <label>
        Batch Category
        <input
          aria-label="Batch Category"
          value={batchCategory}
          onChange={(event) => onBatchCategoryChange(event.target.value)}
        />
      </label>
      <label>
        Batch Tags
        <input
          aria-label="Batch Tags"
          value={batchTagsText}
          onChange={(event) => onBatchTagsChange(event.target.value)}
        />
      </label>
      <label>
        Batch Edge Label
        <input
          aria-label="Batch Edge Label"
          value={batchEdgeLabel}
          onChange={(event) => onBatchEdgeLabelChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={onCreateGroup}>
        Trigger Create Group
      </button>
      <button type="button" onClick={onUngroup}>
        Trigger Ungroup
      </button>
      <button type="button" onClick={onApplyBatchCategory}>
        Trigger Apply Batch Category
      </button>
      <button type="button" onClick={onApplyBatchTags}>
        Trigger Apply Batch Tags
      </button>
      <button type="button" onClick={onApplyBatchEdgeLabel}>
        Trigger Apply Batch Edge Label
      </button>
    </div>
  ),
}))

vi.mock('../../features/ai/components/analysis-sidebar', () => ({
  AnalysisSidebar: ({
    snapshot,
    selectedNodeIds,
    onInsertInsight,
  }: {
    snapshot: WorkspaceSnapshot
    selectedNodeIds: string[]
    onInsertInsight: (result: {
      title: string
      summary: string
      keywords: string[]
      scope: 'canvas' | 'selection'
      sourceNodeIds: string[]
      question?: string
    }) => void
  }) => (
    <div data-testid="analysis-sidebar">
      <button type="button">打开 AI 分析</button>
      <div>AI Selected Nodes: {selectedNodeIds.length}</div>
      <button
        type="button"
        onClick={() =>
          onInsertInsight({
            title: '选中内容洞察',
            summary: '这是一条测试洞察。',
            keywords: ['测试', '洞察'],
            scope: selectedNodeIds.length > 0 ? 'selection' : 'canvas',
            sourceNodeIds:
              selectedNodeIds.length > 0
                ? selectedNodeIds
                : snapshot.nodes.slice(0, 2).map((node) => node.id),
            question: '测试问题',
          })
        }
      >
        Trigger Insert Insight
      </button>
    </div>
  ),
}))

vi.mock('../../features/project/services/project-service', () => ({
  getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
  updateProjectCanvas: (...args: unknown[]) => updateProjectCanvasMock(...args),
}))

vi.mock('../../features/canvas/components/canvas-stage', () => ({
  CanvasStage: ({
    snapshot,
    onSnapshotChange,
    onSelectionChange,
  }: {
    snapshot: WorkspaceSnapshot
    onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void
    onSelectionChange?: (selection: { nodeIds: string[]; edgeIds: string[] }) => void
  }) => {
    const oneNodeSnapshot = createSnapshot([createNode({ id: 'node-1', data: { title: 'Node 1' } })])
    const twoNodeSnapshot = createSnapshot([
      createNode({ id: 'node-1', data: { title: 'Node 1' } }),
      createNode({ id: 'node-2', position: { x: 240, y: 0 }, data: { title: 'Node 2' } }),
    ])

    return (
        <div data-testid="canvas-stage-mock">
        <div>Canvas Nodes: {snapshot.nodes.length}</div>
        <div>Canvas Edges: {snapshot.edges.length}</div>
        <button type="button" onClick={() => onSnapshotChange?.(oneNodeSnapshot)}>
          Push One Node Snapshot
        </button>
        <button type="button" onClick={() => onSnapshotChange?.(twoNodeSnapshot)}>
          Push Two Node Snapshot
        </button>
        <button
          type="button"
          onClick={() =>
            onSelectionChange?.({
              nodeIds: snapshot.nodes.slice(0, 2).map((node) => node.id),
              edgeIds: [],
            })
          }
        >
          Select First Two Nodes
        </button>
        <button
          type="button"
          onClick={() =>
            onSelectionChange?.({
              nodeIds: [],
              edgeIds: snapshot.edges.slice(0, 2).map((edge) => edge.id),
            })
          }
        >
          Select First Two Edges
        </button>
      </div>
    )
  },
}))

describe('WorkspacePage', () => {
  beforeEach(() => {
    updateProjectCanvasMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  function loadProject(canvas: WorkspaceSnapshot) {
    getProjectByIdMock.mockResolvedValue({
      id: 'project-1',
      name: 'Undo Test Project',
      canvas,
    })
  }

  it('supports undo and redo across persisted canvas snapshots', async () => {
    loadProject(createSnapshot([]))
    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())
    expect(screen.getByText(/0\s*个节点/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Push One Node Snapshot' }))
    await waitFor(() => expect(screen.getByText(/1\s*个节点/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push Two Node Snapshot' }))
    await waitFor(() => expect(screen.getByText(/2\s*个节点/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() => expect(screen.getByText(/1\s*个节点/)).toBeTruthy())

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(screen.getByText(/2\s*个节点/)).toBeTruthy())

    await waitFor(() => expect(updateProjectCanvasMock).toHaveBeenCalledTimes(4))
    expect(
      updateProjectCanvasMock.mock.calls.map(
        (call) => (call[1] as WorkspaceSnapshot).nodes.length,
      ),
    ).toEqual([1, 2, 1, 2])
  })

  it('supports redo from the toolbar buttons after an undo', async () => {
    loadProject(createSnapshot([]))
    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push One Node Snapshot' }))
    await waitFor(() => expect(screen.getByText(/1\s*个节点/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Push Two Node Snapshot' }))
    await waitFor(() => expect(screen.getByText(/2\s*个节点/)).toBeTruthy())

    const toolbarButtons = screen.getAllByRole('button')
    const undoButton = toolbarButtons[0]
    const redoButton = toolbarButtons[1]

    fireEvent.click(undoButton)
    await waitFor(() => expect(screen.getByText(/1\s*个节点/)).toBeTruthy())

    fireEvent.click(redoButton)
    await waitFor(() => expect(screen.getByText(/2\s*个节点/)).toBeTruthy())
  })

  it('groups and ungroups a multi-node selection', async () => {
    loadProject(
      createSnapshot([
        createNode({ id: 'node-1', data: { title: 'Node 1' } }),
        createNode({ id: 'node-2', position: { x: 240, y: 0 }, data: { title: 'Node 2' } }),
      ]),
    )

    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Select First Two Nodes' }))
    await waitFor(() => expect(screen.getByText('Inspector Selected Nodes: 2')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Create Group' }))
    await waitFor(() => expect(screen.getByText('Inspector Active Group: 分组 1')).toBeTruthy())

    const groupedSnapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
    const groupedNodes = groupedSnapshot.nodes
    expect(groupedNodes.every((node) => node.data.groupId)).toBe(true)
    expect(new Set(groupedNodes.map((node) => node.data.groupId)).size).toBe(1)
    expect(groupedNodes.map((node) => node.data.groupLabel)).toEqual(['分组 1', '分组 1'])

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Ungroup' }))
    await waitFor(() => expect(screen.getByText('Inspector Active Group: none')).toBeTruthy())

    const ungroupedSnapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
    expect(
      ungroupedSnapshot.nodes.every(
        (node) =>
          !node.data.groupId && !node.data.groupLabel && !node.data.groupLeadId && node.data.groupCollapsed === undefined,
      ),
    ).toBe(true)
  })

  it('applies batch category and merged tags to a multi-node selection', async () => {
    loadProject(
      createSnapshot([
        createNode({
          id: 'tag-1',
          type: 'tag_meta',
          data: { title: 'Tag 1', category: 'Old', tags: ['alpha'] },
        }),
        createNode({
          id: 'tag-2',
          type: 'tag_meta',
          position: { x: 240, y: 0 },
          data: { title: 'Tag 2', category: 'Old', tags: ['beta'] },
        }),
      ]),
    )

    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Select First Two Nodes' }))
    await waitFor(() => expect(screen.getByText('Inspector Selected Nodes: 2')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Batch Category'), { target: { value: 'Research' } })
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Apply Batch Category' }))

    await waitFor(() => {
      const snapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
      expect(
        snapshot.nodes.every(
          (node) => (node.data as { category?: string }).category === 'Research',
        ),
      ).toBe(true)
    })

    fireEvent.change(screen.getByLabelText('Batch Tags'), { target: { value: 'gamma, delta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Apply Batch Tags' }))

    await waitFor(() => {
      const snapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
      expect(
        snapshot.nodes.map((node) => (node.data as { tags?: string[] }).tags),
      ).toEqual([
        ['alpha', 'gamma', 'delta'],
        ['beta', 'gamma', 'delta'],
      ])
    })
  })

  it('applies a shared batch relationship label to multiple selected edges', async () => {
    loadProject(
      createSnapshot(
        [
          createNode({ id: 'source-1', data: { title: 'Source 1' } }),
          createNode({ id: 'target-1', position: { x: 240, y: 0 }, data: { title: 'Target 1' } }),
          createNode({ id: 'target-2', position: { x: 480, y: 0 }, data: { title: 'Target 2' } }),
        ],
        [
          createEdge({ id: 'edge-1', source: 'source-1', target: 'target-1', label: 'references' }),
          createEdge({ id: 'edge-2', source: 'source-1', target: 'target-2', label: 'depends on' }),
        ],
      ),
    )

    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Select First Two Edges' }))
    await waitFor(() => expect(screen.getByText('Inspector Selected Edges: 2')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Batch Edge Label'), { target: { value: 'supports' } })
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Apply Batch Edge Label' }))

    await waitFor(() => {
      const snapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
      expect(snapshot.edges.map((edge) => edge.label)).toEqual(['supports', 'supports'])
    })
  })

  it('inserts an AI insight node and links it to source nodes', async () => {
    loadProject(
      createSnapshot([
        createNode({ id: 'source-1', data: { title: 'Source 1' } }),
        createNode({ id: 'source-2', position: { x: 240, y: 0 }, data: { title: 'Source 2' } }),
      ]),
    )

    render(<WorkspacePage />)

    await waitFor(() => expect(screen.getByText('Undo Test Project')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Select First Two Nodes' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI 分析' }))
    await waitFor(() => expect(screen.getByText('AI Selected Nodes: 2')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Insert Insight' }))

    await waitFor(() => {
      const snapshot = updateProjectCanvasMock.mock.calls.at(-1)?.[1] as WorkspaceSnapshot
      const insightNode = snapshot.nodes.find((node) => node.type === 'ai_insight')

      expect(snapshot.nodes).toHaveLength(3)
      expect(insightNode?.data.title).toBe('选中内容洞察')
      expect(insightNode?.data.summary).toBe('这是一条测试洞察。')
      expect(insightNode?.data.sourceNodeIds).toEqual(['source-1', 'source-2'])
      expect(snapshot.edges).toHaveLength(2)
      expect(snapshot.edges.map((edge) => [edge.source, edge.target, edge.label])).toEqual([
        ['source-1', insightNode?.id, '提炼为'],
        ['source-2', insightNode?.id, '提炼为'],
      ])
    })
  })
})
