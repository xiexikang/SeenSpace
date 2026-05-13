import type { Edge, Node, Viewport } from '@xyflow/react'

export type WorkspaceNodeType = 'note' | 'web' | 'image'

export type WorkspaceNodeData = {
  title: string
  description?: string
  meta?: string
}

export type WorkspaceNode = Node<WorkspaceNodeData, WorkspaceNodeType>
export type WorkspaceEdge = Edge

export type WorkspaceSnapshot = {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  viewport: Viewport
}
