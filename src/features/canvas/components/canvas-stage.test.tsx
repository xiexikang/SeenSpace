import { act } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { CanvasStage } from './canvas-stage'
import { createNode, createSnapshot } from '../../workspace/services/workspace-test-utils'

vi.mock('@xyflow/react', async () => {
  const React = await import('react')

  function ReactFlow({
    nodes,
    edges,
    onInit,
    onConnect,
    onSelectionChange,
    onMoveEnd,
    onNodeDragStop,
    children,
  }: {
    nodes: Array<{ id: string }>
    edges: Array<{ id: string }>
    onInit?: (instance: {
      getNodes: () => Array<{ id: string }>
      getEdges: () => Array<{ id: string }>
      getViewport: () => { x: number; y: number; zoom: number }
      setViewport: (viewport: { x: number; y: number; zoom: number }) => void
      getZoom: () => number
      zoomIn: () => void
      zoomOut: () => void
    }) => void
    onConnect?: (connection: {
      source: string
      target: string
      sourceHandle?: string | null
      targetHandle?: string | null
    }) => void
    onSelectionChange?: (selection: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }) => void
    onMoveEnd?: () => void
    onNodeDragStop?: () => void
    children?: ReactNode
  }) {
    const nodesRef = React.useRef(nodes)
    const edgesRef = React.useRef(edges)
    const viewportRef = React.useRef({ x: 0, y: 0, zoom: 1 })

    React.useEffect(() => {
      nodesRef.current = nodes
    }, [nodes])

    React.useEffect(() => {
      edgesRef.current = edges
    }, [edges])

    React.useEffect(() => {
      onInit?.({
        getNodes: () => nodesRef.current,
        getEdges: () => edgesRef.current,
        getViewport: () => viewportRef.current,
        setViewport: (viewport) => {
          viewportRef.current = viewport
        },
        getZoom: () => viewportRef.current.zoom,
        zoomIn: () => {
          viewportRef.current = { ...viewportRef.current, zoom: viewportRef.current.zoom + 0.1 }
        },
        zoomOut: () => {
          viewportRef.current = { ...viewportRef.current, zoom: viewportRef.current.zoom - 0.1 }
        },
      })
    }, [onInit])

    return (
      <div data-testid="react-flow">
        <button type="button" onClick={() => onSelectionChange?.({ nodes: nodesRef.current.slice(1, 2), edges: [] })}>
          Trigger Member Selection
        </button>
        <button
          type="button"
          onClick={() =>
            onConnect?.({
              source: 'source-1',
              target: 'target-1',
              sourceHandle: null,
              targetHandle: null,
            })
          }
        >
          Trigger Connect
        </button>
        <button type="button" onClick={() => onMoveEnd?.()}>
          Trigger Move End
        </button>
        <button type="button" onClick={() => onNodeDragStop?.()}>
          Trigger Node Drag Stop
        </button>
        {children}
      </div>
    )
  }

  function useNodesState<T>(initialNodes: T[]) {
    const [nodes, setNodes] = React.useState(initialNodes)
    return [nodes, setNodes, vi.fn()] as const
  }

  function useEdgesState<T>(initialEdges: T[]) {
    const [edges, setEdges] = React.useState(initialEdges)
    return [edges, setEdges, vi.fn()] as const
  }

  return {
    ReactFlow,
    Background: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    BackgroundVariant: { Dots: 'dots' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    SelectionMode: { Partial: 'partial' },
    addEdge: (edge: unknown, current: unknown[]) => [...current, edge],
    useNodesState,
    useEdgesState,
  }
})

describe('CanvasStage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('adds a note node and emits the updated snapshot', async () => {
    const onSnapshotChange = vi.fn()

    render(<CanvasStage snapshot={createSnapshot([])} onSnapshotChange={onSnapshotChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Note' }))
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(onSnapshotChange).toHaveBeenCalled()

    const lastSnapshot = onSnapshotChange.mock.calls.at(-1)?.[0]
    expect(lastSnapshot.nodes).toHaveLength(1)
    expect(lastSnapshot.nodes[0]).toMatchObject({
      type: 'note',
      data: {
        title: 'Blank Note',
      },
    })
  })

  it('expands grouped selection before notifying the parent', () => {
    const onSelectionChange = vi.fn()
    const snapshot = createSnapshot([
      createNode({
        id: 'lead-1',
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
      createNode({
        id: 'member-1',
        position: { x: 200, y: 0 },
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
    ])

    render(<CanvasStage snapshot={snapshot} onSelectionChange={onSelectionChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Member Selection' }))

    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: ['lead-1', 'member-1'],
      edgeIds: [],
    })
  })

  it('drags a group overlay and emits moved node positions on pointer release', async () => {
    const onSnapshotChange = vi.fn()
    const snapshot = createSnapshot([
      createNode({
        id: 'lead-1',
        position: { x: 0, y: 0 },
        width: 100,
        height: 80,
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
      createNode({
        id: 'member-1',
        position: { x: 140, y: 0 },
        width: 100,
        height: 80,
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
    ])

    render(<CanvasStage snapshot={snapshot} onSnapshotChange={onSnapshotChange} />)

    const groupLabel = screen.getByRole('button', { name: 'Group 1' })
    const dragHandle = groupLabel.parentElement
    expect(dragHandle).not.toBeNull()

    fireEvent.pointerDown(dragHandle!, { pointerId: 1 })
    fireEvent.pointerMove(window, { pointerId: 1, movementX: 36, movementY: 18 })
    fireEvent.pointerUp(window, { pointerId: 1 })
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(onSnapshotChange).toHaveBeenCalled()

    const lastSnapshot = onSnapshotChange.mock.calls.at(-1)?.[0]
    expect(lastSnapshot.nodes.map((node: { id: string; position: { x: number; y: number } }) => ({
      id: node.id,
      position: node.position,
    }))).toEqual([
      { id: 'lead-1', position: { x: 36, y: 18 } },
      { id: 'member-1', position: { x: 176, y: 18 } },
    ])
  })

  it('creates a connection, selects it, and emits the saved snapshot', async () => {
    const onSnapshotChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onEdgeCreate = vi.fn()
    const snapshot = createSnapshot([
      createNode({ id: 'source-1', data: { title: 'Source' } }),
      createNode({ id: 'target-1', position: { x: 220, y: 0 }, data: { title: 'Target' } }),
    ])

    render(
      <CanvasStage
        snapshot={snapshot}
        onSnapshotChange={onSnapshotChange}
        onSelectionChange={onSelectionChange}
        onEdgeCreate={onEdgeCreate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Connect' }))
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(onEdgeCreate).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: [],
      edgeIds: [onEdgeCreate.mock.calls[0][0].id],
    })

    const lastSnapshot = onSnapshotChange.mock.calls.at(-1)?.[0]
    expect(lastSnapshot.edges).toHaveLength(1)
    expect(lastSnapshot.edges[0]).toMatchObject({
      source: 'source-1',
      target: 'target-1',
    })
  })
})
