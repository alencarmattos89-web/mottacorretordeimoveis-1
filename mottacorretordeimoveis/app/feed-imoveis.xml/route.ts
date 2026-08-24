// mottacorretordeimoveis/app/feed-imoveis.xml/route.ts
//
// Gera o feed XML de imóveis no formato "Home Listings" exigido pelo
// Facebook Commerce Manager (catálogo "Imóveis MOTTA").
//
// URL final depois do deploy: https://mottacorretordeimoveis.com.br/feed-imoveis.xml
//
// Configure essa URL no Commerce Manager em:
// Catálogo > Fontes de dados > Adicionar fonte de dados > Programar feed

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = "https://mottacorretordeimoveis.com.br";

function mapPropertyType(categoria: string): string {
  const map: Record<string, string> = {
    casa: "house",
    apartamento: "apartment",
    terreno: "other",
    comercial: "other",
    rural: "other",
    galpao: "other",
    "sala-comercial": "other",
  };
  return map[categoria] ?? "other";
}

function escapeXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Remove resíduos de LaTeX (ex: "$113 \text{ m}^2$") que às vezes entram
// na descrição quando o texto é colado de outra ferramenta (Word, ChatGPT etc).
function cleanDescription(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\\text\{[^}]*\}/g, "") // remove \text{...}
    .replace(/\$[^$]*\$/g, (match) => match.replace(/[$\\]/g, "")) // remove $ e barras dentro de blocos $...$
    .replace(/\\[a-zA-Z]+/g, "") // remove outros comandos LaTeX tipo \frac, \cdot etc
    .replace(/\s{2,}/g, " ") // limpa espaços duplos deixados pela remoção
    .trim();
}

// Monta o endereço com fallback: usa o endereço completo se existir,
// senão junta bairro + cidade (melhor que mandar vazio pro Facebook).
function resolveAddr1(imovel: any): string {
  if (imovel.endereco && imovel.endereco.trim() !== "") {
    return imovel.endereco;
  }
  if (imovel.bairro && imovel.bairro.trim() !== "") {
    return `${imovel.bairro}, ${imovel.cidade || "Cruz Alta"}`;
  }
  return imovel.cidade || "Cruz Alta";
}

export async function GET() {
  const { data: imoveis, error } = await supabase
    .from("imoveis")
    .select("*")
    .eq("ativo", true);

  if (error) {
    return new NextResponse(`Erro ao buscar imóveis: ${error.message}`, {
      status: 500,
    });
  }

  const items = (imoveis ?? [])
    .map((imovel) => {
      const isVenda = imovel.tipo === "venda";
      const availability = isVenda ? "for_sale" : "for_rent";
      const listingType = isVenda ? "for_sale_by_agent" : "for_rent_by_agent";
      const propertyType = mapPropertyType(imovel.categoria);

      const price = imovel.mostrar_preco && imovel.preco
        ? `${imovel.preco} BRL`
        : `${imovel.preco ?? 0} BRL`;

      const images = (imovel.fotos ?? [])
        .map((url: string) => `      <image>\n        <url>${escapeXml(url)}</url>\n      </image>`)
        .join("\n");

      const numBaths = imovel.banheiros && imovel.banheiros > 0 ? imovel.banheiros : 1;
      const addr1 = resolveAddr1(imovel);
      const description = cleanDescription(imovel.descricao) || escapeXml(imovel.titulo);

      // Só inclui area_size/area_unit se a área realmente existir.
      // Campo vazio é pior que campo ausente — o Facebook rejeita <area_size></area_size>.
      const areaFields = imovel.area
        ? `      <area_size>${imovel.area}</area_size>\n      <area_unit>sq_m</area_unit>\n`
        : "";

      return `    <listing>
      <home_listing_id>${escapeXml(imovel.id)}</home_listing_id>
      <name>${escapeXml(imovel.titulo)}</name>
      <description>${escapeXml(description)}</description>
      <availability>${availability}</availability>
      <listing_type>${listingType}</listing_type>
      <property_type>${propertyType}</property_type>
      <price>${price}</price>
      <address format="simple">
        <component name="addr1">${escapeXml(addr1)}</component>
        <component name="city">${escapeXml(imovel.cidade || "Cruz Alta")}</component>
        <component name="region">Rio Grande do Sul</component>
        <component name="country">Brazil</component>
      </address>
      <neighborhood>${escapeXml(imovel.bairro || imovel.cidade || "Cruz Alta")}</neighborhood>
${images}
      <num_beds>${imovel.quartos ?? 0}</num_beds>
      <num_baths>${numBaths}</num_baths>
${areaFields}      <url>${SITE_URL}/imovel/${imovel.id}</url>
    </listing>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <title>Motta Corretor de Imóveis - Feed</title>
  <link rel="self" href="${SITE_URL}"/>
${items}
</listings>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

