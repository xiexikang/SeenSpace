import { useState, type ReactNode } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Terminal,
  XCircle,
} from 'lucide-react'
import {
  getAgentRuntimeAccess,
  getAgentSessionStatus,
  refreshAgentToken,
  sendAgentRuntimeApi,
  sendAgentRuntimeChat,
  sendAgentRuntimeMcp,
} from '../../features/auth/services/auth-service'
import { LibrarySidebar } from '../../components/shared/library-sidebar'

type DebugTab = 'llm' | 'knowledge' | 'api' | 'database' | 'mcp'

const fieldControlClass =
  'mt-2 h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]'
const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel-elevated)] disabled:cursor-not-allowed disabled:opacity-55'
const primaryButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[#b80022] disabled:cursor-not-allowed disabled:opacity-55'

export function AgentConnectionPage() {
  const [status, setStatus] = useState('等待检查连接')
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugError, setDebugError] = useState('')
  const [message, setMessage] = useState('你好，请简单介绍一下你能做什么。')
  const [model, setModel] = useState('')
  const [llmServer, setLlmServer] = useState('')
  const [chatContextId, setChatContextId] = useState('')
  const [debugResponse, setDebugResponse] = useState<unknown>(null)
  const [apiServer, setApiServer] = useState('')
  const [apiPath, setApiPath] = useState('')
  const [apiMethod, setApiMethod] = useState('')
  const [apiBody, setApiBody] = useState('{}')
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [apiResponse, setApiResponse] = useState<unknown>(null)
  const [mcpServer, setMcpServer] = useState('')
  const [mcpBody, setMcpBody] = useState(
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"seenspace-debug","version":"1.0.0"}}}',
  )
  const [mcpSessionId, setMcpSessionId] = useState('')
  const [mcpLoading, setMcpLoading] = useState(false)
  const [mcpError, setMcpError] = useState('')
  const [mcpResponse, setMcpResponse] = useState<unknown>(null)
  const [activeTab, setActiveTab] = useState<DebugTab>('llm')

  async function checkStatus() {
    setLoading(true)
    setError('')
    setStatus('正在检查连接...')
    try {
      const result = await getAgentSessionStatus()
      setStatus(
        result.expiresAt
          ? `已连接 · 令牌有效至 ${new Date(result.expiresAt).toLocaleString()}`
          : '已连接',
      )
    } catch {
      setError('当前不是智能体登录，或会话已失效。')
      setStatus('未连接')
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const result = await refreshAgentToken()
      setStatus(`令牌已刷新 · 有效期 ${result.data.expires_in} 秒`)
    } catch {
      setError('刷新失败，请重新统一登录。')
    } finally {
      setLoading(false)
    }
  }

  async function loadRuntime() {
    setLoading(true)
    setError('')
    try {
      const result = await getAgentRuntimeAccess()
      setRuntime(result)
      setStatus('运行时配置获取成功')
    } catch {
      setError('运行时配置获取失败。')
    } finally {
      setLoading(false)
    }
  }

  async function sendDebugMessage() {
    if (!message.trim()) {
      setDebugError('请输入测试消息。')
      return
    }
    setDebugLoading(true)
    setDebugError('')
    setDebugResponse(null)
    try {
      const result = await sendAgentRuntimeChat({
        message: message.trim(),
        model: model.trim() || undefined,
        llmServer: llmServer || undefined,
        chatContextId: chatContextId.trim() || undefined,
      })
      setDebugResponse(result.data)
    } catch (cause) {
      setDebugError(cause instanceof Error ? cause.message : '大模型调用失败。')
    } finally {
      setDebugLoading(false)
    }
  }

  async function sendApiTest() {
    const resourceType = activeTab === 'knowledge' ? 'knowledge' : 'api'
    const resourceLabel = resourceType === 'knowledge' ? '知识库资源' : 'API接口资源'
    if (!apiServer) {
      setApiError(`请选择${resourceLabel}。`)
      return
    }
    let body: Record<string, unknown> | undefined
    try {
      body = apiBody.trim() ? JSON.parse(apiBody) : undefined
    } catch {
      setApiError('请求体必须是合法 JSON。')
      return
    }
    setApiLoading(true)
    setApiError('')
    setApiResponse(null)
    try {
      const result = await sendAgentRuntimeApi({
        apiServer,
        resourceType,
        path: apiPath.trim(),
        method: apiMethod || undefined,
        body,
      })
      setApiResponse(result.data)
    } catch (cause) {
      setApiError(cause instanceof Error ? cause.message : `${resourceLabel}调用失败。`)
    } finally {
      setApiLoading(false)
    }
  }

  async function sendMcpTest() {
    const resourceType = activeTab === 'database' ? 'database' : 'mcp'
    const resourceLabel = resourceType === 'database' ? '数据库资源' : 'MCP服务资源'
    if (!mcpServer) {
      setMcpError(`请选择${resourceLabel}。`)
      return
    }
    let body: Record<string, unknown> | undefined
    try {
      body = mcpBody.trim() ? JSON.parse(mcpBody) : undefined
    } catch {
      setMcpError('请求体必须是合法 JSON。')
      return
    }
    setMcpLoading(true)
    setMcpError('')
    setMcpResponse(null)
    try {
      const result = await sendAgentRuntimeMcp({
        mcpServer,
        resourceType,
        body,
        chatContextId: chatContextId.trim() || undefined,
        mcpSessionId: mcpSessionId || undefined,
      })
      if (result.mcp_session_id) setMcpSessionId(result.mcp_session_id)
      setMcpResponse(result.data)
    } catch (cause) {
      setMcpError(cause instanceof Error ? cause.message : `${resourceLabel}调用失败。`)
    } finally {
      setMcpLoading(false)
    }
  }

  function changeDebugTab(nextTab: DebugTab) {
    if (nextTab === activeTab) return
    setActiveTab(nextTab)
    setApiPath('')
    setApiBody('')
    setMcpSessionId('')
  }

  const llm = runtime?.llm as Record<string, unknown> | undefined
  const mcp = runtime?.mcp as Record<string, unknown> | undefined
  const api = runtime?.api as Record<string, unknown> | undefined
  const knowledge = runtime?.knowledge as Record<string, unknown> | undefined
  const database = runtime?.database as Record<string, unknown> | undefined
  const llmServers =
    llm?.llmServers && typeof llm.llmServers === 'object' ? Object.keys(llm.llmServers as object) : []
  const headers = llm?.headers && typeof llm.headers === 'object' ? Object.keys(llm.headers as object) : []
  const bodyFields = llm?.body && typeof llm.body === 'object' ? Object.keys(llm.body as object) : []
  const servers =
    mcp?.mcpServers && typeof mcp.mcpServers === 'object' ? Object.keys(mcp.mcpServers as object) : []
  const apiServers =
    api?.apiServers && typeof api.apiServers === 'object' ? Object.keys(api.apiServers as object) : []
  const knowledgeServers =
    knowledge?.knowledgeServers && typeof knowledge.knowledgeServers === 'object'
      ? Object.keys(knowledge.knowledgeServers as object)
      : []
  const databaseServers =
    database?.databaseServers && typeof database.databaseServers === 'object'
      ? Object.keys(database.databaseServers as object)
      : []
  const selectedApi = (
    activeTab === 'knowledge' ? knowledge?.knowledgeServers : api?.apiServers
  ) as Record<string, { method?: string; info?: unknown }> | undefined
  const apiOptions = activeTab === 'knowledge' ? knowledgeServers : apiServers
  const mcpOptions = activeTab === 'database' ? databaseServers : servers
  const hasRuntime = runtime !== null
  const llmCount = llmServers.length || (llm?.url ? 1 : 0)

  const runtimeGroups = [
    { label: '大模型', count: llmCount, names: llmServers, icon: MessageSquare },
    { label: '知识库', count: knowledgeServers.length, names: knowledgeServers, icon: BookOpen },
    { label: 'API接口', count: apiServers.length, names: apiServers, icon: Code2 },
    { label: '数据库', count: databaseServers.length, names: databaseServers, icon: Database },
    { label: 'MCP服务', count: servers.length, names: servers, icon: Server },
  ]

  const activeResult =
    activeTab === 'llm'
      ? { loading: debugLoading, error: debugError, response: debugResponse }
      : activeTab === 'knowledge' || activeTab === 'api'
        ? { loading: apiLoading, error: apiError, response: apiResponse }
        : { loading: mcpLoading, error: mcpError, response: mcpResponse }

  return (
    <div className="agent-connection-page flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AgentConnectionToolbar
          status={status}
          loading={loading}
          hasError={Boolean(error)}
          onCheck={() => void checkStatus()}
          onLoadRuntime={() => void loadRuntime()}
        />

        <section className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 xl:overflow-hidden">
          <div className="grid min-h-full gap-4 xl:h-full xl:min-h-0 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] xl:min-h-0">
              <ConnectionPanel
                status={status}
                error={error}
                loading={loading}
                onRefresh={() => void refresh()}
              />
              <RuntimePanel
                hasRuntime={hasRuntime}
                groups={runtimeGroups}
                llm={llm}
                headers={headers}
                bodyFields={bodyFields}
                onLoadRuntime={() => void loadRuntime()}
              />
            </aside>

            <section className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] xl:min-h-0">
              <div className="border-b border-[var(--border)] px-4 pt-4 md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">请求调试</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      请求通过后端读取当前智能体配置并转发。
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">响应将显示在右侧</span>
                </div>
                <div className="mt-4 flex gap-8 overflow-x-auto overflow-y-hidden" role="tablist" aria-label="调试类型">
                  {[
                    { id: 'llm' as const, label: '大模型' },
                    { id: 'knowledge' as const, label: '知识库' },
                    { id: 'api' as const, label: 'API接口' },
                    { id: 'database' as const, label: '数据库' },
                    { id: 'mcp' as const, label: 'MCP服务' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      id={`debug-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-controls="debug-tab-panel"
                      aria-selected={activeTab === tab.id}
                      onClick={() => changeDebugTab(tab.id)}
                      className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${
                        activeTab === tab.id
                          ? 'border-[var(--accent)] text-[var(--text-primary)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-h-0 overflow-y-auto p-4 md:p-5">
                  <div
                    id="debug-tab-panel"
                    role="tabpanel"
                    aria-labelledby={`debug-tab-${activeTab}`}
                    className="flex min-h-full flex-col"
                  >
                    {activeTab === 'llm' ? (
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="大模型服务">
                            <select
                              value={llmServer}
                              onChange={(event) => setLlmServer(event.target.value)}
                              className={fieldControlClass}
                            >
                              <option value="">自动选择</option>
                              {llmServers.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="模型" hint="留空使用上游配置">
                            <input
                              value={model}
                              onChange={(event) => setModel(event.target.value)}
                              placeholder="模型名称"
                              className={fieldControlClass}
                            />
                          </Field>
                        </div>
                        <Field label="对话上下文 ID" hint="留空自动生成">
                          <input
                            value={chatContextId}
                            onChange={(event) => setChatContextId(event.target.value)}
                            placeholder="上下文 ID"
                            className={fieldControlClass}
                          />
                        </Field>
                        <Field label="测试消息">
                          <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={7}
                            className={`${fieldControlClass} h-auto min-h-[180px] resize-y py-3 leading-6`}
                          />
                        </Field>
                        <div className="mt-auto flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => void sendDebugMessage()}
                            disabled={debugLoading}
                            className={primaryButtonClass}
                          >
                            {debugLoading ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            发送测试
                          </button>
                        </div>
                      </div>
                    ) : activeTab === 'knowledge' || activeTab === 'api' ? (
                      <div className="flex flex-1 flex-col gap-4">
                        <Field label={activeTab === 'knowledge' ? '知识库资源' : 'API接口资源'}>
                          <select
                            value={apiServer}
                            onChange={(event) => setApiServer(event.target.value)}
                            className={fieldControlClass}
                          >
                            <option value="">请选择</option>
                            {apiOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                          <Field label="接口相对路径">
                            <input
                              value={apiPath}
                              onChange={(event) => setApiPath(event.target.value)}
                              placeholder="/resource"
                              className={fieldControlClass}
                            />
                          </Field>
                          <Field label="请求方法" hint={selectedApi?.[apiServer]?.method || '使用资源配置'}>
                            <input
                              value={apiMethod}
                              onChange={(event) => setApiMethod(event.target.value.toUpperCase())}
                              placeholder={selectedApi?.[apiServer]?.method || 'GET'}
                              className={fieldControlClass}
                            />
                          </Field>
                        </div>
                        {apiServer && selectedApi?.[apiServer]?.info ? (
                          <div className="rounded-[10px] bg-[var(--panel-soft)] p-3">
                            <div className="text-xs font-medium text-[var(--text-secondary)]">资源配置</div>
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                              {JSON.stringify(selectedApi[apiServer].info, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                        <Field label="请求 JSON" hint="可留空">
                          <textarea
                            value={apiBody}
                            onChange={(event) => setApiBody(event.target.value)}
                            rows={7}
                            className={`${fieldControlClass} h-auto min-h-[150px] resize-y py-3 font-mono leading-6`}
                          />
                        </Field>
                        <div className="mt-auto flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => void sendApiTest()}
                            disabled={apiLoading}
                            className={primaryButtonClass}
                          >
                            {apiLoading ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            发送请求
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label={activeTab === 'database' ? '数据库资源' : 'MCP服务资源'}>
                            <select
                              value={mcpServer}
                              onChange={(event) => {
                                setMcpServer(event.target.value)
                                setMcpSessionId('')
                              }}
                              className={fieldControlClass}
                            >
                              <option value="">请选择</option>
                              {mcpOptions.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="MCP Session ID" hint="可留空">
                            <input
                              value={mcpSessionId}
                              onChange={(event) => setMcpSessionId(event.target.value)}
                              placeholder="Session ID"
                              className={`${fieldControlClass} font-mono`}
                            />
                          </Field>
                        </div>
                        <Field label="JSON-RPC 请求">
                          <textarea
                            value={mcpBody}
                            onChange={(event) => setMcpBody(event.target.value)}
                            rows={9}
                            className={`${fieldControlClass} h-auto min-h-[230px] resize-y py-3 font-mono leading-6`}
                          />
                        </Field>
                        <div className="mt-auto flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => void sendMcpTest()}
                            disabled={mcpLoading}
                            className={primaryButtonClass}
                          >
                            {mcpLoading ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {activeTab === 'database' ? '发送数据库请求' : '发送 MCP 服务请求'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DebugOutput
                  loading={activeResult.loading}
                  error={activeResult.error}
                  response={activeResult.response}
                />
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}

function AgentConnectionToolbar({
  status,
  loading,
  hasError,
  onCheck,
  onLoadRuntime,
}: {
  status: string
  loading: boolean
  hasError: boolean
  onCheck: () => void
  onLoadRuntime: () => void
}) {
  const isReady =
    status.startsWith('已连接') || status.startsWith('令牌') || status.startsWith('运行时')
  const statusLabel = loading
    ? '处理中'
    : hasError || status === '未连接'
      ? '需要检查'
      : isReady
        ? '运行时就绪'
        : '等待检查'

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background-elevated)_82%,transparent)] px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              智能体连接
            </h1>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            验证会话、运行时配置与外部服务请求。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className="mr-1 inline-flex h-8 items-center gap-2 rounded-full bg-[var(--panel-soft)] px-3 text-xs font-medium text-[var(--text-secondary)]">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                hasError || status === '未连接'
                  ? 'bg-[var(--accent)]'
                  : isReady
                    ? 'bg-[#247b50]'
                    : 'bg-[var(--text-muted)]'
              }`}
            />
            {statusLabel}
          </span>
          <button type="button" onClick={onCheck} disabled={loading} className={secondaryButtonClass}>
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            检查连接
          </button>
          <button
            type="button"
            onClick={onLoadRuntime}
            disabled={loading}
            className={secondaryButtonClass}
          >
            <Server className="h-4 w-4" />
            获取运行时配置
          </button>
        </div>
      </div>
    </header>
  )
}

function ConnectionPanel({
  status,
  error,
  loading,
  onRefresh,
}: {
  status: string
  error: string
  loading: boolean
  onRefresh: () => void
}) {
  const failed = Boolean(error) || status === '未连接'
  const connected =
    status.startsWith('已连接') || status.startsWith('令牌') || status.startsWith('运行时')

  return (
    <section className="border-b border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">会话状态</h2>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]">
            {failed ? (
              <XCircle className="mt-1 h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
            ) : connected ? (
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#247b50]" />
            ) : (
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            )}
            <span>{status}</span>
          </p>
        </div>
        {loading ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[var(--text-secondary)]" />
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 rounded-[10px] bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5 text-[var(--accent-strong)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={`${secondaryButtonClass} mt-4 w-full`}
      >
        <RefreshCw className="h-4 w-4" />
        刷新访问令牌
      </button>
    </section>
  )
}

function RuntimePanel({
  hasRuntime,
  groups,
  llm,
  headers,
  bodyFields,
  onLoadRuntime,
}: {
  hasRuntime: boolean
  groups: Array<{
    label: string
    count: number
    names: string[]
    icon: typeof MessageSquare
  }>
  llm?: Record<string, unknown>
  headers: string[]
  bodyFields: string[]
  onLoadRuntime: () => void
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">运行时服务</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {hasRuntime ? '当前智能体可访问的资源' : '尚未载入运行时配置'}
          </p>
        </div>
        <Server className="h-4 w-4 text-[var(--text-muted)]" />
      </div>

      <div
        className={`min-h-0 overflow-y-auto px-5 py-2 ${
          hasRuntime ? '' : 'flex flex-1 flex-col'
        }`}
      >
        {groups.map(({ label, count, names, icon: Icon }) => (
          <div
            key={label}
            className={
              hasRuntime
                ? 'border-b border-[var(--border)] py-3 last:border-b-0'
                : 'flex flex-1 items-center border-b border-[var(--border)] last:border-b-0'
            }
          >
            <div className="flex w-full items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
              <span className="ml-auto text-sm tabular-nums text-[var(--text-secondary)]">
                {hasRuntime ? count : '—'}
              </span>
            </div>
            {hasRuntime && names.length ? (
              <div className="mt-2 space-y-2">
                {names.map((name) => (
                  <div
                    key={name}
                    className="break-words rounded-[10px] bg-[var(--panel-soft)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]"
                  >
                    {name}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {hasRuntime && llm?.url ? (
          <div className="my-3 rounded-[10px] bg-[var(--panel-soft)] p-3">
            <div className="text-xs font-medium text-[var(--text-primary)]">默认 LLM 网关</div>
            <div className="mt-2 break-all text-xs leading-5 text-[var(--text-secondary)]">
              {String(llm.url)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              {String(llm.method || 'POST')} · {headers.length} 个头字段 · {bodyFields.length} 个请求字段
            </div>
          </div>
        ) : null}
      </div>

      {!hasRuntime ? (
        <div className="border-t border-[var(--border)] px-5 py-4 text-center">
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            获取配置后显示可用服务与资源名称。
          </p>
          <button type="button" onClick={onLoadRuntime} className={`${secondaryButtonClass} mt-3`}>
            获取运行时配置
          </button>
        </div>
      ) : null}
    </section>
  )
}

function DebugOutput({
  loading,
  error,
  response,
}: {
  loading: boolean
  error: string
  response: unknown
}) {
  return (
    <aside className="flex min-h-[320px] min-w-0 flex-col border-t border-[var(--border)] bg-[var(--panel)] xl:min-h-0 xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">响应</h3>
        <span className="text-xs text-[var(--text-secondary)]">JSON</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-5">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            等待响应
          </div>
        ) : error ? (
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
            {error}
          </div>
        ) : response !== null ? (
          <pre className="min-h-full whitespace-pre-wrap break-words text-xs leading-6 text-[var(--text-secondary)]">
            {JSON.stringify(response, null, 2)}
          </pre>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <Terminal className="h-5 w-5 text-[var(--text-muted)]" />
            <p className="mt-3 max-w-64 text-sm leading-6 text-[var(--text-secondary)]">
              填写请求并发送后，状态码与返回内容会显示在这里。
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="flex items-center justify-between gap-3 text-[var(--text-secondary)]">
        <span className="font-medium">{label}</span>
        {hint ? (
          <span className="text-right text-xs font-normal text-[var(--text-secondary)]">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  )
}
