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
  imageUrl?: string
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

const MAX_ANALYSIS_IMAGES = 4
const MAX_IMAGE_DATA_URL_LENGTH = 6_000_000

function getAnalysisImageUrl(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) return undefined

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.slice(0, 2048)
  }

  if (
    /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(normalized) &&
    normalized.length <= MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return normalized
  }

  return undefined
}

function compactNode(node: WorkspaceNode, includeImage: boolean): AnalysisPayloadNode {
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
    imageUrl: includeImage && node.type === 'image' ? getAnalysisImageUrl(node.data.imageUrl) : undefined,
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
  const imageNodeIds = new Set(
    visibleNodes
      .filter((node) => node.type === 'image' && getAnalysisImageUrl(node.data.imageUrl))
      .slice(0, MAX_ANALYSIS_IMAGES)
      .map((node) => node.id),
  )
  const edges = snapshot.edges.filter((edge) => sourceNodeIdSet.has(edge.source) && sourceNodeIdSet.has(edge.target))

  return {
    scope,
    question: compactText(question, 500),
    sourceNodeIds,
    nodes: visibleNodes.map((node) => compactNode(node, imageNodeIds.has(node.id))),
    edges: edges.map(compactEdge),
  }
}
