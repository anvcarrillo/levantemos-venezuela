'use client'

import { useState, useMemo } from 'react'
import type { Category, Resource } from '@/lib/supabase'
import ResourceCard from './ResourceCard'

export default function ResourceDirectory({
  categories,
  resources,
}: {
  categories: Category[]
  resources: Resource[]
}) {
  const [search, setSearch] = useState('')

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
      categories
        .map(cat => ({
          category: cat,
          resources: filtered.filter(r => r.category_id === cat.id),
        }))
        .filter(g => g.resources.length > 0),
    [categories, filtered]
  )

  return (
    <div>
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

      {grouped.length === 0 ? (
        <p className="text-center py-20 text-gray-400">
          {search ? 'Sin resultados para esa búsqueda.' : 'No hay recursos aún.'}
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
        </div>
      )}
    </div>
  )
}
