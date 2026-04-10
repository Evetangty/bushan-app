import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-white p-6 shadow">
        <h2 className="mt-0 text-xl font-semibold">未配置云端</h2>
        <p className="text-sm text-gray-600">请在项目根目录创建 <code className="rounded bg-gray-100 px-1">.env</code>，填入 <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_URL</code> 与 <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_ANON_KEY</code>，并参考 <code className="rounded bg-gray-100 px-1">docs/SUPABASE_SETUP.md</code> 建表。</p>
      </div>
    )
  }

  const submit = async () => {
    setMessage(null)
    setPending(true)
    try {
      const fn = mode === 'login' ? signInWithEmail : signUpWithEmail
      const { error } = await fn(email.trim(), password)
      if (error) {
        setMessage(error.message)
        return
      }
      if (mode === 'register') {
        setMessage('注册成功。若项目开启了邮箱验证，请先查收邮件再登录。')
        setMode('login')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-card bg-white p-6 shadow">
      <h2 className="mt-0 text-xl font-semibold">🧵 布山手作</h2>
      <p className="text-sm text-gray-600">使用邮箱密码登录后，数据保存在云端，换设备登录同一账号即可同步。</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full py-2 text-sm font-medium ${mode === 'login' ? 'bg-primary text-white' : 'border bg-gray-50'}`}
          onClick={() => setMode('login')}
        >
          登录
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full py-2 text-sm font-medium ${mode === 'register' ? 'bg-primary text-white' : 'border bg-gray-50'}`}
          onClick={() => setMode('register')}
        >
          注册
        </button>
      </div>

      <label className="mt-4 block text-sm">
        邮箱
        <input
          className="mt-1 w-full rounded border p-2"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        密码
        <input
          className="mt-1 w-full rounded border p-2"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}

      <button
        type="button"
        className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
        disabled={pending || !email.trim() || !password}
        onClick={() => void submit()}
      >
        {pending ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
      </button>
    </div>
  )
}
