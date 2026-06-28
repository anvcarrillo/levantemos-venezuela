'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/supabase'

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function ResourceCard({
  resource,
  isTop = false,
}: {
  resource: Resource
  isTop?: boolean
}) {
  const [votes, setVotes] = useState(resource.upvotes ?? 0)
  const [voted, setVoted] = useState(false)
  const [reported, setReported] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVoted(!!localStorage.getItem(`upvoted_${resource.id}`))
    setReported(!!localStorage.getItem(`reported_${resource.id}`))
  }, [resource.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setShowReport(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const url = resource.url_normalized || resource.url
  const title = resource.title || url
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  async function handleUpvote() {
    if (voted) return
    setVotes(v => v + 1)
    setVoted(true)
    localStorage.setItem(`upvoted_${resource.id}`, '1')
    await supabase.rpc('upvote_resource', { resource_id: resource.id })
  }

  async function handleReport() {
    setReported(true)
    setShowReport(false)
    localStorage.setItem(`reported_${resource.id}`, '1')
    await supabase.rpc('report_resource', { resource_id: resource.id })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const lines = [title, resource.description, url].filter(Boolean).join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank')
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 p-4 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow ${
      isTop ? 'border-l-[#722F37]' : 'border-l-[#FCD116]'
    }`}>

      {/* Top badge */}
      {isTop && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#722F37] text-white font-semibold">
            <span className="text-[#FCD116]">★</span> Valorado
          </span>
        </div>
      )}

      {/* Title + URL + description */}
      <div className="flex-1 min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-[#003DA5] hover:underline line-clamp-2 leading-snug"
        >
          {title}
        </a>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{displayUrl}</p>
        {resource.description && (
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
            {resource.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2">
        <span className="text-xs text-gray-400 shrink-0">
          {new Date(resource.updated_at).toLocaleDateString('es-VE', {
            day: 'numeric', month: 'short',
          })}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {/* Copiar */}
          <button
            onClick={handleCopy}
            title="Copiar link"
            className={`p-1.5 rounded-md border transition-colors flex items-center justify-center ${
              copied
                ? 'border-green-200 bg-green-50 text-green-600'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            title="Compartir por WhatsApp"
            className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors flex items-center justify-center"
          >
            <IconWhatsApp />
          </button>

          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={voted}
            title={voted ? 'Ya votaste' : 'Útil'}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              voted
                ? 'border-[#003DA5] bg-blue-50 text-[#003DA5] cursor-default'
                : 'border-gray-200 text-gray-400 hover:border-[#003DA5] hover:text-[#003DA5] hover:bg-blue-50'
            }`}
          >
            👍 {votes}
          </button>

          {/* Reportar */}
          <div ref={reportRef} className="relative">
            {reported ? (
              <span className="text-xs text-gray-300 px-1">✓</span>
            ) : (
              <>
                <button
                  onClick={() => setShowReport(!showReport)}
                  title="Reportar"
                  className="p-1.5 rounded-md border border-gray-200 text-gray-300 hover:bg-red-50 hover:text-[#CF0921] hover:border-red-200 transition-colors flex items-center justify-center"
                >
                  <IconWarning />
                </button>
                {showReport && (
                  <div className="absolute right-0 bottom-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-44 overflow-hidden">
                    <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">¿Por qué reportas?</p>
                    <button onClick={handleReport} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#CF0921]">
                      Desactualizado
                    </button>
                    <button onClick={handleReport} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#CF0921] border-t border-gray-100">
                      Erróneo / Inactivo
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
