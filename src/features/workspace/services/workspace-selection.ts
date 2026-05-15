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

export type WorkspaceBatchEdgeState = {
  sharedLabel?: string
  hasMixedLabels: boolean
  labeledCount: number
  labelBreakdown: Array<{ label: string; count: number; isEmpty: boolean }>
}

export type WorkspaceBatchMetadataState = {
  typeCounts: Array<{ type: WorkspaceNode['type']; count: number }>
  sharedCategory?: string
  hasMixedCategories: boolean
  uniqueTags: string[]
}

export function deriveWorkspaceBatchEdgeState(selectedEdges: WorkspaceEdge[]): WorkspaceBatchEdgeState {
  const labelCountMap = new Map<string, number>()
  const normalizedLabels = selectedEdges
    .map((edge) => (typeof edge.label === 'string' ? edge.label.trim() : ''))
    .map((label) => {
      labelCountMap.set(label, (labelCountMap.get(label) ?? 0) + 1)
      return label
    })
    .filter(Boolean)
  const uniqueLabels = Array.from(new Set(normalizedLabels))

  return {
    sharedLabel: uniqueLabels.length === 1 ? uniqueLabels[0] : undefined,
    hasMixedLabels: uniqueLabels.length > 1,
    labeledCount: normalizedLabels.length,
    labelBreakdown: Array.from(labelCountMap.entries())
      .map(([label, count]) => ({
        label,
        count,
        isEmpty: label.length === 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        if (left.isEmpty !== right.isEmpty) return left.isEmpty ? 1 : -1
        return left.label.localeCompare(right.label)
      }),
  }
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
        ? `已选中 ${activeGroupLabel}`
        : `已选中 ${selectedNodeIds.length} 个节点`
      : selectedEdgeIds.length > 0
        ? selectedEdges.length === 1
          ? `已选中 ${selectedEdges[0].label || '连接'}`
          : `已选中 ${selectedEdgeIds.length} 条连接`
        : '本地优先的画布工作区'

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
