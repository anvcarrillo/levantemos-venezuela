import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function scrapeUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LevantandoVenezuela/1.0)' },
    })
    clearTimeout(timeout)
    if (res.ok) {
      const html = await res.text()
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600)
    }
  } catch {
    // not scrapeable (WhatsApp, social media, etc.)
  }
  return ''
}

type RawResource = {
  url: string
  title: string | null
  description: string | null
  category_id: number | null
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

  // 1. Fetch resources + categories separately (avoids FK join issues)
  const [{ data: resources, error: resError }, { data: categories, error: catError }] =
    await Promise.all([
      supabaseAdmin
        .from('resources')
        .select('url, title, description, category_id')
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .limit(80),
      supabaseAdmin.from('resources_categories').select('id, name, slug'),
    ])

  if (resError || catError || !resources?.length) {
    return NextResponse.json({ error: resError?.message ?? catError?.message ?? 'No resources' }, { status: 400 })
  }

  // 2. Group resources by category, max 4 per category
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
    if (group.resources.length < 4) group.resources.push(r)
  }

  if (grouped.size === 0) {
    return NextResponse.json({ error: 'No categorized resources' }, { status: 400 })
  }

  // 3. Scrape all URLs in parallel
  const allResources = [...grouped.values()].flatMap(g => g.resources)
  const scraped = await Promise.allSettled(allResources.map(r => scrapeUrl(r.url)))
  const webContent = new Map<string, string>()
  allResources.forEach((r, i) => {
    const result = scraped[i]
    webContent.set(r.url, result.status === 'fulfilled' ? result.value : '')
  })

  // 4. Build prompt organized by category
  const sections: string[] = []
  for (const [, group] of grouped) {
    let section = `### CATEGORÍA: ${group.name}\n`
    for (const r of group.resources) {
      const web = webContent.get(r.url) ?? ''
      section += `\n[Recurso]\nTítulo: ${r.title ?? r.url}\n`
      if (r.description) section += `Descripción: ${r.description}\n`
      if (web) section += `Contenido web: ${web}\n`
    }
    sections.push(section)
  }

  const resourcesBlock = sections.join('\n---\n').slice(0, 22000)

  // 5. Claude Haiku call
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Eres un asistente analizando la crisis del terremoto en Venezuela 2025.
Analiza los recursos organizados por categoría y extrae información concreta y accionable.

Responde ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "mega_synthesis": "2-3 frases que capturen las necesidades más urgentes de hoy",
  "category_summaries": [
    {
      "category": "nombre de la categoría",
      "slug": "slug-categoria",
      "zones": ["zona o dirección concreta con contexto útil"],
      "materials": ["artículo específico requerido"],
      "warnings": ["advertencia importante para voluntarios o donantes"],
      "tips": ["consejo práctico para actuar correctamente"]
    }
  ],
  "conclusions": "Párrafo de 3-4 oraciones: situación general, zonas más críticas y prioridades del día"
}

Reglas:
- Sé específico: menciona lugares, cantidades, contactos si los hay
- Si una categoría no tiene datos para un campo, usa []
- No inventes datos que no estén en los recursos
- Solo el JSON, sin bloques de código ni texto extra

RECURSOS POR CATEGORÍA:
${resourcesBlock}`,
      },
    ],
  })

  // 6. Parse Claude response
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

  // 7. Save to daily_summary
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
