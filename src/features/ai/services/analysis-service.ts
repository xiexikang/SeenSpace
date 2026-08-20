import type { WorkspaceNode, WorkspaceSnapshot } from '../../../types/workspace'
import { buildAnalysisRequestPayload } from './analysis-payload'
import { apiPost } from '../../../lib/api-client'

export type AnalysisScope = 'canvas' | 'selection'

export type AnalysisResult = {
  title: string
  summary: string
  keywords: string[]
  scope: AnalysisScope
  sourceNodeIds: string[]
  question?: string
}

const nodeTypeLabels: Record<WorkspaceNode['type'], string> = {
  note: '笔记',
  web: '网页',
  image: '图片',
  tag_meta: '标签',
  ai_insight: 'AI 洞察',
}

function getNodeText(node: WorkspaceNode) {
  if (node.type === 'note') return node.data.body ?? node.data.description ?? ''
  if (node.type === 'web') return node.data.domain ?? node.data.url ?? node.data.description ?? ''
  if (node.type === 'image') return node.data.palette ?? node.data.description ?? ''
  if (node.type === 'tag_meta') return [...(node.data.tags ?? []), node.data.category].filter(Boolean).join('、')
  return node.data.summary ?? node.data.description ?? ''
}

function getKeywordCandidates(nodes: WorkspaceNode[]) {
  const words = new Set<string>()

  nodes.forEach((node) => {
    if (node.data.meta) words.add(node.data.meta)
    if ('tags' in node.data) {
      ;(node.data.tags ?? []).forEach((tag) => words.add(tag))
    }
    getNodeText(node)
      .split(/[,\s，、。/]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && word.length <= 12)
      .slice(0, 2)
      .forEach((word) => words.add(word))
  })

  return Array.from(words).slice(0, 6)
}

function buildLocalAnalysisResult({
  snapshot,
  selectedNodeIds,
  scope,
  question,
}: {
  snapshot: WorkspaceSnapshot
  selectedNodeIds: string[]
  scope: AnalysisScope
  question: string
}): AnalysisResult {
  const selectedSet = new Set(selectedNodeIds)
  const sourceNodes =
    scope === 'selection' && selectedNodeIds.length > 0
      ? snapshot.nodes.filter((node) => selectedSet.has(node.id))
      : snapshot.nodes
  const visibleNodes = sourceNodes.filter((node) => !node.hidden)
  const sourceNodeIds = visibleNodes.map((node) => node.id)
  const typeSummary = Array.from(
    visibleNodes.reduce((map, node) => {
      map.set(node.type, (map.get(node.type) ?? 0) + 1)
      return map
    }, new Map<WorkspaceNode['type'], number>()),
  )
    .map(([type, count]) => `${count} 个${nodeTypeLabels[type]}`)
    .join('、')
  const titles = visibleNodes.map((node) => node.data.title).filter(Boolean).slice(0, 4)
  const trimmedQuestion = question.trim()
  const keywords = getKeywordCandidates(visibleNodes)
  const relationshipCount = snapshot.edges.filter(
    (edge) => sourceNodeIds.includes(edge.source) && sourceNodeIds.includes(edge.target),
  ).length

  return {
    title: scope === 'selection' ? '选中内容洞察' : '画布整体洞察',
    summary:
      visibleNodes.length === 0
        ? '当前范围里还没有可分析的素材。先添加一些网页、图片或笔记，再让 AI 帮你提炼方向。'
        : `当前范围包含 ${typeSummary || `${visibleNodes.length} 个节点`}。核心素材包括 ${titles.join('、')}。这些内容已经形成 ${relationshipCount} 条显性关系，适合继续提炼主题、关键词和可复用的方向描述。${
            trimmedQuestion ? ` 你的追问是：“${trimmedQuestion}”。` : ''
          }`,
    keywords: keywords.length > 0 ? keywords : ['灵感整理', '方向提炼', '素材关系'],
    scope,
    sourceNodeIds,
    question: trimmedQuestion || undefined,
  }
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  const result = value as Partial<AnalysisResult>
  return (
    typeof result?.title === 'string' &&
    typeof result.summary === 'string' &&
    Array.isArray(result.keywords) &&
    (result.scope === 'canvas' || result.scope === 'selection') &&
    Array.isArray(result.sourceNodeIds)
  )
}

async function analyzeWorkspaceSnapshotRemotely({
  snapshot,
  selectedNodeIds,
  scope,
  question,
}: {
  snapshot: WorkspaceSnapshot
  selectedNodeIds: string[]
  scope: AnalysisScope
  question: string
}): Promise<AnalysisResult> {
  const result: unknown = await apiPost('/api/ai/analyze', buildAnalysisRequestPayload({
        snapshot,
        selectedNodeIds,
        scope,
        question,
      }))
  if (!isAnalysisResult(result)) {
    throw new Error('AI analysis response was invalid.')
  }

  return result
}

export async function analyzeWorkspaceSnapshot({
  snapshot,
  selectedNodeIds,
  scope,
  question,
}: {
  snapshot: WorkspaceSnapshot
  selectedNodeIds: string[]
  scope: AnalysisScope
  question: string
}): Promise<AnalysisResult> {
  try {
    return await analyzeWorkspaceSnapshotRemotely({
      snapshot,
      selectedNodeIds,
      scope,
      question,
    })
  } catch {
    return buildLocalAnalysisResult({
      snapshot,
      selectedNodeIds,
      scope,
      question,
    })
  }
}
