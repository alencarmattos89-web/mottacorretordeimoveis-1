// AVISO: Este cliente não gerencia cookies de sessão SSR.
// Prefira lib/supabase-server.ts em Server Components e lib/supabase-browser.ts em Client Components.
// Este arquivo é mantido para compatibilidade com app/sitemap.ts e app/page.tsx (leitura pública sem auth).

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)