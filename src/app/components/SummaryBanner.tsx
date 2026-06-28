'use client'

import { useEffect, useState } from 'react'

type CategorySummary = {
  category: string
  slug: string
  zones: string[]
  materials: string[]
  warnings: string[]
  tips: string[]
}

function timeAgo(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 2) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)} días`
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <ul className="space-y-0.5 mt-1">
      {items.slice(0, 3).map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
          <span className="text-xs text-gray-600 leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CategoryCard({ cat }: { cat: CategorySummary }) {
  const hasData = cat.zones.length || cat.materials.length || cat.warnings.length || cat.tips.length
  if (!hasData) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="border-l-[3px] border-[#FCD116] pl-2">
        <p className="text-xs font-bold text-[#003DA5] leading-tight">{cat.category}</p>
      </div>

      {cat.zones.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Zonas</p>
          <BulletList items={cat.zones} color="bg-[#003DA5]" />
        </div>
      )}

      {cat.materials.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Materiales</p>
          <BulletList items={cat.materials} color="bg-[#CF0921]" />
        </div>
      )}

      {cat.warnings.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Advertencias</p>
          <BulletList items={cat.warnings} color="bg-amber-500" />
        </div>
      )}

      {cat.tips.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Consejos</p>
          <BulletList items={cat.tips} color="bg-emerald-500" />
        </div>
      )}
    </div>
  )
}

export default function SummaryBanner({
  megaSynthesis,
  createdAt,
  categorySummaries = [],
}: {
  megaSynthesis: string
  createdAt: string
  categorySummaries?: CategorySummary[]
}) {
  const [ago, setAgo] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setAgo(timeAgo(createdAt))
    const interval = setInterval(() => setAgo(timeAgo(createdAt)), 60000)
    return () => clearInterval(interval)
  }, [createdAt])

  const activeCats = categorySummaries.filter(
    c => c.zones.length || c.materials.length || c.warnings.length || c.tips.length
  )

  return (
    <div className="bg-white border-2 border-[#003DA5] rounded-2xl overflow-hidden mb-10 shadow-sm">
      {/* Header + synthesis */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-2.5 rounded-full overflow-hidden w-8">
              <div className="flex-1 bg-[#FCD116]" />
              <div className="flex-1 bg-[#003DA5]" />
              <div className="flex-1 bg-[#CF0921]" />
            </div>
            <span className="text-sm font-bold text-[#003DA5] uppercase tracking-wide">
              ¿Qué se necesita ahora?
            </span>
          </div>
          {ago && <span className="text-xs text-gray-400">Actualizado {ago}</span>}
        </div>

        <p className="text-gray-800 text-base leading-relaxed font-medium">{megaSynthesis}</p>
      </div>

      {/* Category grid — collapsible */}
      {activeCats.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50 border-t border-gray-200 text-sm font-semibold text-[#003DA5] hover:bg-gray-100 transition-colors"
          >
            <span>Ver resumen por categoría ({activeCats.length})</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expanded && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeCats.map((cat, i) => (
                  <CategoryCard key={i} cat={cat} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Download button */}
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <a
          href="/api/summary-image"
          download="resumen-levantando-venezuela.png"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#003DA5] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar resumen para compartir
        </a>
      </div>
    </div>
  )
}
