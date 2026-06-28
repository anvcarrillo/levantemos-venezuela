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
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(isActive ? null : f.label)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Category anchors */}
      {grouped.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {grouped.map(({ category }) => (
            <a
              key={category.id}
              href={`#${category.slug}`}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
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
              <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                {category.name}
              </h2>
              <div className="space-y-2">
                {resources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </section>
          ))}

          {uncategorized.length > 0 && (
            <section id="sin-categoria" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                Recursos
              </h2>
              <div className="space-y-2">
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
