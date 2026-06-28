import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── RedAyuda structured API handler ─────────────────────────────────────────

type RedAyudaRecord = {
  id: string
  kind: string
  category: string
  title: string
  description: string
  city: string | null
  state: string | null
  area: string | null
  contact: string | null
  status: string
  meta: {
    urgencia?: string
    cantidadNecesaria?: number
    cantidadComprometida?: number
    organizacion?: string
    verificada?: boolean
  } | null
  created_at: string
  source: string
}

const URGENCY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

async function fetchRedAyudaBlock(): Promise<{ block: string; status: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch('https://redayudavenezuela.com/api/data', {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'es-VE,es;q=0.9',
      },
    })
    clearTimeout(timer)

    if (!res.ok) return { block: '', status: `http_${res.status}` }

    const json = await res.json()
    const all: RedAyudaRecord[] = Array.isArray(json) ? json : (json.data ?? [])
    const active = all.filter(r => r.status === 'activo' && r.kind === 'necesidad')

    if (!active.length) return { block: '', status: 'empty' }

    // Group by zone (area + city + state)
    const byZone = new Map<string, RedAyudaRecord[]>()
    for (const item of active) {
      const zone = [item.area, item.city, item.state].filter(Boolean).join(', ') || 'Zona no especificada'
      if (!byZone.has(zone)) byZone.set(zone, [])
      byZone.get(zone)!.push(item)
    }

    const lines: string[] = [
      `=== NECESIDADES ACTIVAS — redayudavenezuela.com (${active.length} registros) ===`,
      '',
    ]

    // Sort zones by number of alta-urgency items descending
    const sortedZones = [...byZone.entries()].sort(([, a], [, b]) => {
      const altaA = a.filter(r => r.meta?.urgencia === 'alta').length
      const altaB = b.filter(r => r.meta?.urgencia === 'alta').length
      return altaB - altaA
    })

    for (const [zone, items] of sortedZones) {
      lines.push(`📍 ZONA: ${zone}`)

      // Sort by urgency within zone
      const sorted = [...items].sort((a, b) => {
        const ua = URGENCY_ORDER[a.meta?.urgencia ?? ''] ?? 2
        const ub = URGENCY_ORDER[b.meta?.urgencia ?? ''] ?? 2
        return ua - ub
      })

      for (const item of sorted.slice(0, 10)) {
        const urgencia = item.meta?.urgencia?.toUpperCase() ?? 'N/A'
        const needed = item.meta?.cantidadNecesaria ?? null
        const committed = item.meta?.cantidadComprometida ?? 0
        const remaining = needed !== null ? needed - committed : null
        const qtyStr = remaining !== null ? `necesita ${remaining} de ${needed}` : ''
        const org = item.meta?.organizacion ? `| Org: ${item.meta.organizacion}` : ''
        const contact = item.contact ? `| Contacto: ${item.contact}` : ''
        const verified = item.meta?.verificada ? '✓' : ''

        lines.push(
          `  [${urgencia}]${verified} ${item.title}${qtyStr ? ` (${qtyStr})` : ''} ${org} ${contact}`.trimEnd()
        )
      }

      if (items.length > 10) lines.push(`  ... y ${items.length - 10} necesidades más en esta zona`)
      lines.push('')
    }

    return { block: lines.join('\n').slice(0, 5000), status: `ok_${active.length}` }
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    return { block: '', status: `error_${msg.slice(0, 60)}` }
  }
}

// ─── Generic HTML scraper ─────────────────────────────────────────────────────

const UNSCRAPEBLE_PATTERNS = [
  'wa.me', 'whatsapp.com', 'instagram.com', 'facebook.com',
  't.me', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
  'docs.google.com', 'forms.gle', 'bit.ly', 'linktr.ee',
  'redayudavenezuela.com', // handled separately via API
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
  if (text.length < 120) return true
  const signals = ['__NEXT_DATA__', 'window.__', 'root"></div', 'app"></div']
  const matches = signals.filter(s => text.includes(s)).length
  const wordCount = text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, ' ').split(/\s+/).filter(w => w.length > 3).length
  return matches >= 2 && wordCount < 40
}

