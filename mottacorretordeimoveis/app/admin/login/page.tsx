'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
    } else {
      router.refresh()
      router.push('/admin/dashboard')
    }
  }

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:'400px',padding:'48px',background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px',textAlign:'center'}}>Painel Admin</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'28px',fontWeight:300,color:'#e8e0d0',marginBottom:'40px',textAlign:'center'}}>Motta Corretor</h1>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',fontSize:'11px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase',marginBottom:'8px'}}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{width:'100%',background:'#1a1814',border:'1px solid rgba(201,168,76,0.2)',color:'#e8e0d0',padding:'12px 16px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
            />
          </div>
          <div style={{marginBottom:'32px'}}>
            <label style={{display:'block',fontSize:'11px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase',marginBottom:'8px'}}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              style={{width:'100%',background:'#1a1814',border:'1px solid rgba(201,168,76,0.2)',color:'#e8e0d0',padding:'12px 16px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
            />
          </div>
          {erro && <p style={{color:'#c0392b',fontSize:'13px',marginBottom:'16px',textAlign:'center'}}>{erro}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{width:'100%',background:'#c9a84c',color:'#0a0a0a',border:'none',padding:'14px',fontSize:'12px',letterSpacing:'3px',textTransform:'uppercase',fontWeight:600,cursor:loading?'wait':'pointer'}}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
