import '@xyflow/react/dist/style.css'

import { Maximize2, Minimize2 } from 'lucide-react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
  type Connection,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  WorkspaceEdge,
  WorkspaceNode,
  WorkspaceNodeType,
  WorkspaceSnapshot,
} from '../../../types/workspace'
import { nodeTypes } from '../../nodes/components/node-renderer'
import { createWorkspaceNode } from '../../nodes/services/node-factory'
import { buildRenderableNodes, getVisibleSelectedNodeIds } from '../../workspace/services/group-operations'
import { CanvasEmptyState } from './canvas-empty-state'
import { ZoomControls } from './zoom-controls'

type CanvasStageProps = {
  snapshot: WorkspaceSnapshot
  selectedNodeIds?: string[]
  onSelectGroup?: (groupId: string) => void
  onToggleGroupCollapse?: (groupId: string) => void
  onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void
  onSelectionChange?: (selection: { nodeIds: string[]; edgeIds: string[] }) => void
}

const addableNodeTypes: Array<{ type: WorkspaceNodeType; label: string }> = [
  { type: 'note', label: 'Add Note' },
  { type: 'image', label: 'Add Image' },
  { type: 'web', label: 'Add Web Clip' },
  { type: 'tag_meta', label: 'Add Tag / Meta' },
]

const fallbackNodeSize = { width: 260, height: 180 }
const snapThreshold = 10
const gridSize = 18

type GuideLine =
  | { kind: 'alignment-vertical'; x: number; y: number; length: number }
  | { kind: 'alignment-horizontal'; y: number; x: number; length: number }
  | {
      kind: 'spacing-horizontal'
      y: number
      segments: Array<{ x: number; length: number }>
    }
  | {
      kind: 'spacing-vertical'
      x: number
      segments: Array<{ y: number; length: number }>
    }

function getNodeRect(node: WorkspaceNode | Node) {
  const width = node.measured?.width ?? node.width ?? fallbackNodeSize.width
  const height = node.measured?.height ?? node.height ?? fallbackNodeSize.height

  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
    width,
    height,
  }
}

