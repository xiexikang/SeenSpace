import type { WorkspaceEdge, WorkspaceNode } from '../../../types/workspace'
import { randomId } from '../../../shared/utils/random-id'

export const relationshipPresets = [
  '支持',
  '引用',
  '对比',
  '来源于',
  '依赖',
  '同组',
] as const

export function suggestEdgeLabel(sourceNode?: WorkspaceNode, targetNode?: WorkspaceNode) {
  if (targetNode?.type === 'tag_meta') {
    return '引用'
  }

  if (sourceNode?.type === 'tag_meta') {
    return '支持'
  }

  if (sourceNode?.type === 'web' && targetNode?.type === 'note') {
    return '引用'
  }

  if (sourceNode?.type === 'image' && targetNode?.type === 'note') {
    return '支持'
  }

  if (sourceNode?.type && targetNode?.type && sourceNode.type === targetNode.type) {
    return '同组'
  }

  return '引用'
}

export function createConnectionEdge(
  connection: Pick<WorkspaceEdge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
  nodes: WorkspaceNode[],
): WorkspaceEdge {
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  return {
    id: randomId(),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    label: suggestEdgeLabel(sourceNode, targetNode),
    animated: false,
  }
}
