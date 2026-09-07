import { useState } from 'react'
import { CheckCircle2, LoaderCircle, RefreshCw, Server, ShieldCheck, XCircle } from 'lucide-react'
import { getAgentRuntimeAccess, getAgentSessionStatus, refreshAgentToken } from '../../features/auth/services/auth-service'
import { LibrarySidebar } from '../../components/shared/library-sidebar'

export function AgentConnectionPage() {
  const [status, setStatus] = useState<string>('点击按钮检查当前智能体连接')
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkStatus() {
    setLoading(true); setError(''); setStatus('正在检查连接...')
    try {
      const result = await getAgentSessionStatus()
      setStatus(result.expiresAt ? `已连接 · 令牌有效至 ${new Date(result.expiresAt).toLocaleString()}` : '已连接')
    } catch { setError('当前不是智能体登录，或会话已失效。'); setStatus('未连接') } finally { setLoading(false) }
  }
  async function refresh() {
    setLoading(true); setError('')
    try { const result = await refreshAgentToken(); setStatus(`令牌已刷新 · 有效期 ${result.data.expires_in} 秒`) }
    catch { setError('刷新失败，请重新统一登录。') } finally { setLoading(false) }
  }
  async function loadRuntime() {
    setLoading(true); setError('')
    try { const result = await getAgentRuntimeAccess(); setRuntime(result.data); setStatus('运行时配置获取成功') }
    catch { setError('运行时配置获取失败。') } finally { setLoading(false) }
  }
  const llm = runtime?.llm as Record<string, unknown> | undefined
  const mcp = runtime?.mcp as Record<string, unknown> | undefined
  const servers = Array.isArray(mcp?.serverNames) ? mcp.serverNames as string[] : []
  return <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--text-primary)]"><LibrarySidebar /><main className="min-h-0 min-w-0 flex-1 overflow-auto p-6 lg:p-10">
    <div className="mx-auto max-w-[900px]">
      <div className="flex items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ShieldCheck className="h-4 w-4" />智能体连接</div><h1 className="mt-2 text-3xl font-bold tracking-tight">运行时配置测试</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">验证 OAuth 令牌刷新与网关运行时配置获取。</p></div><button onClick={() => void checkStatus()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--panel)] px-4 text-sm font-semibold shadow-sm disabled:opacity-60"><RefreshCw className="h-4 w-4" />检查连接</button></div>
      <section className="mt-8 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]">{loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : status.includes('未连接') ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span><div><div className="text-sm font-semibold">连接状态</div><div className="mt-1 text-sm text-[var(--text-secondary)]">{status}</div></div></div>{error ? <div className="mt-4 rounded-[12px] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">{error}</div> : null}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void refresh()} disabled={loading} className="rounded-[12px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">刷新访问令牌</button><button onClick={() => void loadRuntime()} disabled={loading} className="rounded-[12px] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold disabled:opacity-60">获取运行时配置</button></div></section>
      {runtime ? <section className="mt-5 grid gap-5 md:grid-cols-2"><div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5"><div className="flex items-center gap-2 font-semibold"><Server className="h-4 w-4 text-[var(--accent)]" />LLM 配置</div><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[var(--text-muted)]">URL</dt><dd className="mt-1 break-all text-[var(--text-secondary)]">{String(llm?.url || '未返回')}</dd></div><div><dt className="text-[var(--text-muted)]">Method</dt><dd className="mt-1 text-[var(--text-secondary)]">{String(llm?.method || '未返回')}</dd></div><div><dt className="text-[var(--text-muted)]">Headers</dt><dd className="mt-1 text-[var(--text-secondary)]">已隐藏，仅展示键名：{Array.isArray(llm?.headerNames) ? (llm.headerNames as string[]).join(', ') || '无' : '无'}</dd></div><div><dt className="text-[var(--text-muted)]">Body 字段</dt><dd className="mt-1 text-[var(--text-secondary)]">{Array.isArray(llm?.bodyFields) ? (llm.bodyFields as string[]).join(', ') || '无' : '无'}</dd></div></dl></div><div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5"><div className="font-semibold">MCP Servers</div>{servers.length ? <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">{servers.map((name) => <li key={name} className="rounded-[10px] bg-[var(--panel-soft)] px-3 py-2">{name}</li>)}</ul> : <p className="mt-4 text-sm text-[var(--text-muted)]">未返回 MCP Server</p>}</div></section> : null}
    </div>
  </main></div>
}
