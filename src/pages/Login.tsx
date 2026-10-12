import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cursor } from '../components/Cursor'

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
        setError('senha incorreta.')
        setLoading(false)
        return
      }
      window.location.href = params.get('next') || '/'
    } catch {
      setError('não deu pra conectar. tenta de novo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-ink px-6">
      <Cursor />
      <img src="/brand/wordmark-white.png" alt="HENNRI." className="h-7 w-auto" />
      <form onSubmit={submit} className="flex w-full max-w-[360px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] text-cream/45 uppercase">senha</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-b border-cream/22 bg-transparent pb-2 text-[17px] text-paper outline-none focus:border-paper"
          />
          {error && <span className="text-[12.5px] text-cream/70">{error}</span>}
        </div>
        <button
          type="submit"
          data-hot="1"
          disabled={loading || !password}
          className="flex items-center justify-center gap-2 bg-paper px-5 py-3 text-[13px] font-semibold text-ink outline-none hover:bg-cream disabled:opacity-40"
        >
          <span>{loading ? 'entrando…' : 'Entrar'}</span>
        </button>
      </form>
    </div>
  )
}
