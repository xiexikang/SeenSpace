import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Eye, EyeOff, Image, Palette, RefreshCw, Sparkles, X } from 'lucide-react'
import logoUrl from '../../assets/logo.png'
import { getAuthToken } from '../../lib/api-client'
import { getAgentAuthorizeUrl, getCaptcha, login, register, type CaptchaResponse } from '../../features/auth/services/auth-service'

type AuthMode = 'login' | 'register'

type InspirationTile = {
  title: string
  image: string
  className: string
}

const heroTiles: InspirationTile[] = [
  {
    title: '视觉灵感',
    image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=720&q=82',
    className: 'left-[42%] top-[7%] h-[118px] w-[118px]',
  },
  {
    title: '品牌设计',
    image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=840&q=82',
    className: 'left-[57%] top-[25%] h-[292px] w-[220px]',
  },
  {
    title: '空间',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=620&q=82',
    className: 'right-[12%] top-[30%] h-[148px] w-[148px]',
  },
  {
    title: '影像',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=720&q=82',
    className: 'left-[42%] top-[45%] h-[226px] w-[184px]',
  },
  {
    title: '产品',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=82',
    className: 'right-[16%] top-[60%] h-[144px] w-[144px]',
  },
  {
    title: '趋势',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=500&q=82',
    className: 'right-[4%] top-[14%] h-[74px] w-[74px]',
  },
]