async function scrapeUrl(url: string): Promise<{ content: string; status: 'ok' | 'unscrapeble' | 'js-shell' | 'blocked' | 'error' }> {
  if (isUnscrapeableUrl(url)) return { content: '', status: 'unscrapeble' }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(9000),
    })

    if (res.status === 403 || res.status === 429 || res.status === 401) return { content: '', status: 'blocked' }
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Pre-fetch RedAyuda API in parallel with Supabase queries
  const [{ block: redAyudaBlock, status: redAyudaStatus }, { data: resources, error: resError }, { data: categories, error: catError }] =
    await Promise.all([
      fetchRedAyudaBlock(),
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

  // 2. Group by category, highest upvotes first, max 5 per category
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

  // 3. Scrape HTML URLs in parallel
  const allResources = [...grouped.values()].flatMap(g => g.resources)
  const scrapeResults = await Promise.allSettled(allResources.map(r => scrapeUrl(r.url)))
  const webContent = new Map<string, { content: string; status: string }>()
  allResources.forEach((r, i) => {
    const result = scrapeResults[i]
    webContent.set(r.url, result.status === 'fulfilled' ? result.value : { content: '', status: 'error' })
  })

  // 4. Build prompt sections per category
  const sections: string[] = []
  for (const [, group] of grouped) {
    let section = `### CATEGORÍA: ${group.name} (slug: ${group.slug})\n`
    for (const r of group.resources) {
      const scraped = webContent.get(r.url) ?? { content: '', status: 'error' }
      const votes = r.upvotes ?? 0

      section += `\n[Recurso${votes > 0 ? ` — ${votes} votos` : ''}]\n`
      section += `Título: ${r.title ?? r.url}\nURL: ${r.url}\n`
      if (r.description) section += `Descripción: ${r.description}\n`

      if (scraped.status === 'ok' && scraped.content) {
        section += `Contenido extraído:\n${scraped.content}\n`
      } else if (scraped.status === 'unscrapeble') {
        section += `[Enlace directo — no se puede extraer contenido automáticamente]\n`
        // Inject RedAyuda structured data for that domain
        if (r.url.includes('redayudavenezuela.com') && redAyudaBlock) {
          section += redAyudaBlock + '\n'
        }
      } else if (scraped.status === 'js-shell') {
        section += `[App JavaScript — contenido cargado dinámicamente, no disponible para scraping]\n`
      } else if (scraped.status === 'blocked') {
        section += `[Sitio bloqueó el acceso — usar solo título y descripción]\n`
      }
    }
    sections.push(section)
  }

  const resourcesBlock = sections.join('\n---\n').slice(0, 28000)

  // 5. Claude call
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `Eres un analista de crisis humanitaria para el terremoto en Venezuela 2025.

Analiza los recursos por categoría. Cuando encuentres datos de "redayudavenezuela.com" (formato estructurado con zonas, cantidades y contactos), úsalos como fuente primaria — son datos verificados y específicos.

INSTRUCCIONES DE ANÁLISIS:
- Zonas: nombres exactos (barrio, municipio, estado) — "Centro Plaza, Altamira, Caracas" no "Caracas"
- Materiales: artículo + cantidad pendiente si disponible — "Cuerdas de rapel: 3 unidades (Edif. Petunia)"
- Warnings: riesgos reales mencionados, urgencias altas sin cubrir
- Tips: contactos con número de teléfono si existen, pasos de acción concretos

Prioriza siempre urgencia "ALTA" sobre "MEDIA" o "BAJA".
Si no hay datos concretos para un campo, usa []. No inventes nada.

Responde ÚNICAMENTE JSON (sin bloques de código):
{
  "mega_synthesis": "2-3 frases con zonas y necesidades específicas más urgentes ahora mismo",
  "category_summaries": [
    {
      "category": "nombre exacto de la categoría",
      "slug": "slug-categoria",
      "zones": ["Zona exacta — qué ocurre o qué se necesita ahí"],
      "materials": ["Artículo específico con cantidad y organización si disponible"],
      "warnings": ["Advertencia concreta con zona y contexto"],
      "tips": ["Acción concreta: qué hacer, número de contacto, dónde ir"]
    }
  ],
  "conclusions": "3-4 oraciones: zonas más críticas identificadas hoy, tipos de ayuda más urgentes, prioridades de acción"
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

  let parsed: { mega_synthesis: string; category_summaries: CategorySummary[]; conclusions: string }

  try {
    const raw = (message.content[0] as { type: string; text: string }).text
    parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    parsed = {
      mega_synthesis: 'Análisis generado automáticamente.',
      category_summaries: [],
      conclusions: 'No se pudo estructurar el análisis.',
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
    redayuda_status: redAyudaStatus,
  })
}
