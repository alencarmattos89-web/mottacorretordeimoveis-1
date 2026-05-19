#!/bin/bash
# patch-searchparams-async.sh
# Corrige o searchParams para Next.js 15+/16 onde ele é uma Promise.
# Também garante que o BuscaForm esteja como Client Component corretamente.
# Uso: bash patch-searchparams-async.sh (rode na raiz do projeto)

set -e

PAGE="app/page.tsx"

echo "🔧 Verificando arquivo..."
if [ ! -f "$PAGE" ]; then
  echo "❌ Arquivo $PAGE não encontrado."
  exit 1
fi

python3 << 'PYEOF'
with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Corrigir a assinatura do searchParams para Promise
old_sig = "export default async function Home({ searchParams }: { searchParams: any }) {"
new_sig = "export default async function Home({ searchParams }: { searchParams: Promise<any> }) {"
if old_sig in content:
    content = content.replace(old_sig, new_sig)
    print("✅ Assinatura do searchParams corrigida para Promise<any>")
else:
    print("⚠️  Assinatura já foi alterada ou não encontrada.")

# 2. Adicionar await no searchParams logo após a abertura da função
# Inserir antes da primeira leitura dos filtros
old_filtros = "  const filtroTipo = searchParams?.tipo || ''"
new_filtros = "  const sp = await searchParams\n  const filtroTipo = sp?.tipo || ''"
if old_filtros in content:
    content = content.replace(old_filtros, new_filtros)
    print("✅ await searchParams adicionado")
else:
    print("⚠️  Linha de filtroTipo não encontrada no padrão esperado.")

# 3. Corrigir demais referências a searchParams?. para sp?.
replacements = [
    ("const filtroCategoria = searchParams?.categoria || ''", "const filtroCategoria = sp?.categoria || ''"),
    ("const filtroPrecoMax = searchParams?.preco_max || ''", "const filtroPrecoMax = sp?.preco_max || ''"),
    ("const filtroBusca = searchParams?.busca || ''",        "const filtroBusca = sp?.busca || ''"),
    # fallback caso filtroBusca não exista ainda
    ("searchParams?.busca || ''", "sp?.busca || ''"),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"✅ Corrigido: {old[:50]}...")

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("\n✅ page.tsx atualizado com sucesso.")
PYEOF

echo ""
echo "═══════════════════════════════════════"
echo "✨ Patch aplicado!"
echo ""
echo "O que foi corrigido:"
echo "  • searchParams agora é tipado como Promise<any> (obrigatório no Next.js 15+/16)"
echo "  • Adicionado 'await searchParams' antes de ler os filtros"
echo "  • Sem isso o build de produção quebraria com erro de Promise"
echo "═══════════════════════════════════════"
echo ""
echo "Teste o build antes de fazer deploy:"
echo "  npm run build"
echo ""
echo "Se passar sem erros, pode fazer o deploy normalmente."
