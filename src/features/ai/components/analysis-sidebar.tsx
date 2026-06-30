import { Loader2, Plus, Sparkles, X } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [scope, setScope] = useState<AnalysisScope>('canvas')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle')
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
    const nextResult = await analyzeWorkspaceSnapshot({
      snapshot,
      selectedNodeIds,
      scope,
      question,
    })
    setResult(nextResult)
    setStatus('ready')
  }

  function handleInsert() {
    if (!result) return
    onInsertInsight(result)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        aria-label="打开 AI 分析"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] shadow-[var(--shadow-md)] transition-transform hover:scale-105 hover:bg-[var(--panel-elevated)]"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    )
  }

  return (
    <aside className="fixed bottom-5 right-5 z-50 flex max-h-[calc(100vh-40px)] w-[320px] flex-col rounded-[22px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow-md)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--panel-elevated)] text-[var(--text-secondary)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">AI 分析</div>
          <div className="text-xs text-[var(--text-secondary)]">把素材整理成洞察卡片</div>
        </div>
        <button
          type="button"
          aria-label="收起 AI 分析"
          onClick={() => setIsOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
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
                ? 'bg-[var(--panel-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--background)] p-3">
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
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </label>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze || status === 'analyzing'}
        className="mb-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 text-sm font-medium text-[var(--background)] disabled:opacity-40"
      >
        {status === 'analyzing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {status === 'analyzing' ? '分析中...' : '开始分析'}
      </button>

      {result ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[18px] border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{result.title}</div>
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
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Plus className="h-4 w-4" />
            添加到画布
          </button>
        </div>
      ) : (
        <div className="flex min-h-[140px] items-center justify-center rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-center text-sm leading-6 text-[var(--text-secondary)]">
          分析结果会先在这里预览，再插入为画布节点。
        </div>
      )}
    </aside>
  )
}
