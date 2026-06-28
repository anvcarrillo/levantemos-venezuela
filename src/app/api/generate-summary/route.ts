import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── AyudaEnCamino API ────────────────────────────────────────────────────────

type AyudaEnCaminoNeed = {
  id: number
  orgId: number
  nombreArticulo: string
  categoria: string
  descripcion: string
  cantidadNecesaria: number
  cantidadComprometida: number
  cantidadCumplida: number
  urgencia: string
  status: string
  createdAt: string
  updatedAt: string
  organizacion: {
    id: number
    nombre: string
    tipo: string
    estado: string
    ciudad: string
    direccion: string
    contactoNombre: string | null
    contactoTelefono: string | null
    contactoEmail: string | null
    verificada: boolean
  }
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'es-VE,es;q=0.9',
  'Referer': 'https://ayudaencamino.com/organizaciones',
}

async function fetchAyudaEnCaminoBlock(): Promise<{ block: string; status: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const [activaRes, parcialRes] = await Promise.allSettled([
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa', {
        cache: 'no-store', signal: controller.signal, headers: FETCH_HEADERS,
      }),
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial', {
        cache: 'no-store', signal: controller.signal, headers: FETCH_HEADERS,
      }),
    ])
    clearTimeout(timer)

    const all: AyudaEnCaminoNeed[] = []
    if (activaRes.status === 'fulfilled' && activaRes.value.ok) {
      all.push(...(await activaRes.value.json() as AyudaEnCaminoNeed[]))
    }
    if (parcialRes.status === 'fulfilled' && parcialRes.value.ok) {
      all.push(...(await parcialRes.value.json() as AyudaEnCaminoNeed[]))
    }

    if (!all.length) return { block: '', status: 'empty' }

    // Deduplicate by id
    const seen = new Set<number>()
    const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })

    // Group by organization
    const byOrg = new Map<number, { org: AyudaEnCaminoNeed['organizacion']; needs: AyudaEnCaminoNeed[] }>()
    for (const need of unique) {
      if (!byOrg.has(need.orgId)) byOrg.set(need.orgId, { org: need.organizacion, needs: [] })
      byOrg.get(need.orgId)!.needs.push(need)
    }

    // Sort orgs by critical item count descending
    const sortedOrgs = [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length)

    const lines: string[] = [
      `=== NECESIDADES CRÍTICAS — ayudaencamino.com (${unique.length} items · ${sortedOrgs.length} organizaciones) ===`,
      '',
    ]

    for (const { org, needs } of sortedOrgs) {
      const tipo = org.tipo.replace(/_/g, ' ')
      lines.push(`📍 ${org.nombre} [${tipo}]${org.verificada ? ' ✓verificada' : ''}`)
      lines.push(`   Dirección: ${org.direccion} · ${org.ciudad}, ${org.estado}`)
      const contacto = [org.contactoNombre, org.contactoTelefono].filter(Boolean).join(' · ')
      if (contacto) lines.push(`   Contacto: ${contacto}`)
      lines.push(`   Necesidades (urgencia crítica):`)

      for (const need of needs) {
        const remaining = need.cantidadNecesaria - need.cantidadComprometida - need.cantidadCumplida
        const tag = need.status === 'parcial' ? 'PARCIAL' : 'ACTIVA'
        const desc = need.descripcion ? ` — ${need.descripcion}` : ''
        lines.push(`   • [${tag}] ${need.nombreArticulo}: ${remaining} pendientes de ${need.cantidadNecesaria}${desc}`)
      }
      lines.push('')
    }

    return { block: lines.join('\n').slice(0, 7000), status: `ok_${unique.length}_items` }
  } catch (err) {
    clearTimeout(timer)
    return { block: '', status: `error_${String(err).slice(0, 80)}` }
  }
}

// ─── Generic HTML scraper ─────────────────────────────────────────────────────

const UNSCRAPEBLE_DOMAINS = [
  'wa.me', 'whatsapp.com', 'instagram.com', 'facebook.com',
  't.me', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com',
  'docs.google.com', 'forms.gle', 'bit.ly', 'linktr.ee',
  'ayudaencamino.com',    // handled via API above
  'redayudavenezuela.com', // handled via API when available
]

function isUnscrapeableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    return UNSCRAPEBLE_DOMAINS.some(p => host.includes(p))
  } catch { return true }
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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 9000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timer)

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
type CategoryGroup = { name: string; slug: string; resources: RawResource[] }

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Parallel: AyudaEnCamino API + Supabase resources + categories
  const [
    { block: ayudaBlock, status: ayudaStatus },
    { data: resources, error: resError },
    { data: categories, error: catError },
  ] = await Promise.all([
    fetchAyudaEnCaminoBlock(),
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
    if (!grouped.has(r.category_id)) grouped.set(r.category_id, { name: cat.name, slug: cat.slug, resources: [] })
    const group = grouped.get(r.category_id)!
    if (group.resources.length < 5) group.resources.push(r)
  }

  if (grouped.size === 0) return NextResponse.json({ error: 'No categorized resources' }, { status: 400 })

  // 3. Scrape generic HTML URLs in parallel (excludes ayudaencamino.com / social)
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

    // Inject structured AyudaEnCamino data for the volunteer coordination category
    if (group.slug === 'coordinacion-voluntarios' && ayudaBlock) {
      section += '\n' + ayudaBlock + '\n'
    }

    for (const r of group.resources) {
      // Skip ayudaencamino URLs — already handled via API block above
      if (r.url.includes('ayudaencamino.com')) continue

      const scraped = webContent.get(r.url) ?? { content: '', status: 'error' }
      const votes = r.upvotes ?? 0
      section += `\n[Recurso${votes > 0 ? ` — ${votes} votos` : ''}]\n`
      section += `Título: ${r.title ?? r.url}\nURL: ${r.url}\n`
      if (r.description) section += `Descripción: ${r.description}\n`

      if (scraped.status === 'ok' && scraped.content) {
        section += `Contenido extraído:\n${scraped.content}\n`
      } else if (scraped.status === 'unscrapeble') {
        section += `[Enlace directo sin contenido extraíble — redes sociales/WhatsApp]\n`
      } else if (scraped.status === 'js-shell') {
        section += `[Aplicación JavaScript — contenido no disponible para scraping]\n`
      } else if (scraped.status === 'blocked') {
        section += `[Sitio bloqueó el acceso automático]\n`
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

Analiza los recursos organizados por categoría. Para "Coordinación de Voluntarios" tendrás datos estructurados de ayudaencamino.com con organizaciones verificadas, direcciones exactas, contactos y cantidades pendientes — úsalos como fuente primaria y sé muy específico.

REGLAS:
- Zonas: nombres exactos con dirección si está disponible (ej: "Hospital Pérez Carreño, La Yaguara, Caracas")
- Materiales: artículo + cantidad pendiente + organización (ej: "Dermalon 3-0: 10 unidades — Tu Protocolo Venezuela")
- Warnings: necesidades críticas sin cubrir (status ACTIVA = sin ningún compromiso aún)
- Tips: contacto directo con teléfono si existe (ej: "Contactar a Katerine Falcon · 04244948304")
- Si una categoría no tiene datos concretos para un campo, usa []
- No inventes nada — solo usa lo que está en los datos

Responde ÚNICAMENTE JSON válido (sin bloques de código):
{
  "mega_synthesis": "2-3 frases con zonas y necesidades específicas más urgentes ahora mismo",
  "category_summaries": [
    {
      "category": "nombre exacto de la categoría",
      "slug": "slug-categoria",
      "zones": ["Nombre org/lugar — dirección exacta o barrio/municipio/estado"],
      "materials": ["Artículo: cantidad pendiente — Organización (si disponible)"],
      "warnings": ["Necesidad crítica urgente sin cubrir, con contexto de zona"],
      "tips": ["Acción concreta: nombre de contacto · teléfono o instrucción específica"]
    }
  ],
  "conclusions": "3-4 oraciones: organizaciones más críticas identificadas hoy, tipos de ayuda más urgentes, dónde ir o a quién contactar"
}

RECURSOS POR CATEGORÍA:
${resourcesBlock}`,
      },
    ],
  })

  // 6. Parse
  type CategorySummary = { category: string; slug: string; zones: string[]; materials: string[]; warnings: string[]; tips: string[] }
  let parsed: { mega_synthesis: string; category_summaries: CategorySummary[]; conclusions: string }

  try {
    const raw = (message.content[0] as { type: string; text: string }).text
    parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    parsed = { mega_synthesis: 'Análisis generado automáticamente.', category_summaries: [], conclusions: 'No se pudo estructurar el análisis.' }
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

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    id: data.id,
    categories_analyzed: parsed.category_summaries.length,
    ayuda_status: ayudaStatus,
  })
}
