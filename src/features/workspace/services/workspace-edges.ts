import type { WorkspaceEdge, WorkspaceNode } from '../../../types/workspace'
import { randomId } from '../../../shared/utils/random-id'

export const relationshipPresets = [
  'supports',
  'references',
  'contrasts with',
  'derived from',
  'depends on',
  'clusters with',
] as const

export function suggestEdgeLabel(sourceNode?: WorkspaceNode, targetNode?: WorkspaceNode) {
  if (targetNode?.type === 'tag_meta') {
    return 'references'
  }

  if (sourceNode?.type === 'tag_meta') {
    return 'supports'
  }

  if (sourceNode?.type === 'web' && targetNode?.type === 'note') {
    return 'references'
  }

  if (sourceNode?.type === 'image' && targetNode?.type === 'note') {
    return 'supports'
  }

  if (sourceNode?.type && targetNode?.type && sourceNode.type === targetNode.type) {
    return 'clusters with'
  }

  return 'references'
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
