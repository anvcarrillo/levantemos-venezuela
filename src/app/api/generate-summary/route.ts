import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Domains that never serve useful content via fetch
const UNSCRAPEBLE_PATTERNS = [
  'wa.me', 'whatsapp.com', 'instagram.com', 'facebook.com',
  't.me', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
  'docs.google.com', 'forms.gle', 'bit.ly', 'linktr.ee',
]

function isUnscrapeableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    return UNSCRAPEBLE_PATTERNS.some(p => host.includes(p))
  } catch {
    return true
  }
}

function isJsShell(text: string): boolean {
  // Detects React/Vue/Next.js app shells that rendered no real content
  if (text.length < 120) return true
  const jsShellSignals = ['__NEXT_DATA__', 'window.__', 'noscript', 'root"></div', 'app"></div']
  const matches = jsShellSignals.filter(s => text.includes(s)).length
  // If 2+ JS signals and very little actual text words
  const wordCount = text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]/g, ' ').split(/\s+/).filter(w => w.length > 3).length
  return matches >= 2 && wordCount < 40
}

async function scrapeUrl(url: string): Promise<{ content: string; status: 'ok' | 'unscrapeble' | 'js-shell' | 'blocked' | 'error' }> {
  if (isUnscrapeableUrl(url)) return { content: '', status: 'unscrapeble' }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timeout)

    if (res.status === 403 || res.status === 429 || res.status === 401) {
      return { content: '', status: 'blocked' }
    }

    if (!res.ok) return { content: '', status: 'error' }

    const html = await res.text()
    const text = html
      .replace(/<(script|style|nav|footer|header|aside|noscript)[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (isJsShell(text)) return { content: '', status: 'js-shell' }

    return { content: text.slice(0, 1800), status: 'ok' }
  } catch {
    return { content: '', status: 'error' }
  }
}

type RawResource = {
  url: string
  title: string | null
  description: string | null
  category_id: number | null
  upvotes: number | null
}

type Category = { id: number; name: string; slug: string }

