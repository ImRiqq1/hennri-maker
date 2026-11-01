import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

export function Login() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('Senha incorreta.')
        setLoading(false)
        return
      }
      window.location.href = params.get('next') || '/'
    } catch {
      setError('Não deu pra conectar. Tenta de novo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--hero-gradient)' }}
    >

      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-9 animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-3">
          <img src="/brand/wordmark-white.png" alt="HENNRI." className="h-7 w-auto" />
          <span className="text-[12px] font-medium tracking-[0.14em] text-ice-300/80 uppercase">IA Maker</span>
        </div>

        <form
          onSubmit={submit}
          className="flex w-full flex-col gap-5 rounded-[28px] border border-white/10 bg-white/[0.06] p-7 shadow-float backdrop-blur-xl"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-white">Bem-vindo de volta</span>
            <span className="text-[13.5px] text-white/55">Digite a senha pra entrar no acervo.</span>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="password"
              autoFocus
              placeholder="Senha"
              aria-label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-[15px] text-white outline-none transition-[border-color,box-shadow] placeholder:text-white/35 focus:border-ice-400 focus:ring-4 focus:ring-ice-400/20"
            />
            {error && (
              <span className="flex items-center gap-1.5 text-[13px] text-[#f0a49f]">
                <i className="ri-error-warning-line" />
                {error}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-ice-400 text-[15px] font-semibold text-abyss-950 outline-none transition-[background-color,transform] hover:bg-ice-300 focus-visible:ring-4 focus-visible:ring-ice-400/40 active:scale-[0.98] disabled:opacity-40"
          >
            <span>{loading ? 'Entrando…' : 'Entrar'}</span>
            {!loading && <i className="ri-arrow-right-line text-[17px]" />}
          </button>
        </form>
      </div>
    </div>
  )
}
