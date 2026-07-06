import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { WorkspaceSnapshot } from '../../../types/workspace'
import {
  analyzeWorkspaceSnapshot,
  type AnalysisResult,
  type AnalysisScope,
} from '../services/analysis-service'

type AnalysisSidebarProps = {
  snapshot: WorkspaceSnapshot
  selectedNodeIds: string[]
  onInsertInsight: (result: AnalysisResult) => void
}

export function AnalysisSidebar({ snapshot, selectedNodeIds, onInsertInsight }: AnalysisSidebarProps) {
  const [scope, setScope] = useState<AnalysisScope>('canvas')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle')
  const selectedCount = selectedNodeIds.length
  const sourceCount = scope === 'selection' ? selectedCount : snapshot.nodes.length
  const canAnalyze = scope === 'canvas' ? snapshot.nodes.length > 0 : selectedCount > 0
  const scopeLabel = scope === 'selection' ? `选中 ${selectedCount} 个节点` : `${snapshot.nodes.length} 个画布节点`
  const typeSummary = useMemo(() => {
    const sourceSet = new Set(selectedNodeIds)
    const nodes =
      scope === 'selection' && selectedNodeIds.length > 0
        ? snapshot.nodes.filter((node) => sourceSet.has(node.id))
        : snapshot.nodes
    return nodes
      .slice(0, 4)
      .map((node) => node.data.title)
      .join('、')
  }, [scope, selectedNodeIds, snapshot.nodes])

  async function handleAnalyze() {
    if (!canAnalyze) return

    setStatus('analyzing')
    try {
      const nextResult = await analyzeWorkspaceSnapshot({
        snapshot,
        selectedNodeIds,
        scope,
        question,
      })
      setResult(nextResult)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  function handleInsert() {
    if (!result) return
    onInsertInsight(result)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">AI 分析</div>
          <div className="text-xs text-[var(--text-secondary)]">把素材整理成更像编辑摘要的洞察卡片</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] p-1">
        {[
          { id: 'canvas' as const, label: '整张画布' },
          { id: 'selection' as const, label: '选中内容' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScope(item.id)}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
              scope === item.id
                ? 'bg-[var(--panel)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--panel-elevated)] p-4">
        <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">分析范围</div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{scopeLabel}</div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
          {typeSummary || (sourceCount === 0 ? '当前范围暂无素材。' : '准备分析当前范围里的素材。')}
        </p>
      </div>

      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">补充问题</div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="例如：这组素材适合什么视觉方向？"
          className="w-full resize-none rounded-[18px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </label>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze || status === 'analyzing'}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
      >
        {status === 'analyzing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {status === 'analyzing' ? '分析中...' : '开始分析'}
      </button>

      {status === 'error' ? (
        <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5 text-[var(--accent-strong)]">
          分析失败，请检查 AI 服务配置后重试。
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[20px] border border-[var(--border)] bg-[var(--panel-elevated)] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">Insight preview</div>
          <div className="mb-2 text-base font-semibold text-[var(--text-primary)]">{result.title}</div>
          <p className="mb-3 text-sm leading-6 text-[var(--text-secondary)]">{result.summary}</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {result.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
              >
                {keyword}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={handleInsert}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel)]"
          >
            <Plus className="h-4 w-4" />
            添加到画布
          </button>
        </div>
      ) : (
        <div className="mt-4 flex min-h-[160px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--panel-elevated)] p-4 text-center text-sm leading-6 text-[var(--text-secondary)]">
          分析结果会先在这里预览，再插入为画布节点。
        </div>
      )}
    </div>
  )
}
