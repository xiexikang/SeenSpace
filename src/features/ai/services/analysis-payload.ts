import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../../types/workspace'
import type { AnalysisScope } from './analysis-service'

export type AnalysisPayloadNode = {
  id: string
  type: WorkspaceNode['type']
  title: string
  description?: string
  body?: string
  url?: string
  domain?: string
  palette?: string
  tags?: string[]
  category?: string
  summary?: string
}

export type AnalysisPayloadEdge = {
  source: string
  target: string
  label?: string
}

export type AnalysisRequestPayload = {
  scope: AnalysisScope
  question?: string
  sourceNodeIds: string[]
  nodes: AnalysisPayloadNode[]
  edges: AnalysisPayloadEdge[]
}

function compactText(value: string | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function compactNode(node: WorkspaceNode): AnalysisPayloadNode {
  return {
    id: node.id,
    type: node.type,
    title: compactText(node.data.title, 80) ?? '未命名节点',
    description: compactText(node.data.description, 300),
    body: compactText(node.data.body, 1200),
    url: compactText(node.data.url, 300),
    domain: compactText(node.data.domain, 120),
    palette: compactText(node.data.palette, 160),
    tags: node.data.tags?.slice(0, 12),
    category: compactText(node.data.category, 80),
    summary: compactText(node.data.summary, 600),
  }
}

function compactEdge(edge: WorkspaceEdge): AnalysisPayloadEdge {
  return {
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === 'string' ? compactText(edge.label, 80) : undefined,
  }
}

export function buildAnalysisRequestPayload({
  snapshot,
  selectedNodeIds,
  scope,
  question,
}: {
  snapshot: WorkspaceSnapshot
  selectedNodeIds: string[]
  scope: AnalysisScope
  question: string
}): AnalysisRequestPayload {
  const selectedSet = new Set(selectedNodeIds)
  const sourceNodes =
    scope === 'selection' && selectedNodeIds.length > 0
      ? snapshot.nodes.filter((node) => selectedSet.has(node.id))
      : snapshot.nodes
  const visibleNodes = sourceNodes.filter((node) => !node.hidden)
  const sourceNodeIds = visibleNodes.map((node) => node.id)
  const sourceNodeIdSet = new Set(sourceNodeIds)
  const edges = snapshot.edges.filter((edge) => sourceNodeIdSet.has(edge.source) && sourceNodeIdSet.has(edge.target))

  return {
    scope,
    question: compactText(question, 500),
    sourceNodeIds,
    nodes: visibleNodes.map(compactNode),
    edges: edges.map(compactEdge),
  }
}
