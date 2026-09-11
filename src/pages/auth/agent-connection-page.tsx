import { useState } from 'react'
import { CheckCircle2, LoaderCircle, MessageSquare, RefreshCw, Send, Server, ShieldCheck, XCircle } from 'lucide-react'
import { getAgentRuntimeAccess, getAgentSessionStatus, refreshAgentToken, sendAgentRuntimeChat } from '../../features/auth/services/auth-service'
import { LibrarySidebar } from '../../components/shared/library-sidebar'

export function AgentConnectionPage() {
  const [status, setStatus] = useState<string>('点击按钮检查当前智能体连接')
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugError, setDebugError] = useState('')
  const [message, setMessage] = useState('你好，请简单介绍一下你能做什么。')
  const [model, setModel] = useState('')
  const [chatContextId, setChatContextId] = useState('')
  const [debugResponse, setDebugResponse] = useState<unknown>(null)

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
    try { const result = await getAgentRuntimeAccess(); setRuntime(result); setStatus('运行时配置获取成功') }
    catch { setError('运行时配置获取失败。') } finally { setLoading(false) }
  }
  async function sendDebugMessage() {
    if (!message.trim()) { setDebugError('请输入测试消息。'); return }
    setDebugLoading(true); setDebugError(''); setDebugResponse(null)
    try {
      const result = await sendAgentRuntimeChat({ message: message.trim(), model: model.trim() || undefined, chatContextId: chatContextId.trim() || undefined })
      setDebugResponse(result.data); setStatus(`LLM 调试调用成功 · HTTP ${result.status_code}`)
    } catch (cause) { setDebugError(cause instanceof Error ? cause.message : 'LLM 调试调用失败。') }
    finally { setDebugLoading(false) }
  }
  const llm = runtime?.llm as Record<string, unknown> | undefined
  const mcp = runtime?.mcp as Record<string, unknown> | undefined
  const api = runtime?.api as Record<string, unknown> | undefined
  const llmServers = llm?.llmServers && typeof llm.llmServers === 'object' ? Object.keys(llm.llmServers as object) : []
  const headers = llm?.headers && typeof llm.headers === 'object' ? Object.keys(llm.headers as object) : []
  const bodyFields = llm?.body && typeof llm.body === 'object' ? Object.keys(llm.body as object) : []
  const servers = mcp?.mcpServers && typeof mcp.mcpServers === 'object' ? Object.keys(mcp.mcpServers as object) : []
  const apiServers = api?.apiServers && typeof api.apiServers === 'object' ? Object.keys(api.apiServers as object) : []
  return <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--text-primary)]"><LibrarySidebar /><main className="min-h-0 min-w-0 flex-1 overflow-auto p-6 lg:p-10">
    <div className="mx-auto max-w-[900px]">
      <div className="flex items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"><ShieldCheck className="h-4 w-4" />智能体连接</div><h1 className="mt-2 text-3xl font-bold tracking-tight">运行时配置测试</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">验证 OAuth 令牌刷新与网关运行时配置获取。</p></div><button onClick={() => void checkStatus()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--panel)] px-4 text-sm font-semibold shadow-sm disabled:opacity-60"><RefreshCw className="h-4 w-4" />检查连接</button></div>
      <section className="mt-8 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]">{loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : status.includes('未连接') ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span><div><div className="text-sm font-semibold">连接状态</div><div className="mt-1 text-sm text-[var(--text-secondary)]">{status}</div></div></div>{error ? <div className="mt-4 rounded-[12px] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">{error}</div> : null}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void refresh()} disabled={loading} className="rounded-[12px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">刷新访问令牌</button><button onClick={() => void loadRuntime()} disabled={loading} className="rounded-[12px] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold disabled:opacity-60">获取运行时配置</button></div></section>
      {runtime ? <section className="mt-5 grid gap-5 md:grid-cols-2"><div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5"><div className="flex items-center gap-2 font-semibold"><Server className="h-4 w-4 text-[var(--accent)]" />LLM 配置</div>{llmServers.length ? <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">{llmServers.map((name) => <li key={name} className="rounded-[10px] bg-[var(--panel-soft)] px-3 py-2">{name}</li>)}</ul> : <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[var(--text-muted)]">URL</dt><dd className="mt-1 break-all text-[var(--text-secondary)]">{String(llm?.url || '未返回')}</dd></div><div><dt className="text-[var(--text-muted)]">Method</dt><dd className="mt-1 text-[var(--text-secondary)]">{String(llm?.method || '未返回')}</dd></div><div><dt className="text-[var(--text-muted)]">Headers</dt><dd className="mt-1 text-[var(--text-secondary)]">仅展示键名：{headers.join(', ') || '无'}</dd></div><div><dt className="text-[var(--text-muted)]">Body 字段</dt><dd className="mt-1 text-[var(--text-secondary)]">{bodyFields.join(', ') || '无'}</dd></div></dl>}</div><div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5"><div className="font-semibold">MCP Servers</div>{servers.length ? <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">{servers.map((name) => <li key={name} className="rounded-[10px] bg-[var(--panel-soft)] px-3 py-2">{name}</li>)}</ul> : <p className="mt-4 text-sm text-[var(--text-muted)]">未返回 MCP Server</p>}{apiServers.length ? <><div className="mt-6 font-semibold">API Servers</div><ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">{apiServers.map((name) => <li key={name} className="rounded-[10px] bg-[var(--panel-soft)] px-3 py-2">{name}</li>)}</ul></> : null}</div></section> : null}
      <section className="mt-5 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-[var(--accent)]" />LLM 调试</div><p className="mt-1 text-sm text-[var(--text-secondary)]">通过后端读取当前智能体配置发送 Chat Completions 请求。</p><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm"><span className="mb-1 block text-[var(--text-muted)]">模型（可选）</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="留空使用上游配置" className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 outline-none focus:border-[var(--accent)]" /></label><label className="text-sm"><span className="mb-1 block text-[var(--text-muted)]">对话上下文 ID（可选）</span><input value={chatContextId} onChange={(event) => setChatContextId(event.target.value)} placeholder="留空自动生成" className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 outline-none focus:border-[var(--accent)]" /></label></div><label className="mt-3 block text-sm"><span className="mb-1 block text-[var(--text-muted)]">测试消息</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-3 outline-none focus:border-[var(--accent)]" /></label><button onClick={() => void sendDebugMessage()} disabled={debugLoading} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60">{debugLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}发送测试</button>{debugError ? <div className="mt-3 rounded-[10px] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]">{debugError}</div> : null}{debugResponse !== null ? <pre className="mt-4 max-h-[360px] overflow-auto rounded-[10px] bg-[var(--panel-soft)] p-3 text-xs leading-5 text-[var(--text-secondary)]">{JSON.stringify(debugResponse, null, 2)}</pre> : null}</section>
    </div>
  </main></div>
}
