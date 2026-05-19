#!/bin/bash
# ============================================================
# Motta Corretor — novo filtro estilo barra de busca
# Rodar dentro de: mottacorretordeimoveis/
# Comando: bash patch-filtro.sh
# ============================================================
set -e

python3 - << 'PYEOF'
path = 'app/page.tsx'
content = open(path).read()

# ── Bloco antigo a remover ──────────────────────────────────
old = '''        {/* Filtros elegantes — linha única */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '48px', paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>

            {/* Tipo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRight: '1px solid rgba(201,168,76,0.12)', paddingRight: '24px', marginRight: '24px' }}>
              <Link href={urlRemoveFiltro('tipo')} style={filtroBtn(!filtroTipo)}>Todos</Link>
              <Link href={urlFiltro({ tipo: 'venda' })} style={filtroBtn(filtroTipo === 'venda')}>Venda</Link>
              <Link href={urlFiltro({ tipo: 'aluguel' })} style={filtroBtn(filtroTipo === 'aluguel')}>Aluguel</Link>
            </div>

            {/* Categoria */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRight: '1px solid rgba(201,168,76,0.12)', paddingRight: '24px', marginRight: '24px' }}>
              <Link href={urlFiltro({ categoria: 'casa' })} style={filtroBtn(filtroCategoria === 'casa')}>Casa</Link>
              <Link href={urlFiltro({ categoria: 'apartamento' })} style={filtroBtn(filtroCategoria === 'apartamento')}>Apto</Link>
              <Link href={urlFiltro({ categoria: 'terreno' })} style={filtroBtn(filtroCategoria === 'terreno')}>Terreno</Link>
              <Link href={urlFiltro({ categoria: 'comercial' })} style={filtroBtn(filtroCategoria === 'comercial')}>Comercial</Link>
            </div>

            {/* Preço */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', flex: 1 }}>
              {[
                { label: 'Até 200k', value: '200000' },
                { label: 'Até 400k', value: '400000' },
                { label: 'Até 600k', value: '600000' },
                { label: 'Até 1M', value: '1000000' },
              ].map(f => (
                <Link key={f.value} href={urlFiltro({ preco_max: f.value })} style={filtroBtn(filtroPrecoMax === f.value)}>{f.label}</Link>
              ))}
            </div>

            {/* Limpar */}
            {temFiltro && (
              <Link href="/#imoveis" style={{ fontSize: '10px', color: '#6b6355', letterSpacing: '1px', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(201,168,76,0.15)', marginLeft: 'auto' }}>
                ✕ limpar
              </Link>
            )}
          </div>
        </div>'''

new = '''        {/* Barra de busca */}
        <style>{`
          .busca-form { display: grid; grid-template-columns: 160px 160px 1fr auto; gap: 0; background: #0f0e0c; border: 1px solid rgba(201,168,76,0.25); margin-bottom: 56px; }
          .busca-select, .busca-input { background: transparent; border: none; border-right: 1px solid rgba(201,168,76,0.15); color: #e8e0d0; padding: 16px 18px; font-size: 13px; font-family: system-ui,sans-serif; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; width: 100%; }
          .busca-select option { background: #0f0e0c; color: #e8e0d0; }
          .busca-select:hover, .busca-input:hover { background: rgba(201,168,76,0.04); }
          .busca-input::placeholder { color: #4a4438; }
          .busca-btn { background: #c9a84c; color: #0a0a0a; border: none; padding: 16px 32px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: system-ui,sans-serif; }
          .busca-btn:hover { background: #d4b55c; }
          @media (max-width: 768px) {
            .busca-form { grid-template-columns: 1fr 1fr; }
            .busca-select:first-child { border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-select:nth-child(2) { border-right: none; border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-input { grid-column: 1/-1; border-right: none; border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-btn { grid-column: 1/-1; padding: 16px; }
          }
        `}</style>

        <form action="/#imoveis" method="GET" className="busca-form">
          <select name="tipo" defaultValue={filtroTipo} className="busca-select">
            <option value="">Comprar ou Alugar</option>
            <option value="venda">Comprar</option>
            <option value="aluguel">Alugar</option>
          </select>
          <select name="categoria" defaultValue={filtroCategoria} className="busca-select">
            <option value="">Tipo de imóvel</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="terreno">Terreno</option>
            <option value="comercial">Comercial</option>
          </select>
          <input
            name="busca"
            defaultValue={searchParams?.busca || ''}
            className="busca-input"
            placeholder="Bairro ou cidade..."
            autoComplete="off"
          />
          <button type="submit" className="busca-btn">Buscar</button>
        </form>

        {temFiltro && (
          <div style={{ marginTop: '-40px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {filtroTipo && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                {filtroTipo === 'venda' ? 'Comprar' : 'Alugar'}
                <Link href={urlRemoveFiltro('tipo')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            {filtroCategoria && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                {filtroCategoria.charAt(0).toUpperCase() + filtroCategoria.slice(1)}
                <Link href={urlRemoveFiltro('categoria')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            {filtroPrecoMax && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                Até R$ {Number(filtroPrecoMax).toLocaleString('pt-BR')}
                <Link href={urlRemoveFiltro('preco_max')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            <Link href="/#imoveis" style={{ fontSize: '11px', color: '#6b6355', letterSpacing: '1px', textDecoration: 'none', marginLeft: '4px' }}>limpar tudo →</Link>
          </div>
        )}'''

if old.strip() in content:
    content = content.replace(old, new)
    open(path, 'w').write(content)
    print("✅ Filtro substituído com sucesso")
else:
    print("❌ Bloco antigo não encontrado — verifique se o page.tsx foi alterado manualmente")
PYEOF
