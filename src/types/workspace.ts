import type { Edge, Node, Viewport } from '@xyflow/react'

export type WorkspaceNodeType = 'note' | 'web' | 'image' | 'tag_meta'

export type CollapsedGroupSummary = {
  memberCount: number
  typeLabels: string[]
  typeCounts: Array<{ type: WorkspaceNodeType; count: number }>
  previewItems: Array<{
    id: string
    title: string
    typeLabel: string
    subtitle?: string
  }>
}

type WorkspaceNodeDataBase = {
  title: string
  description?: string
  meta?: string
  groupId?: string
  groupLabel?: string
  groupLeadId?: string
  groupCollapsed?: boolean
  collapsedGroupSummary?: CollapsedGroupSummary
}

export type NoteNodeData = WorkspaceNodeDataBase & {
  body?: string
}

export type WebNodeData = WorkspaceNodeDataBase & {
  url?: string
  domain?: string
}

export type ImageNodeData = WorkspaceNodeDataBase & {
  imageUrl?: string
  palette?: string
}

export type TagMetaNodeData = WorkspaceNodeDataBase & {
  tags?: string[]
  category?: string
}

export type WorkspaceNodeDataByType = {
  note: NoteNodeData
  web: WebNodeData
  image: ImageNodeData
  tag_meta: TagMetaNodeData
}

export type WorkspaceNodeData =
  | NoteNodeData
  | WebNodeData
  | ImageNodeData
  | TagMetaNodeData

export type NoteNode = Node<NoteNodeData, 'note'>
export type WebNode = Node<WebNodeData, 'web'>
export type ImageNode = Node<ImageNodeData, 'image'>
export type TagMetaNode = Node<TagMetaNodeData, 'tag_meta'>

export type WorkspaceNode = NoteNode | WebNode | ImageNode | TagMetaNode
export type WorkspaceEdge = Edge

export type WorkspaceSnapshot = {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  viewport: Viewport
}
