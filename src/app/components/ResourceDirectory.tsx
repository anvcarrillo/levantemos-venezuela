'use client'

import { useState, useMemo } from 'react'
import type { Category, Resource } from '@/lib/supabase'
import ResourceCard from './ResourceCard'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const FILTERS = [
  {
    label: 'Reportes',
    test: (name: string) => norm(name).startsWith('reporte'),
  },
  {
    label: 'Profesionales',
    test: (name: string) => norm(name).startsWith('profesional'),
  },
  {
    label: 'Coordinacion',
    test: (name: string) => norm(name).startsWith('coordinac'),
  },
  {
    label: 'Informacion',
    test: (name: string) =>
      !norm(name).startsWith('reporte') &&
      !norm(name).startsWith('profesional') &&
      !norm(name).startsWith('coordinac'),
  },
]

const FILTER_STYLES: Record<string, { active: string; inactive: string }> = {
  Reportes: {
    active: 'bg-[#CF0921] border-[#CF0921] text-white shadow-sm',
    inactive: 'bg-white border-gray-200 text-[#CF0921] hover:border-[#CF0921] hover:bg-red-50',
  },
  Profesionales: {
    active: 'bg-[#003DA5] border-[#003DA5] text-white shadow-sm',
    inactive: 'bg-white border-gray-200 text-[#003DA5] hover:border-[#003DA5] hover:bg-blue-50',
  },
  Coordinacion: {
    active: 'bg-[#FCD116] border-[#FCD116] text-gray-900 shadow-sm',
    inactive: 'bg-white border-gray-200 text-amber-700 hover:border-[#FCD116] hover:bg-yellow-50',
  },
  Informacion: {
    active: 'bg-gray-700 border-gray-700 text-white shadow-sm',
    inactive: 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50',
  },
}

export default function ResourceDirectory({
  categories,
  resources,
}: {
  categories: Category[]
  resources: Resource[]
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const visibleCategories = useMemo(() => {
    if (!activeFilter) return categories
    const tab = FILTERS.find(f => f.label === activeFilter)
    return tab ? categories.filter(cat => tab.test(cat.name)) : categories
  }, [categories, activeFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return resources
    return resources.filter(r =>
      [r.title, r.description, r.url, r.url_normalized]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(q))
    )
  }, [resources, search])

  const grouped = useMemo(
    () =>
      visibleCategories
        .map(cat => ({
          category: cat,
          resources: filtered.filter(r => r.category_id === cat.id),
        }))
        .filter(g => g.resources.length > 0),
    [visibleCategories, filtered]
  )

  const uncategorized = useMemo(
    () =>
      !activeFilter
        ? filtered.filter(r => !categories.some(cat => cat.id === r.category_id))
        : [],
    [filtered, categories, activeFilter]
  )

  const hasAny = grouped.length > 0 || uncategorized.length > 0

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(f => {
          const isActive = activeFilter === f.label
          const styles = FILTER_STYLES[f.label]
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(isActive ? null : f.label)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                isActive ? styles.active : styles.inactive
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          placeholder="Buscar recursos por nombre, descripción o URL…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5] bg-white"
        />
      </div>

      {/* Category anchors */}
      {grouped.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {grouped.map(({ category }) => (
            <a
              key={category.id}
              href={`#${category.slug}`}
              className="text-xs bg-white border border-[#003DA5]/25 rounded-full px-3 py-1 text-[#003DA5] hover:bg-blue-50 hover:border-[#003DA5] transition-colors"
            >
              {category.name}
            </a>
          ))}
        </div>
      )}

      {!hasAny ? (
        <p className="text-center py-20 text-gray-400">
          {search
            ? 'Sin resultados para esa búsqueda.'
            : activeFilter
            ? `No hay recursos en "${activeFilter}" aún.`
            : 'No hay recursos aún.'}
        </p>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ category, resources }) => (
            <section key={category.id} id={category.slug} className="scroll-mt-20">
              <h2 className="text-sm font-bold text-[#003DA5] uppercase tracking-wider mb-4 pb-2 border-b-2 border-[#FCD116]">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </section>
          ))}

          {uncategorized.length > 0 && (
            <section id="sin-categoria" className="scroll-mt-20">
              <h2 className="text-sm font-bold text-[#003DA5] uppercase tracking-wider mb-4 pb-2 border-b-2 border-[#FCD116]">
                Recursos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uncategorized.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