function getBoundsFromRects(rects: ReturnType<typeof getNodeRect>[]) {
  const left = Math.min(...rects.map((rect) => rect.left))
  const right = Math.max(...rects.map((rect) => rect.right))
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  }
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export function CanvasStage({
  snapshot,
  selectedNodeIds = [],
  onSelectGroup,
  onToggleGroupCollapse,
  onSnapshotChange,
  onSelectionChange,
}: CanvasStageProps) {
  const initialRenderState = buildRenderableNodes(snapshot.nodes, selectedNodeIds)
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<WorkspaceNode>(initialRenderState.nodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<WorkspaceEdge>(snapshot.edges)
  const [zoomLabel, setZoomLabel] = useState(`${Math.round(snapshot.viewport.zoom * 100)}%`)
  const [viewport, setViewport] = useState(snapshot.viewport)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [isGridSnapEnabled, setIsGridSnapEnabled] = useState(true)
  const flowRef = useRef<ReactFlowInstance<WorkspaceNode, WorkspaceEdge> | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const renderState = buildRenderableNodes(snapshot.nodes, selectedNodeIds)
    setNodes(renderState.nodes)
    setEdges(
      snapshot.edges.map((edge) => ({
        ...edge,
        hidden: renderState.hiddenNodeIds.has(edge.source) || renderState.hiddenNodeIds.has(edge.target),
      })),
    )
    setZoomLabel(`${Math.round(snapshot.viewport.zoom * 100)}%`)
    setViewport(snapshot.viewport)
  }, [setEdges, setNodes, snapshot])

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentSelectedNodeIds = currentNodes.filter((node) => node.selected).map((node) => node.id)
      const visibleSelectedNodeIds = getVisibleSelectedNodeIds(currentNodes, selectedNodeIds)

      if (arraysEqual(currentSelectedNodeIds, visibleSelectedNodeIds)) {
        return currentNodes
      }

      return currentNodes.map((node) => ({
        ...node,
        selected: visibleSelectedNodeIds.includes(node.id),
      }))
    })
  }, [selectedNodeIds, setNodes])

  const groupOverlays = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string
        collapsed: boolean
        leadId: string
        nodes: WorkspaceNode[]
      }
    >()

    nodes.forEach((node) => {
      if (!node.data.groupId || !node.data.groupLabel) return
      const existing = groups.get(node.data.groupId)
      if (existing) {
        existing.nodes.push(node)
        return
      }
      groups.set(node.data.groupId, {
        label: node.data.groupLabel,
        collapsed: Boolean(node.data.groupCollapsed),
        leadId: node.data.groupLeadId ?? node.id,
        nodes: [node],
      })
    })

    return Array.from(groups.entries()).map(([groupId, group]) => {
      const leadNode = group.nodes.find((node) => node.id === group.leadId) ?? group.nodes[0]
      const rects = (group.collapsed ? [leadNode] : group.nodes).map((node) => getNodeRect(node))
      const bounds = getBoundsFromRects(rects)
      const selected = group.nodes.some((node) => selectedNodeIds.includes(node.id))
      return {
        groupId,
        label: group.label,
        collapsed: group.collapsed,
        selected,
        memberCount: group.nodes.length,
        bounds,
      }
    })
  }, [nodes, selectedNodeIds])

  const emitSnapshot = useMemo(
    () => () => {
      if (!flowRef.current) return
      onSnapshotChange?.({
        nodes: flowRef.current.getNodes() as WorkspaceNode[],
        edges: flowRef.current.getEdges() as WorkspaceEdge[],
        viewport: flowRef.current.getViewport(),
      })
    },
    [onSnapshotChange],
  )

  function scheduleSnapshotSave() {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      emitSnapshot()
    }, 180)
  }

  function onNodesChange(changes: NodeChange<WorkspaceNode>[]) {
    onNodesChangeBase(changes)
    scheduleSnapshotSave()
  }

  function onEdgesChange(changes: EdgeChange<WorkspaceEdge>[]) {
    onEdgesChangeBase(changes)
    scheduleSnapshotSave()
  }

  function onConnect(connection: Connection) {
    setEdges((current) => addEdge({ ...connection, animated: false }, current))
    scheduleSnapshotSave()
  }

  function addNode(type: WorkspaceNodeType) {
    setNodes((current) => [...current, createWorkspaceNode(type, current.length)])
    window.setTimeout(() => {
      emitSnapshot()
    }, 0)
  }

  function updateZoomLabel() {
    if (!flowRef.current) return
    setZoomLabel(`${Math.round(flowRef.current.getZoom() * 100)}%`)
  }

  const onNodeDrag = (_event: React.MouseEvent, draggedNode: WorkspaceNode) => {
    const currentNodes = flowRef.current?.getNodes() as WorkspaceNode[] | undefined
    if (!currentNodes) return

    const draggedGroupNodes =
      draggedNode.selected
        ? currentNodes.filter((node) => node.selected)
        : currentNodes.filter((node) => node.id === draggedNode.id)
    const draggedGroupIds = new Set(draggedGroupNodes.map((node) => node.id))
    const draggedGroupRects = draggedGroupNodes.map((node) => getNodeRect(node))
    const draggedRect = getBoundsFromRects(draggedGroupRects)
    const otherNodes = currentNodes.filter((node) => !draggedGroupIds.has(node.id) && !node.hidden)
    let bestX:
      | {
          delta: number
          guide: GuideLine
        }
      | undefined
    let bestY:
      | {
          delta: number
          guide: GuideLine
        }
      | undefined
    let spacingX:
      | {
          delta: number
          guide: GuideLine
        }
      | undefined
    let spacingY:
      | {
          delta: number
          guide: GuideLine
        }
      | undefined

    otherNodes.forEach((node) => {
      const otherRect = getNodeRect(node)
      const xPairs = [
        { source: draggedRect.left, target: otherRect.left },
        { source: draggedRect.centerX, target: otherRect.centerX },
        { source: draggedRect.right, target: otherRect.right },
      ]
      const yPairs = [
        { source: draggedRect.top, target: otherRect.top },
        { source: draggedRect.centerY, target: otherRect.centerY },
        { source: draggedRect.bottom, target: otherRect.bottom },
      ]

      xPairs.forEach(({ source, target }) => {
        const delta = target - source
        if (Math.abs(delta) > snapThreshold) return
        if (!bestX || Math.abs(delta) < Math.abs(bestX.delta)) {
          bestX = {
            delta,
            guide: {
              kind: 'alignment-vertical',
              x: target,
              y: Math.min(draggedRect.top, otherRect.top),
              length: Math.max(draggedRect.bottom, otherRect.bottom) - Math.min(draggedRect.top, otherRect.top),
            },
          }
        }
      })

      yPairs.forEach(({ source, target }) => {
        const delta = target - source
        if (Math.abs(delta) > snapThreshold) return
        if (!bestY || Math.abs(delta) < Math.abs(bestY.delta)) {
          bestY = {
            delta,
            guide: {
              kind: 'alignment-horizontal',
              y: target,
              x: Math.min(draggedRect.left, otherRect.left),
              length: Math.max(draggedRect.right, otherRect.right) - Math.min(draggedRect.left, otherRect.left),
            },
          }
        }
      })
    })

    otherNodes.forEach((leftNode) => {
      const leftRect = getNodeRect(leftNode)
      if (leftRect.right > draggedRect.left) return
      const sharedY =
        Math.max(leftRect.top, draggedRect.top) <= Math.min(leftRect.bottom, draggedRect.bottom)

      otherNodes.forEach((rightNode) => {
        if (rightNode.id === leftNode.id) return
        const rightRect = getNodeRect(rightNode)
        if (rightRect.left < draggedRect.right) return
        const overlapsDragged =
          Math.max(rightRect.top, draggedRect.top) <= Math.min(rightRect.bottom, draggedRect.bottom)
        const overlapsPair =
          Math.max(leftRect.top, rightRect.top) <= Math.min(leftRect.bottom, rightRect.bottom)
        if (!sharedY || !overlapsDragged || !overlapsPair) return

        const targetLeft = (leftRect.right + rightRect.left - draggedRect.width) / 2
        const delta = targetLeft - draggedRect.left
        if (Math.abs(delta) > snapThreshold) return

        if (!spacingX || Math.abs(delta) < Math.abs(spacingX.delta)) {
          const guideY =
            (Math.max(leftRect.top, draggedRect.top, rightRect.top) +
              Math.min(leftRect.bottom, draggedRect.bottom, rightRect.bottom)) /
            2
          spacingX = {
            delta,
            guide: {
              kind: 'spacing-horizontal',
              y: guideY,
              segments: [
                { x: leftRect.right, length: Math.max(targetLeft - leftRect.right, 0) },
                {
                  x: targetLeft + draggedRect.width,
                  length: Math.max(rightRect.left - (targetLeft + draggedRect.width), 0),
                },
              ],
            },
          }
        }
      })
    })

    otherNodes.forEach((topNode) => {
      const topRect = getNodeRect(topNode)
      if (topRect.bottom > draggedRect.top) return
      const sharedX =
        Math.max(topRect.left, draggedRect.left) <= Math.min(topRect.right, draggedRect.right)

      otherNodes.forEach((bottomNode) => {
        if (bottomNode.id === topNode.id) return
        const bottomRect = getNodeRect(bottomNode)
        if (bottomRect.top < draggedRect.bottom) return
        const overlapsDragged =
          Math.max(bottomRect.left, draggedRect.left) <= Math.min(bottomRect.right, draggedRect.right)
        const overlapsPair =
          Math.max(topRect.left, bottomRect.left) <= Math.min(topRect.right, bottomRect.right)
        if (!sharedX || !overlapsDragged || !overlapsPair) return

        const targetTop = (topRect.bottom + bottomRect.top - draggedRect.height) / 2
        const delta = targetTop - draggedRect.top
        if (Math.abs(delta) > snapThreshold) return

        if (!spacingY || Math.abs(delta) < Math.abs(spacingY.delta)) {
          const guideX =
            (Math.max(topRect.left, draggedRect.left, bottomRect.left) +
              Math.min(topRect.right, draggedRect.right, bottomRect.right)) /
            2
          spacingY = {
            delta,
            guide: {
              kind: 'spacing-vertical',
              x: guideX,
              segments: [
                { y: topRect.bottom, length: Math.max(targetTop - topRect.bottom, 0) },
                {
                  y: targetTop + draggedRect.height,
                  length: Math.max(bottomRect.top - (targetTop + draggedRect.height), 0),
                },
              ],
            },
          }
        }
      })
    })

    if (!bestX && !bestY && !isGridSnapEnabled) {
      if (!spacingX && !spacingY) {
        setGuideLines([])
        return
      }
    }

    const xDelta = bestX?.delta ?? spacingX?.delta ?? 0
    const yDelta = bestY?.delta ?? spacingY?.delta ?? 0
    const snappedXBase = draggedNode.position.x + xDelta
    const snappedYBase = draggedNode.position.y + yDelta
    const nextPosition = {
      x:
        bestX || spacingX || !isGridSnapEnabled
          ? snappedXBase
          : Math.round(snappedXBase / gridSize) * gridSize,
      y:
        bestY || spacingY || !isGridSnapEnabled
          ? snappedYBase
          : Math.round(snappedYBase / gridSize) * gridSize,
    }
    const appliedDelta = {
      x: nextPosition.x - draggedRect.left,
      y: nextPosition.y - draggedRect.top,
    }

    setNodes((current) =>
      current.map((node) =>
        draggedGroupIds.has(node.id)
          ? {
              ...node,
              position: {
                x: node.position.x + appliedDelta.x,
                y: node.position.y + appliedDelta.y,
              },
            }
          : node,
      ),
    )
    setGuideLines(
      [bestX?.guide, bestY?.guide, spacingX?.guide, spacingY?.guide].filter(Boolean) as GuideLine[],
    )
  }

  return (
    <div className="relative h-full min-h-[680px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--canvas)] shadow-[var(--shadow-sm)] [&_.react-flow__edge-path]:transition-all [&_.react-flow__edge-textbg]:fill-[var(--panel)] [&_.react-flow__edge-text]:fill-[var(--text-secondary)] [&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[var(--text-primary)] [&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[2.25] [&_.react-flow__edge.selected_.react-flow__arrowhead]:fill-[var(--text-primary)]">
      <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2">
        {addableNodeTypes.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addNode(type)}
            className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
          >
            {label}
          </button>
        ))}
      </div>

      <ReactFlow
        fitView
        defaultViewport={snapshot.viewport}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowRef.current = instance
          instance.setViewport(snapshot.viewport, { duration: 0 })
          setViewport(instance.getViewport())
          updateZoomLabel()
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onMoveEnd={() => {
          updateZoomLabel()
          if (flowRef.current) {
            setViewport(flowRef.current.getViewport())
          }
          scheduleSnapshotSave()
        }}
        onNodeDragStop={() => {
          setGuideLines([])
          if (flowRef.current) {
            setViewport(flowRef.current.getViewport())
          }
          scheduleSnapshotSave()
        }}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          const selectedGroupIds = Array.from(
            new Set(selectedNodes.map((node) => node.data.groupId).filter((groupId): groupId is string => Boolean(groupId))),
          )
          const expandedNodeIds =
            selectedGroupIds.length > 0
              ? ((flowRef.current?.getNodes() as WorkspaceNode[] | undefined) ?? [])
                  .filter(
                    (node) =>
                      selectedNodes.some((selected) => selected.id === node.id) ||
                      selectedGroupIds.includes(node.data.groupId ?? ''),
                  )
                  .map((node) => node.id)
              : selectedNodes.map((node) => node.id)

          onSelectionChange?.({
            nodeIds: expandedNodeIds,
            edgeIds: selectedEdges.map((edge) => edge.id),
          })
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: 'var(--text-muted)',
          },
        }}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        deleteKeyCode={null}
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.8}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.25}
          color="var(--canvas-dot)"
        />
      </ReactFlow>

      {groupOverlays.map((group) => (
        <div
          key={group.groupId}
          className="pointer-events-none absolute z-[15]"
          style={{
            left: group.bounds.left * viewport.zoom + viewport.x - 12,
            top: group.bounds.top * viewport.zoom + viewport.y - 32,
            width: group.bounds.width * viewport.zoom + 24,
            height: group.bounds.height * viewport.zoom + 44,
          }}
        >
          <div
            className={`absolute inset-x-0 bottom-0 rounded-[24px] border border-dashed ${
              group.selected
                ? 'border-[var(--text-primary)] bg-[rgba(24,24,27,0.03)]'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.45)]'
            }`}
            style={{ top: 24 }}
          />
          <div className="pointer-events-auto absolute left-3 top-0 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 shadow-[var(--shadow-sm)]">
            <button
              type="button"
              onClick={() => onSelectGroup?.(group.groupId)}
              className="text-xs font-medium text-[var(--text-primary)]"
            >
              {group.label}
            </button>
            <span className="text-[11px] text-[var(--text-muted)]">{group.memberCount}</span>
            <button
              type="button"
              onClick={() => onToggleGroupCollapse?.(group.groupId)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
            >
              {group.collapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ))}

      {guideLines.map((guide, index) =>
        guide.kind === 'alignment-vertical' ? (
          <div
            key={`guide-${index}`}
            className="pointer-events-none absolute z-20 w-px bg-[var(--text-primary)] opacity-60"
            style={{
              left: guide.x * viewport.zoom + viewport.x,
              top: guide.y * viewport.zoom + viewport.y,
              height: guide.length * viewport.zoom,
            }}
          />
        ) : guide.kind === 'alignment-horizontal' ? (
          <div
            key={`guide-${index}`}
            className="pointer-events-none absolute z-20 h-px bg-[var(--text-primary)] opacity-60"
            style={{
              left: guide.x * viewport.zoom + viewport.x,
              top: guide.y * viewport.zoom + viewport.y,
              width: guide.length * viewport.zoom,
            }}
          />
        ) : guide.kind === 'spacing-horizontal' ? (
          <div key={`guide-${index}`} className="pointer-events-none absolute inset-0 z-20">
            {guide.segments.map((segment, segmentIndex) => (
              <div
                key={`guide-${index}-segment-${segmentIndex}`}
                className="absolute h-px border-t border-dashed border-[var(--text-primary)] opacity-60"
                style={{
                  left: segment.x * viewport.zoom + viewport.x,
                  top: guide.y * viewport.zoom + viewport.y,
                  width: segment.length * viewport.zoom,
                }}
              />
            ))}
          </div>
        ) : (
          <div key={`guide-${index}`} className="pointer-events-none absolute inset-0 z-20">
            {guide.segments.map((segment, segmentIndex) => (
              <div
                key={`guide-${index}-segment-${segmentIndex}`}
                className="absolute w-px border-l border-dashed border-[var(--text-primary)] opacity-60"
                style={{
                  left: guide.x * viewport.zoom + viewport.x,
                  top: segment.y * viewport.zoom + viewport.y,
                  height: segment.length * viewport.zoom,
                }}
              />
            ))}
          </div>
        ),
      )}

      {nodes.length === 0 ? <CanvasEmptyState onAddNote={() => addNode('note')} /> : null}

      <ZoomControls
        zoomLabel={zoomLabel}
        snapEnabled={isGridSnapEnabled}
        onZoomIn={() => {
          flowRef.current?.zoomIn({ duration: 180 })
          window.setTimeout(updateZoomLabel, 190)
        }}
        onZoomOut={() => {
          flowRef.current?.zoomOut({ duration: 180 })
          window.setTimeout(updateZoomLabel, 190)
        }}
        onReset={() => {
          flowRef.current?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })
          window.setTimeout(() => {
            updateZoomLabel()
            emitSnapshot()
          }, 230)
        }}
        onToggleSnap={() => setIsGridSnapEnabled((current) => !current)}
      />
    </div>
  )
}