const discoveryTiles: InspirationTile[] = [
  {
    title: '平面设计',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: 'UI/UX',
    image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '插画/漫画',
    image: 'https://images.unsplash.com/photo-1579547621706-1a9c79d5c9f1?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '摄影',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '建筑设计',
    image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '游戏',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '服装',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '工业',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '室内设计',
    image: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '书画雕刻艺术',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
  {
    title: '手工艺',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=760&q=82',
    className: 'col-span-2',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAgentSubmitting, setIsAgentSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function refreshCaptcha() {
    setCaptcha(await getCaptcha())
    setCaptchaCode('')
  }

  function openAuth(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setIsAuthOpen(true)
  }

  useEffect(() => {
    let isActive = true

    async function loadCaptcha() {
      const nextCaptcha = await getCaptcha()
      if (!isActive) return
      setCaptcha(nextCaptcha)
      setCaptchaCode('')
    }

    void loadCaptcha()

    return () => {
      isActive = false
    }
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

  async function handleAgentLogin() {
    setError('')
    setIsAgentSubmitting(true)
    try {
      const response = await getAgentAuthorizeUrl()
      if (response.code !== 0 || !response.data?.authorizeUrl || !response.data?.state) {
        throw new Error('Invalid agent authorization response')
      }
      window.sessionStorage.setItem('seenspace-agent-oauth-state', response.data.state)
      window.location.assign(response.data.authorizeUrl)
    } catch {
      setError('智能体统一登录暂不可用，请稍后重试。')
      setMode('login')
      setIsAuthOpen(true)
      setIsAgentSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#171b22]">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-20 items-center gap-6 border-b border-transparent bg-white/92 px-7 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img className="h-8 w-8 rounded-[10px] object-cover shadow-[0_16px_36px_rgba(255,49,88,0.2)]" src={logoUrl} alt="SeenSpace" />
          <a className="hidden text-sm font-semibold text-[#171b22] md:block" href="#discover">
            SeenSpace
          </a>
        </div>
        <div className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={() => void handleAgentLogin()}
          disabled={isAgentSubmitting}
          className="h-11 shrink-0 rounded-full border border-[#ffd1da] bg-[#fff5f7] px-5 text-sm font-semibold text-[#e3264d] shadow-[0_12px_28px_rgba(255,49,88,0.1)] hover:-translate-y-0.5 hover:bg-[#ffedf1] disabled:cursor-wait disabled:opacity-60"
        >
          智能体统一登录
        </button>
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="h-11 shrink-0 rounded-full bg-[#1f252d] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(31,37,45,0.16)] hover:-translate-y-0.5"
        >
          登录/注册
        </button>

      </header>

      <section className="relative mx-auto grid min-h-[640px] w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-7 pb-16 pt-36 lg:grid-cols-[0.82fr_1.18fr] lg:px-12">
        <div className="relative z-10 mx-auto max-w-[520px] text-center lg:mx-0 lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#fff1f4] px-4 py-2 text-xs font-semibold text-[#ff3158]">
            <Sparkles className="h-4 w-4" />
            SeenSpace 灵感工作台
          </div>
          <h1 className="text-[42px] font-black leading-[1.16] tracking-normal text-[#121720] sm:text-[56px]">
            你可以在这里
            <br />
            发现&收集灵感
          </h1>
          <p className="mt-5 max-w-[430px] text-base leading-8 text-[#596170] lg:max-w-[470px]">
            从图像、项目、画板到内容线索，把零散灵感收束成可继续创作的工作空间。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="h-12 rounded-full bg-[#ff3158] px-6 text-sm font-bold text-white shadow-[0_18px_42px_rgba(255,49,88,0.28)] hover:-translate-y-0.5"
            >
              立即加入 SeenSpace
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="h-12 rounded-full bg-[#f1f3f6] px-6 text-sm font-bold text-[#3e4652] hover:-translate-y-0.5 hover:bg-[#e9edf2]"
            >
              已有账号
            </button>
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden lg:overflow-visible">
          <div className="absolute left-[8%] top-[13%] h-[360px] w-[360px] rounded-full bg-[#fff4f6] blur-3xl" />
          <div className="absolute right-[8%] top-[20%] h-[280px] w-[280px] rounded-full bg-[#edf9ff] blur-3xl" />
          {heroTiles.map((tile) => (
            <figure
              key={tile.title}
              className={`absolute overflow-hidden rounded-[24px] bg-[#f3f5f8] shadow-[0_30px_80px_rgba(31,37,45,0.13)] ${tile.className}`}
            >
              <img className="h-full w-full object-cover" src={tile.image} alt={tile.title} />
            </figure>
          ))}
        </div>
      </section>

      <section id="discover" className="bg-[#f5f6f8] px-7 py-20">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="text-[36px] font-black leading-tight text-[#121720] sm:text-[48px]">探索你感兴趣的灵感</h2>
          <p className="mt-3 text-sm leading-7 text-[#596170]">按兴趣探索灵感，找到适合当下创作方向的内容</p>
          <button
            type="button"
            onClick={() => openAuth('register')}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#ff3158] px-6 text-sm font-bold text-white shadow-[0_16px_34px_rgba(255,49,88,0.24)] hover:-translate-y-0.5"
          >
            探索
            <ArrowUpRight className="h-4 w-4" />
          </button>

          <div className="mx-auto mt-10 grid max-w-[960px] grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {discoveryTiles.map((tile) => (
              <button
                key={tile.title}
                type="button"
                onClick={() => openAuth('register')}
                className={`${tile.className} group relative h-[104px] overflow-hidden rounded-[22px] bg-[#dfe3e8] text-left shadow-[0_16px_38px_rgba(31,37,45,0.1)] sm:h-[122px]`}
              >
                <img
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  src={tile.image}
                  alt={tile.title}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <span className="absolute bottom-4 left-5 right-5 text-xl font-black text-white drop-shadow">{tile.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid min-h-[560px] items-center gap-10 bg-white px-7 py-20 lg:grid-cols-2 lg:px-12">
        <div className="relative mx-auto h-[360px] w-full max-w-[540px] overflow-hidden sm:overflow-visible">
          <div className="absolute left-[9%] top-[0] w-[250px] -rotate-[-5deg] overflow-hidden rounded-[28px] border-[10px] border-white bg-white shadow-[0_28px_80px_rgba(31,37,45,0.13)]">
            <img
              className="h-[190px] w-full object-cover"
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=720&q=82"
              alt="海报创意"
            />
            <div className="px-4 py-3 text-2xl font-black">海报创意</div>
          </div>
          <div className="absolute left-[34%] top-[88px] z-10 w-[310px] overflow-hidden rounded-[28px] border-[10px] border-white bg-white shadow-[0_28px_80px_rgba(31,37,45,0.16)]">
            <img
              className="h-[205px] w-full object-cover"
              src="https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=760&q=82"
              alt="插画插图"
            />
            <div className="px-4 py-3 text-2xl font-black">插画 · 插图</div>
          </div>
          <div className="absolute bottom-0 left-[50%] w-[250px] overflow-hidden rounded-[28px] border-[10px] border-white bg-white shadow-[0_28px_80px_rgba(31,37,45,0.12)]">
            <img
              className="h-[188px] w-full object-cover"
              src="https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=720&q=82"
              alt="美陈"
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-2xl font-black">美陈</span>
              <span className="text-xs font-semibold text-[#89919e]">246采集</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[560px] text-center lg:text-left">
          <div className="mb-5 flex justify-center gap-3 lg:justify-start">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1f4] text-[#ff3158]">
              <Palette className="h-5 w-5" />
            </span>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#eef7ff] text-[#2084d8]">
              <Image className="h-5 w-5" />
            </span>
          </div>
          <h2 className="text-[34px] font-black leading-tight text-[#121720] sm:text-[46px]">用画板收集你喜欢的灵感</h2>
          <p className="mt-4 text-base leading-8 text-[#596170]">持续收集喜欢的内容，和大家分享你的灵感库。</p>
          <button
            type="button"
            onClick={() => openAuth('register')}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#ff3158] px-6 text-sm font-bold text-white shadow-[0_16px_34px_rgba(255,49,88,0.24)] hover:-translate-y-0.5"
          >
            探索
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {isAuthOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#11151b]/42 px-4 py-6 backdrop-blur-md">
          <div className="relative w-full max-w-[430px] rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fdfdfe_100%)] p-7 shadow-[0_36px_110px_rgba(17,21,27,0.22)]">
            <button
              type="button"
              onClick={() => setIsAuthOpen(false)}
              aria-label="关闭弹窗"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#e7ebf0] bg-white/88 text-[#7a8390] outline-none shadow-[0_8px_18px_rgba(17,21,27,0.06)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#dce1e8] hover:bg-white hover:text-[#171b22] focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-7 pr-10">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#ff3158]">SeenSpace</div>
              <h2 className="text-2xl font-black text-[#121720]">{mode === 'login' ? '登录工作区' : '创建账号'}</h2>
              <p className="mt-3 text-sm leading-6 text-[#596170]">
                {mode === 'login' ? '继续进入你的灵感项目和内容画布。' : '先创建一个账号，再开始整理项目。'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-[18px] bg-[#f3f5f8] p-1">
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
                  className={`rounded-[14px] px-3 py-2.5 text-sm font-bold outline-none transition-all focus-visible:outline-none ${
                    mode === item.id
                      ? 'bg-white text-[#121720] shadow-[0_10px_24px_rgba(31,37,45,0.08)]'
                      : 'text-[#69717d] hover:bg-white/70 hover:text-[#171b22]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' ? (
                <label className="block">
                  <div className="mb-2 text-sm font-bold text-[#3e4652]">昵称</div>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="请输入昵称"
                    className="h-12 w-full rounded-[16px] border border-[#e5e8ed] bg-[#f8f9fb] px-4 text-sm text-[#121720] placeholder:text-[#a3acb9] outline-none focus:border-[#ff3158] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
                  />
                </label>
              ) : null}

              <label className="block">
                <div className="mb-2 text-sm font-bold text-[#3e4652]">账号</div>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  placeholder="请输入账号"
                  className="h-12 w-full rounded-[16px] border border-[#e5e8ed] bg-[#f8f9fb] px-4 text-sm text-[#121720] placeholder:text-[#a3acb9] outline-none focus:border-[#ff3158] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-[#3e4652]">密码</div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    placeholder="请输入密码"
                    className="h-12 w-full rounded-[16px] border border-[#e5e8ed] bg-[#f8f9fb] px-4 pr-12 text-sm text-[#121720] placeholder:text-[#a3acb9] outline-none focus:border-[#ff3158] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[12px] text-[#69717d] transition-colors hover:bg-white hover:text-[#171b22] focus-visible:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div>
                <div className="mb-2 text-sm font-bold text-[#3e4652]">图形验证码</div>
                <div className="flex gap-3">
                  <input
                    value={captchaCode}
                    onChange={(event) => setCaptchaCode(event.target.value)}
                    required
                    placeholder="请输入验证码"
                    className="h-12 min-w-0 flex-1 rounded-[16px] border border-[#e5e8ed] bg-[#f8f9fb] px-4 text-sm text-[#121720] placeholder:text-[#a3acb9] uppercase outline-none focus:border-[#ff3158] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="flex h-12 w-[150px] items-center justify-center gap-2 rounded-[16px] border border-[#e5e8ed] bg-[#f8f9fb] px-2 text-[#69717d] outline-none transition-colors hover:border-[#d9dde4] hover:bg-white focus:border-[#ff3158] focus:shadow-[0_0_0_4px_rgba(255,49,88,0.12)] focus-visible:outline-none"
                  >
                    {captcha ? (
                      <span
                        className="block h-10 w-[126px] overflow-hidden rounded-[12px] [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: captcha.svg }}
                      />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-[#69717d]" />
                    )}
                  </button>
                </div>
              </div>

              {error ? <div className="rounded-[16px] bg-[#fff1f4] px-4 py-3.5 text-sm leading-6 text-[#d81239]">{error}</div> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-[16px] bg-[#ff3158] px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(255,49,88,0.24)] outline-none transition-all hover:bg-[#f2274d] hover:shadow-[0_18px_38px_rgba(255,49,88,0.28)] focus:shadow-[0_0_0_4px_rgba(255,49,88,0.16),0_16px_34px_rgba(255,49,88,0.24)] focus-visible:outline-none disabled:opacity-50"
              >
                {isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
