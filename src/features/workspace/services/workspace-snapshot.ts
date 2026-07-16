import type { WorkspaceSnapshot } from '../../../types/workspace'

export const emptySnapshot: WorkspaceSnapshot = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

export function sanitizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      selected: false,
      hidden: false,
      data: {
        ...node.data,
        edgeFocusRole: undefined,
        externallySelected: undefined,
        collapsedGroupSummary: undefined,
      },
    })),
    edges: snapshot.edges.map((edge) => ({ ...edge, selected: false })),
  }
}
