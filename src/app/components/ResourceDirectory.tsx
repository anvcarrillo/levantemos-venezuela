'use client'

import { useState, useMemo, useEffect } from 'react'
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
  const [noResults, setNoResults] = useState(false)

  // Auto-dismiss toast after 4 s
  useEffect(() => {
    if (!noResults) return
    const t = setTimeout(() => setNoResults(false), 4000)
    return () => clearTimeout(t)
  }, [noResults])

  // Show toast when a filter is active but no groups match
  useEffect(() => {
    if (activeFilter !== null && grouped.length === 0 && !search.trim()) {
      setNoResults(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, search])

  // Listen for nav clicks on categories that have no resources on this page
  useEffect(() => {
    function handler() { setNoResults(true) }
    window.addEventListener('nav-empty-category', handler)
    return () => window.removeEventListener('nav-empty-category', handler)
  }, [])

  // Scroll to hash on mount; show toast if category exists but has no resources
  useEffect(() => {
    const slug = window.location.hash.slice(1)
    if (!slug) return
    const tryScroll = (attempts: number) => {
      const el = document.getElementById(slug)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (attempts > 0) {
        setTimeout(() => tryScroll(attempts - 1), 120)
      } else if (categories.some(c => c.slug === slug)) {
        setNoResults(true)
      }
    }
    setTimeout(() => tryScroll(5), 150)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div className="relative">
      {/* No results toast */}
      {noResults && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3 pointer-events-auto">
            <span className="text-[#CF0921] mt-0.5 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <p className="text-sm text-gray-700 flex-1">No se encontraron resultados para el tipo de recurso seleccionado.</p>
            <button onClick={() => setNoResults(false)} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(f => {
          const isActive = activeFilter === f.label
          const styles = FILTER_STYLES[f.label]
          return (
            <button
              key={f.label}
              onClick={() => { setNoResults(false); setActiveFilter(isActive ? null : f.label) }}
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
          {grouped.map(({ category, resources }) => {
            const top = resources.length > 0
              ? resources.reduce((a, b) => (b.upvotes ?? 0) > (a.upvotes ?? 0) ? b : a)
              : null
            const topId = top && (top.upvotes ?? 0) > 0 ? top.id : null
            return (
              <section key={category.id} id={category.slug} className="scroll-mt-20">
                <h2 className="text-sm font-bold text-[#003DA5] uppercase tracking-wider mb-4 pb-2 border-b-2 border-[#FCD116]">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resources.map(resource => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      isTop={resource.id === topId}
                    />
                  ))}
                </div>
              </section>
            )
          })}

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
