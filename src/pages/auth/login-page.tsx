import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { getAuthToken } from '../../lib/api-client'
import { getCaptcha, login, register, type CaptchaResponse } from '../../features/auth/services/auth-service'

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function refreshCaptcha() {
    setCaptcha(await getCaptcha())
    setCaptchaCode('')
  }

  useEffect(() => {
    void refreshCaptcha()
  }, [])

  if (getAuthToken()) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!captcha) return

    setError('')
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ username, password, captchaId: captcha.captchaId, captchaCode })
      } else {
        await register({ username, name, password, captchaId: captcha.captchaId, captchaCode })
      }
      navigate('/', { replace: true })
    } catch {
      setError(mode === 'login' ? '登录失败，请检查账号、密码和验证码。' : '注册失败，请检查信息和验证码。')
      await refreshCaptcha()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">SeenSpace / 见间</div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {mode === 'login' ? '登录工作区' : '创建账号'}
            </h1>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
            {[
              { id: 'login' as const, label: '登录' },
              { id: 'register' as const, label: '注册' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id)
                  setError('')
                }}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  mode === item.id
                    ? 'bg-[var(--panel)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' ? (
              <label className="block">
                <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">昵称</div>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none"
                />
              </label>
            ) : null}

            <label className="block">
              <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">账号</div>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                minLength={3}
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">密码</div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 pr-11 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">图形验证码</div>
              <div className="flex gap-2">
                <input
                  value={captchaCode}
                  onChange={(event) => setCaptchaCode(event.target.value)}
                  required
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm uppercase outline-none"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="flex h-12 w-[150px] items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)]"
                >
                  {captcha ? (
                    <span
                      className="block h-12 w-[136px]"
                      dangerouslySetInnerHTML={{ __html: captcha.svg }}
                    />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>

            {error ? <div className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--background)] disabled:opacity-50"
            >
              {isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
