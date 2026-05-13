import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../../types/workspace'

export function createNode(overrides: Partial<WorkspaceNode>): WorkspaceNode {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: overrides.type ?? 'note',
    position: overrides.position ?? { x: 0, y: 0 },
    data: {
      title: 'Untitled',
      ...(overrides.data ?? {}),
    },
    ...overrides,
  } as WorkspaceNode
}

export function createEdge(overrides: Partial<WorkspaceEdge>): WorkspaceEdge {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    source: overrides.source ?? 'source',
    target: overrides.target ?? 'target',
    ...overrides,
  }
}

export function createSnapshot(nodes: WorkspaceNode[], edges: WorkspaceEdge[] = []): WorkspaceSnapshot {
  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}
