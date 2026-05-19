#!/bin/bash
# ============================================================
# Motta Corretor — aplicar melhorias
# Rodar dentro de: mottacorretordeimoveis/
# Comando: bash aplicar-melhorias.sh
# ============================================================
set -e

echo "🔧 Iniciando patches..."

# ────────────────────────────────────────────────────────────
# 1. LogoutButton compartilhado
# ────────────────────────────────────────────────────────────
cat > components/LogoutButton.tsx << 'EOF'
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
EOF
echo "✅ 1/6 LogoutButton criado"

# ────────────────────────────────────────────────────────────
# 2. Dashboard com counters + logout
# ────────────────────────────────────────────────────────────
cat > app/admin/dashboard/page.tsx << 'EOF'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/LogoutButton'

export default async function Dashboard() {
  const supabase = await createClient()
  const [{ count: totalImoveis }, { count: imoveisAtivos }, { data: leads }] = await Promise.all([
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('leads').select('status'),
  ])
  const leadsNovos = (leads || []).filter(l => l.status === 'novo').length
  const totalLeads = (leads || []).length

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#0f0e0c',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'0 32px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
          <p style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#c9a84c'}}>Motta Admin</p>
          <nav style={{display:'flex',gap:'24px'}}>
            <Link href="/admin/dashboard" style={{color:'#e8e0d0',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Imóveis</Link>
            <Link href="/admin/leads" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Leads</Link>
            <Link href="/admin/configuracoes" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Configurações</Link>
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link>
          <LogoutButton />
        </div>
      </header>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'48px 32px'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>Visão geral</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0',marginBottom:'40px'}}>Dashboard</h1>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'rgba(201,168,76,0.15)',marginBottom:'32px'}}>
          {[
            { label:'Imóveis total',  valor: totalImoveis  ?? 0, cor:'#e8e0d0' },
            { label:'Imóveis ativos', valor: imoveisAtivos ?? 0, cor:'#61ce70' },
            { label:'Leads total',    valor: totalLeads,          cor:'#e8e0d0' },
            { label:'Leads novos',    valor: leadsNovos,          cor:'#c9a84c' },
          ].map(c => (
            <div key={c.label} style={{background:'#0f0e0c',padding:'24px 28px'}}>
              <p style={{fontSize:'36px',fontFamily:'Georgia,serif',color:c.cor,fontWeight:300,marginBottom:'4px'}}>{c.valor}</p>
              <p style={{fontSize:'11px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase'}}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          <Link href="/admin/imoveis" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>🏠</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Imóveis</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Cadastrar, editar e remover imóveis</p>
            </div>
          </Link>
          <Link href="/admin/leads" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>👥</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Leads</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Clientes interessados nos imóveis</p>
            </div>
          </Link>
          <Link href="/admin/configuracoes" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>⚙️</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Configurações</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Editar textos, banner e visual do site</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
EOF
echo "✅ 2/6 Dashboard com counters + logout"

# ────────────────────────────────────────────────────────────
# 3. Logout nos headers das páginas admin client-side
# ────────────────────────────────────────────────────────────
PAGES=(
  "app/admin/imoveis/page.tsx"
  "app/admin/imoveis/novo/page.tsx"
  "app/admin/imoveis/[id]/page.tsx"
  "app/admin/leads/page.tsx"
  "app/admin/configuracoes/page.tsx"
)

for FILE in "${PAGES[@]}"; do
  if ! grep -q "LogoutButton" "$FILE"; then
    sed -i "s|import Link from 'next/link'|import Link from 'next/link'\nimport LogoutButton from '@/components/LogoutButton'|" "$FILE"
  fi
  if ! grep -q "<LogoutButton" "$FILE"; then
    sed -i "s|<Link href=\"/\" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link>|<div style={{display:'flex',alignItems:'center',gap:'16px'}}><Link href=\"/\" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link><LogoutButton /></div>|" "$FILE"
  fi
done
echo "✅ 3/6 Logout nos headers admin"

# ────────────────────────────────────────────────────────────
# 4. mostrar_preco + validação upload em /imoveis/novo
# ────────────────────────────────────────────────────────────
sed -i "s/destaque: false, ativo: true$/destaque: false, ativo: true, mostrar_preco: true/" \
  app/admin/imoveis/novo/page.tsx

sed -i "s|setFotos(Array.from(e.target.files))|const arquivos: File[] = Array.from(e.target.files)\n    const invalidos = arquivos.filter(f => f.size > 10 * 1024 * 1024)\n    if (invalidos.length) alert(\`\${invalidos.length} foto(s) ignoradas: excedem 10MB.\`)\n    setFotos(arquivos.filter(f => f.size <= 10 * 1024 * 1024))|" \
  app/admin/imoveis/novo/page.tsx

sed -i "s|fotos: urlsFotos|fotos: urlsFotos,\n        mostrar_preco: form.mostrar_preco|" \
  app/admin/imoveis/novo/page.tsx

python3 - << 'PYEOF'
path = 'app/admin/imoveis/novo/page.tsx'
content = open(path).read()
if 'mostrar_preco' not in content or 'name="mostrar_preco"' not in content:
    novo = '''
              <label style={{display:'flex',alignItems:'center',gap:'8px',color:'#a09880',fontSize:'12px',cursor:'pointer'}}>
                <input type="checkbox" name="mostrar_preco" checked={form.mostrar_preco} onChange={handleChange} />
                Exibir preço no site
              </label>'''
    content = content.replace(
        'name="ativo" checked={form.ativo} onChange={handleChange} />',
        'name="ativo" checked={form.ativo} onChange={handleChange} />' + novo
    )
    open(path, 'w').write(content)
    print("  checkbox mostrar_preco inserido")
else:
    print("  checkbox mostrar_preco já existe")
PYEOF
echo "✅ 4/6 mostrar_preco + validação upload"

# ────────────────────────────────────────────────────────────
# 5. SEO generateMetadata em /imovel/[id]
# ────────────────────────────────────────────────────────────
cp "app/imovel/[id]/page.tsx" "app/imovel/[id]/ImovelClient.tsx"
sed -i "s/export default function ImovelPage/export default function ImovelClient/" \
  "app/imovel/[id]/ImovelClient.tsx"

cat > "app/imovel/[id]/page.tsx" << 'EOF'
import { createClient } from '@/lib/supabase-server'
import ImovelClient from './ImovelClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('imoveis')
    .select('titulo, descricao, fotos, preco, tipo, categoria, cidade, bairro')
    .eq('id', params.id)
    .eq('ativo', true)
    .single()

  if (!data) return { title: 'Imóvel não encontrado — Motta Corretor' }

  const preco = `R$ ${Number(data.preco).toLocaleString('pt-BR')}`
  const titulo = `${data.titulo} — ${preco}`
  const descricao = data.descricao?.slice(0, 155) ||
    `${data.categoria || 'Imóvel'} à ${data.tipo} em ${data.bairro}, ${data.cidade}. ${preco}.`

  return {
    title: `${titulo} | Motta Corretor`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      images: data.fotos?.[0] ? [{ url: data.fotos[0] }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: data.fotos?.[0] ? [data.fotos[0]] : [],
    },
  }
}

export default function ImovelPage() {
  return <ImovelClient />
}
EOF
echo "✅ 5/6 SEO generateMetadata"

# ────────────────────────────────────────────────────────────
# 6. Centralizar Supabase client
# ────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import re, os

files = [
  'app/admin/imoveis/page.tsx',
  'app/admin/imoveis/novo/page.tsx',
  'app/admin/imoveis/[id]/page.tsx',
  'app/admin/leads/page.tsx',
  'app/admin/configuracoes/page.tsx',
]

for path in files:
  if not os.path.exists(path): continue
  content = open(path).read()
  if "from '@supabase/supabase-js'" not in content: continue

  # Remove bloco import + const supabase = createClient(...)
  content = re.sub(
    r"import \{ createClient \} from '@supabase/supabase-js'\n\nconst supabase = createClient\(\n  process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\n  process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n\)\n",
    "",
    content
  )
  # Adiciona import centralizado se ainda não tem
  if "from '@/lib/supabase'" not in content:
    content = content.replace(
      "'use client'\n",
      "'use client'\nimport { supabase } from '@/lib/supabase'\n"
    )
  open(path, 'w').write(content)
  print(f"  centralizado: {path}")
PYEOF
echo "✅ 6/6 Supabase client centralizado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Todos os patches aplicados!"
echo ""
echo "▶️  Para commitar:"
echo "    git add . && git commit -m 'feat: dashboard counters, logout, SEO imovel, validação upload, supabase centralizado'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
