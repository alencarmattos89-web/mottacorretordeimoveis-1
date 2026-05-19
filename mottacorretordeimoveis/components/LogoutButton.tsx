'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  async function sair() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }
  return (
    <button onClick={sair} style={{
      background:'transparent', border:'1px solid rgba(201,168,76,0.2)',
      color:'#6b6355', fontSize:'11px', letterSpacing:'1px',
      padding:'6px 14px', cursor:'pointer'
    }}>
      Sair
    </button>
  )
}
