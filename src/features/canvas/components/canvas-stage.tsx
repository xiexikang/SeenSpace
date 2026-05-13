import '@xyflow/react/dist/style.css'

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type ReactFlowInstance,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkspaceEdge, WorkspaceNode, WorkspaceNodeType, WorkspaceSnapshot } from '../../../types/workspace'
import { createWorkspaceNode } from '../lib/workspace-factories'
import { CanvasEmptyState } from './canvas-empty-state'
import { WorkspaceNodeCard } from './workspace-node-card'
import { ZoomControls } from './zoom-controls'

const nodeTypes: NodeTypes = {
  note: WorkspaceNodeCard,
  web: WorkspaceNodeCard,
  image: WorkspaceNodeCard,
}

type CanvasStageProps = {
  snapshot: WorkspaceSnapshot
  onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void
  onSelectionChange?: (selectedNodeId?: string) => void
}

export function CanvasStage({
  snapshot,
  onSnapshotChange,
  onSelectionChange,
}: CanvasStageProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<WorkspaceNode>(snapshot.nodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<WorkspaceEdge>(snapshot.edges)
  const [zoomLabel, setZoomLabel] = useState(`${Math.round(snapshot.viewport.zoom * 100)}%`)
  const flowRef = useRef<ReactFlowInstance<WorkspaceNode, WorkspaceEdge> | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setNodes(snapshot.nodes)
    setEdges(snapshot.edges)
    setZoomLabel(`${Math.round(snapshot.viewport.zoom * 100)}%`)
  }, [setEdges, setNodes, snapshot])

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

  return (
    <div className="relative h-full min-h-[680px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--canvas)] shadow-[var(--shadow-sm)]">
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        {(['note', 'image', 'web'] as WorkspaceNodeType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addNode(type)}
            className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium capitalize text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
          >
            Add {type}
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
          updateZoomLabel()
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={() => {
          updateZoomLabel()
          scheduleSnapshotSave()
        }}
        onNodeDragStop={() => scheduleSnapshotSave()}
        onSelectionChange={({ nodes: selectedNodes }) => {
          onSelectionChange?.(selectedNodes[0]?.id)
        }}
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

      {nodes.length === 0 ? <CanvasEmptyState onAddNote={() => addNode('note')} /> : null}

      <ZoomControls
        zoomLabel={zoomLabel}
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
      />
    </div>
  )
}
