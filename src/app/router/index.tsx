import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { ProjectListPage } from '../../pages/projects/project-list-page'
import { LoginPage } from '../../pages/auth/login-page'
import { ProtectedRoute } from './protected-route'
import { agentLogin } from '../../features/auth/services/auth-service'

function AgentCallbackPage() {
  const navigate = useNavigate()
  const [callback] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const expectedState = window.sessionStorage.getItem('seenspace-agent-oauth-state')
    window.sessionStorage.removeItem('seenspace-agent-oauth-state')
    return { code: code && state && expectedState === state ? code : null }
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!callback.code) return

    void agentLogin(callback.code)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('统一登录失败，请重新发起登录。'))
  }, [callback.code, navigate])

  const message = !callback.code ? '统一登录校验失败，请重新发起登录。' : error

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fa] px-6 text-center text-sm text-[#596170]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,49,88,0.1),transparent_30%),linear-gradient(135deg,#fff_0%,#f7f8fa_55%,#fff4f6_100%)]" />
      <div className="relative w-full max-w-[390px] rounded-[28px] border border-white/80 bg-white/90 px-8 py-10 shadow-[0_30px_90px_rgba(31,37,45,0.12)] backdrop-blur-xl">
      {message ? (
        <div>
          <p>{message}</p>
          <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-5 rounded-full bg-[#ff3158] px-5 py-2.5 font-semibold text-white">
            返回登录
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#fff1f4] text-[#ff3158]">
            <LoaderCircle className="h-8 w-8 animate-spin" strokeWidth={2.2} />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#ff3158] shadow-[0_5px_14px_rgba(31,37,45,0.12)]">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <h1 className="mt-6 text-xl font-black text-[#171b22]">正在统一登录</h1>
          <p className="mt-2 leading-6 text-[#7b8491]">正在安全验证身份，请稍候片刻</p>
          <div className="mt-7 h-1.5 w-40 overflow-hidden rounded-full bg-[#f1dfe3]">
            <div className="h-full w-1/2 animate-[loading-slide_1.4s_ease-in-out_infinite] rounded-full bg-[#ff3158]" />
          </div>
        </div>
      )}
      </div>
    </main>
  )
}

function RootEntry() {
  const location = useLocation()
  return new URLSearchParams(location.search).has('code') ? (
    <AgentCallbackPage />
  ) : (
    <ProtectedRoute>
      <ProjectListPage />
    </ProtectedRoute>
  )
}

const WorkspacePage = lazy(async () => {
  const module = await import('../../pages/workspace/workspace-page')
  return { default: module.WorkspacePage }
})

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]">
          正在加载工作区...
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RootEntry />
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <ProjectListPage favoriteOnly />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:projectId"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
