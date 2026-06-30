import type { Edge, Node, Viewport } from '@xyflow/react'

export type WorkspaceNodeType = 'note' | 'web' | 'image' | 'tag_meta' | 'ai_insight'

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
  body?: string
  url?: string
  domain?: string
  imageUrl?: string
  palette?: string
  tags?: string[]
  category?: string
  summary?: string
  keywords?: string[]
  sourceNodeIds?: string[]
  scope?: 'canvas' | 'selection'
  question?: string
  edgeFocusRole?: 'source' | 'target'
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

export type AiInsightNodeData = WorkspaceNodeDataBase & {
  summary: string
  keywords: string[]
  sourceNodeIds: string[]
  scope: 'canvas' | 'selection'
  question?: string
}

export type WorkspaceNodeDataByType = {
  note: NoteNodeData
  web: WebNodeData
  image: ImageNodeData
  tag_meta: TagMetaNodeData
  ai_insight: AiInsightNodeData
}

export type WorkspaceNodeData =
  | NoteNodeData
  | WebNodeData
  | ImageNodeData
  | TagMetaNodeData
  | AiInsightNodeData

export type NoteNode = Node<NoteNodeData, 'note'>
export type WebNode = Node<WebNodeData, 'web'>
export type ImageNode = Node<ImageNodeData, 'image'>
export type TagMetaNode = Node<TagMetaNodeData, 'tag_meta'>
export type AiInsightNode = Node<AiInsightNodeData, 'ai_insight'>

export type WorkspaceNode = Node<WorkspaceNodeData, WorkspaceNodeType>
export type WorkspaceEdge = Edge

export type WorkspaceSnapshot = {
  nodes: WorkspaceNode[]
  edges: WorkspaceEdge[]
  viewport: Viewport
}
