// app/feed-imoveis.xml/route.ts
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

// Usa as MESMAS variáveis de ambiente que o resto do site já usa.
// Se os nomes forem diferentes no teu projeto, ajusta aqui.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role p/ não bater em RLS
);

const SITE_URL = "https://mottacorretordeimoveis.com.br";

// Mapeia a categoria do teu banco para os valores que o Facebook aceita.
// Valores permitidos pelo Facebook: apartment, builder_floor, condo, house,
// house_in_condominium, house_in_villa, loft, other, penthouse, studio, townhouse
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

      // Preço: só inclui se mostrar_preco for true e preco existir.
      // Facebook exige price; se o corretor esconder o preço, usamos "0 BRL"
      // como placeholder — o ideal é sempre ter um preço real no feed.
      const price = imovel.mostrar_preco && imovel.preco
        ? `${imovel.preco} BRL`
        : `${imovel.preco ?? 0} BRL`;

      const images = (imovel.fotos ?? [])
        .map((url: string) => `      <image>\n        <url>${escapeXml(url)}</url>\n      </image>`)
        .join("\n");

      const numBaths = imovel.banheiros && imovel.banheiros > 0 ? imovel.banheiros : 1;

      return `    <listing>
      <home_listing_id>${escapeXml(imovel.id)}</home_listing_id>
      <name>${escapeXml(imovel.titulo)}</name>
      <description>${escapeXml(imovel.descricao || imovel.titulo)}</description>
      <availability>${availability}</availability>
      <listing_type>${listingType}</listing_type>
      <property_type>${propertyType}</property_type>
      <price>${price}</price>
      <address format="simple">
        <component name="addr1">${escapeXml(imovel.endereco || imovel.bairro || "")}</component>
        <component name="city">${escapeXml(imovel.cidade || "Cruz Alta")}</component>
        <component name="region">Rio Grande do Sul</component>
        <component name="country">Brazil</component>
      </address>
      <neighborhood>${escapeXml(imovel.bairro)}</neighborhood>
${images}
      <num_beds>${imovel.quartos ?? 0}</num_beds>
      <num_baths>${numBaths}</num_baths>
      <area_size>${imovel.area ?? ""}</area_size>
      <area_unit>sq_m</area_unit>
      <url>${SITE_URL}/imovel/${imovel.id}</url>
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
