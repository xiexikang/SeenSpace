import type { EdgeChange, NodeChange } from '@xyflow/react'
import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../../types/workspace'
import { buildRenderableNodes } from '../../workspace/services/group-operations'

export function shouldPersistNodeChanges(changes: NodeChange<WorkspaceNode>[]) {
  return changes.some(
    (change) =>
      change.type === 'remove' ||
      change.type === 'add' ||
      change.type === 'replace' ||
      (change.type === 'dimensions' && change.resizing === false),
  )
}

export function shouldPersistEdgeChanges(changes: EdgeChange<WorkspaceEdge>[]) {
  return changes.some((change) => change.type === 'remove' || change.type === 'add' || change.type === 'replace')
}

export function getEdgeFocusRole(nodeId: string, focusedEdge?: WorkspaceEdge): 'source' | 'target' | undefined {
  if (focusedEdge?.source === nodeId) return 'source'
  if (focusedEdge?.target === nodeId) return 'target'
  return undefined
}

export function buildCanvasStageState(
  snapshot: WorkspaceSnapshot,
  focusedEdge?: WorkspaceEdge,
  selectedNodeIds: string[] = [],
) {
  const selectedNodeIdSet = new Set(selectedNodeIds)
  const renderState = buildRenderableNodes(snapshot.nodes, [])

  return {
    nodes: renderState.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        edgeFocusRole: getEdgeFocusRole(node.id, focusedEdge),
        externallySelected: selectedNodeIdSet.has(node.id),
        externallyResizable: selectedNodeIds.length === 1 && selectedNodeIdSet.has(node.id),
      },
    })),
    edges: snapshot.edges.map((edge) => ({
      ...edge,
      selected: false,
      hidden: renderState.hiddenNodeIds.has(edge.source) || renderState.hiddenNodeIds.has(edge.target),
    })),
  }
}
