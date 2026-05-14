import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../../types/workspace'

type WorkspaceSelectionState = {
  selectedNodes: WorkspaceNode[]
  selectedEdges: WorkspaceEdge[]
  selectedNode?: WorkspaceNode
  selectedEdge?: WorkspaceEdge
  sourceNode?: WorkspaceNode
  targetNode?: WorkspaceNode
  activeGroupId?: string
  activeGroupLabel?: string
  activeGroupCollapsed: boolean
  canUngroupSelection: boolean
  totalSelectionCount: number
  selectionSummary: string
}

export type WorkspaceBatchMetadataState = {
  typeCounts: Array<{ type: WorkspaceNode['type']; count: number }>
  sharedCategory?: string
  hasMixedCategories: boolean
  uniqueTags: string[]
}

export function deriveWorkspaceBatchMetadataState(selectedNodes: WorkspaceNode[]): WorkspaceBatchMetadataState {
  const typeCountMap = new Map<WorkspaceNode['type'], number>()
  const categoryValues = selectedNodes
    .map((node) => {
      if ('category' in node.data && typeof node.data.category === 'string') {
        return node.data.category
      }
      return node.data.meta ?? ''
    })
    .map((value) => value.trim())
  const normalizedCategories = Array.from(new Set(categoryValues.filter(Boolean)))
  const uniqueTagSet = new Set<string>()

  selectedNodes.forEach((node) => {
    typeCountMap.set(node.type, (typeCountMap.get(node.type) ?? 0) + 1)
    if ('tags' in node.data) {
      ;(node.data.tags ?? []).forEach((tag) => {
        const normalizedTag = tag.trim()
        if (normalizedTag) uniqueTagSet.add(normalizedTag)
      })
    }
  })

  return {
    typeCounts: Array.from(typeCountMap.entries()).map(([type, count]) => ({ type, count })),
    sharedCategory: normalizedCategories.length === 1 ? normalizedCategories[0] : undefined,
    hasMixedCategories: normalizedCategories.length > 1,
    uniqueTags: Array.from(uniqueTagSet),
  }
}

export function deriveWorkspaceSelectionState(
  snapshot: WorkspaceSnapshot,
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
): WorkspaceSelectionState {
  const selectedNodes = snapshot.nodes.filter((node) => selectedNodeIds.includes(node.id))
  const selectedEdges = snapshot.edges.filter((edge) => selectedEdgeIds.includes(edge.id))
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined
  const sourceNode = selectedEdge ? snapshot.nodes.find((node) => node.id === selectedEdge.source) : undefined
  const targetNode = selectedEdge ? snapshot.nodes.find((node) => node.id === selectedEdge.target) : undefined
  const activeGroupId =
    selectedNodes.length > 0 &&
    selectedNodes.every((node) => node.data.groupId && node.data.groupId === selectedNodes[0].data.groupId)
      ? selectedNodes[0].data.groupId
      : undefined
  const activeGroupLabel = activeGroupId ? selectedNodes[0]?.data.groupLabel : undefined
  const activeGroupCollapsed = activeGroupId ? Boolean(selectedNodes[0]?.data.groupCollapsed) : false
  const canUngroupSelection = selectedNodes.some((node) => node.data.groupId)
  const totalSelectionCount = selectedNodeIds.length + selectedEdgeIds.length
  const selectionSummary =
    selectedNodeIds.length > 0
      ? activeGroupLabel
        ? `${activeGroupLabel} selected`
        : `${selectedNodeIds.length} node${selectedNodeIds.length > 1 ? 's' : ''} selected`
      : selectedEdgeIds.length > 0
        ? selectedEdges.length === 1
          ? `${selectedEdges[0].label || 'connection'} selected`
          : `${selectedEdgeIds.length} connection${selectedEdgeIds.length > 1 ? 's' : ''} selected`
        : 'Local-first canvas workspace'

  return {
    selectedNodes,
    selectedEdges,
    selectedNode,
    selectedEdge,
    sourceNode,
    targetNode,
    activeGroupId,
    activeGroupLabel,
    activeGroupCollapsed,
    canUngroupSelection,
    totalSelectionCount,
    selectionSummary,
  }
}
