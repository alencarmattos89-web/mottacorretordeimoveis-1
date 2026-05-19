import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motta Corretor de Imóveis — Panambi e Região",
  description: "Imóveis de alto padrão em Panambi e região. Venda, aluguel e consultoria. CRECI 12.857.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
