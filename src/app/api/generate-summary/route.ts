import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function scrapeUrl(url: string, title: string, description: string): Promise<string> {
  let webContent = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LevantandoVenezuela/1.0)' },
    })
    clearTimeout(timeout)
    if (res.ok) {
      const html = await res.text()
      webContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200)
    }
  } catch {
    // URL not scrapeable (WhatsApp, social media, etc.) — use metadata only
  }

  const parts = [`Título: ${title}`]
  if (description) parts.push(`Descripción: ${description}`)
  if (webContent) parts.push(`Contenido web: ${webContent}`)
  return parts.join('\n')
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch active resources
  const { data: resources, error: resourcesError } = await supabaseAdmin
    .from('resources')
    .select('url, title, description')
    .or('status.eq.active,status.is.null')
    .limit(40)

  if (resourcesError || !resources?.length) {
    return NextResponse.json({ error: 'No resources found' }, { status: 400 })
  }

  // 2. Scrape each URL (in parallel, capped at 40)
  const scraped = await Promise.allSettled(
    resources.map(r => scrapeUrl(r.url, r.title ?? r.url, r.description ?? ''))
  )

  const content = scraped
    .filter(r => r.status === 'fulfilled')
    .map((r, i) => `[Recurso ${i + 1}]\n${(r as PromiseFulfilledResult<string>).value}`)
    .join('\n\n---\n\n')
    .slice(0, 22000)

  // 3. Call Claude Haiku
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Eres un asistente analizando la crisis del terremoto en Venezuela 2025.

Analiza los siguientes recursos (títulos, descripciones y contenido web disponible) y extrae información específica sobre necesidades actuales.

Genera ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "mega_synthesis": "Una o dos frases que capturen lo más urgente y crítico en este momento",
  "volunteers_needed": [
    {"zone": "nombre de zona o ciudad", "details": "qué tipo de voluntarios y para qué tarea específica"}
  ],
  "donations_needed": [
    {"location": "lugar o zona", "items": ["artículo 1", "artículo 2", "artículo 3"]}
  ],
  "conclusions": "Párrafo corto (3-4 oraciones) con las conclusiones del análisis del día: situación general, zonas más afectadas, prioridades"
}

Si no hay información suficiente para algún campo usa [] o una nota genérica. No inventes datos. Responde SOLO con el JSON, sin bloques de código ni texto adicional.

RECURSOS:
${content}`,
      },
    ],
  })

  // 4. Parse response
  let parsed: {
    mega_synthesis: string
    volunteers_needed: { zone: string; details: string }[]
    donations_needed: { location: string; items: string[] }[]
    conclusions: string
  }

  try {
    const raw = (message.content[0] as { type: string; text: string }).text
    parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    parsed = {
      mega_synthesis: 'Análisis generado automáticamente en base a los recursos disponibles.',
      volunteers_needed: [],
      donations_needed: [],
      conclusions: 'No se pudo estructurar el análisis en este momento.',
    }
  }

  // 5. Save to daily_summary
  const { data, error: insertError } = await supabaseAdmin
    .from('daily_summary')
    .insert({
      mega_synthesis: parsed.mega_synthesis,
      volunteers_needed: parsed.volunteers_needed,
      donations_needed: parsed.donations_needed,
      conclusions: parsed.conclusions,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}