type CategoryGroup = {
  name: string
  slug: string
  resources: RawResource[]
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch resources sorted by upvotes descending so highest-rated get priority
  const [{ data: resources, error: resError }, { data: categories, error: catError }] =
    await Promise.all([
      supabaseAdmin
        .from('resources')
        .select('url, title, description, category_id, upvotes')
        .or('status.eq.active,status.is.null')
        .order('upvotes', { ascending: false, nullsFirst: false })
        .limit(100),
      supabaseAdmin.from('resources_categories').select('id, name, slug'),
    ])

  if (resError || catError || !resources?.length) {
    return NextResponse.json({ error: resError?.message ?? catError?.message ?? 'No resources' }, { status: 400 })
  }

  // 2. Group by category, max 5 per category (highest upvotes first)
  const catMap = new Map<number, Category>()
  for (const c of (categories as Category[]) ?? []) catMap.set(c.id, c)

  const grouped = new Map<number, CategoryGroup>()
  for (const r of resources as RawResource[]) {
    if (!r.category_id) continue
    const cat = catMap.get(r.category_id)
    if (!cat) continue
    if (!grouped.has(r.category_id)) {
      grouped.set(r.category_id, { name: cat.name, slug: cat.slug, resources: [] })
    }
    const group = grouped.get(r.category_id)!
    if (group.resources.length < 5) group.resources.push(r)
  }

  if (grouped.size === 0) {
    return NextResponse.json({ error: 'No categorized resources' }, { status: 400 })
  }

  // 3. Scrape all URLs in parallel
  const allResources = [...grouped.values()].flatMap(g => g.resources)
  const scrapeResults = await Promise.allSettled(allResources.map(r => scrapeUrl(r.url)))

  const webContent = new Map<string, { content: string; status: string }>()
  allResources.forEach((r, i) => {
    const result = scrapeResults[i]
    webContent.set(r.url, result.status === 'fulfilled' ? result.value : { content: '', status: 'error' })
  })

  // 4. Build prompt organized by category
  const sections: string[] = []
  for (const [, group] of grouped) {
    let section = `### CATEGORÍA: ${group.name} (slug: ${group.slug})\n`
    for (const r of group.resources) {
      const scraped = webContent.get(r.url) ?? { content: '', status: 'error' }
      const votes = r.upvotes ?? 0

      section += `\n[Recurso${votes > 0 ? ` — ${votes} votos` : ''}]\n`
      section += `Título: ${r.title ?? r.url}\n`
      section += `URL: ${r.url}\n`
      if (r.description) section += `Descripción: ${r.description}\n`

      if (scraped.status === 'ok' && scraped.content) {
        section += `Contenido web extraído:\n${scraped.content}\n`
      } else if (scraped.status === 'unscrapeble') {
        section += `[Enlace directo — WhatsApp/Instagram/redes sociales, no es posible extraer contenido]\n`
      } else if (scraped.status === 'js-shell') {
        section += `[Página cargada dinámicamente con JavaScript — solo se tiene el título y descripción del directorio]\n`
      } else if (scraped.status === 'blocked') {
        section += `[Sitio bloqueó el acceso automático — usar solo título y descripción]\n`
      }
    }
    sections.push(section)
  }

  const resourcesBlock = sections.join('\n---\n').slice(0, 26000)

  // 5. Claude Haiku call
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `Eres un analista de crisis humanitaria analizando la respuesta al terremoto en Venezuela 2025.

Analiza los siguientes recursos organizados por categoría. Para cada categoría extrae SOLO información que aparezca explícitamente en los textos — no inventes nada.

Prioriza siempre los recursos con más votos (indicados como "X votos").

Sé ESPECÍFICO y CONCRETO:
- Zonas: nombres reales de barrios, municipios, estados (ej: "Petare, Miranda", "El Hatillo, Caracas")
- Materiales: artículos exactos con cantidades si están disponibles (ej: "agua potable 1.5L", "pañales talla 3")
- Advertencias: riesgos reales mencionados (ej: "no ingresar a zona X por riesgo de derrumbe")
- Consejos: pasos concretos (ej: "llamar al 0212-XXX antes de ir", "llevar EPP obligatorio")

Si un recurso dice "[Bloqueado]", "[JS]" o "[WhatsApp]" usa SOLO el título y descripción disponibles.
Si no hay información concreta para un campo, usa [].

Responde ÚNICAMENTE JSON válido con esta estructura (sin bloques de código):
{
  "mega_synthesis": "2-3 frases que mencionen zonas y necesidades específicas más urgentes ahora",
  "category_summaries": [
    {
      "category": "nombre exacto de la categoría",
      "slug": "slug-categoria",
      "zones": [
        "Nombre de zona/barrio/municipio — qué se necesita o qué ocurre ahí"
      ],
      "materials": [
        "Artículo específico con cantidad o contexto si se menciona"
      ],
      "warnings": [
        "Advertencia concreta para voluntarios o donantes"
      ],
      "tips": [
        "Paso concreto de acción: qué hacer, cómo contactar, dónde ir"
      ]
    }
  ],
  "conclusions": "Párrafo de 3-4 oraciones: zonas más críticas identificadas, tipos de ayuda más necesitados, qué hacer hoy"
}

RECURSOS POR CATEGORÍA:
${resourcesBlock}`,
      },
    ],
  })

  // 6. Parse
  type CategorySummary = {
    category: string
    slug: string
    zones: string[]
    materials: string[]
    warnings: string[]
    tips: string[]
  }

  let parsed: {
    mega_synthesis: string
    category_summaries: CategorySummary[]
    conclusions: string
  }

  try {
    const raw = (message.content[0] as { type: string; text: string }).text
    parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    parsed = {
      mega_synthesis: 'Análisis generado automáticamente en base a los recursos disponibles.',
      category_summaries: [],
      conclusions: 'No se pudo estructurar el análisis en este momento.',
    }
  }

  // 7. Save
  const { data, error: insertError } = await supabaseAdmin
    .from('daily_summary')
    .insert({
      mega_synthesis: parsed.mega_synthesis,
      volunteers_needed: [],
      donations_needed: [],
      category_summaries: parsed.category_summaries,
      conclusions: parsed.conclusions,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    id: data.id,
    categories_analyzed: parsed.category_summaries.length,
  })
}
