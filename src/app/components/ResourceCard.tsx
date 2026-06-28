'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/supabase'

export default function ResourceCard({ resource }: { resource: Resource }) {
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
    <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-[#FCD116] p-4 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-[#003DA5] hover:underline line-clamp-2 leading-snug"
        >
          {title}
        </a>
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
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              copied
                ? 'border-green-200 bg-green-50 text-green-600'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {copied ? '✓' : '📋'}
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            title="Compartir por WhatsApp"
            className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
          >
            📱
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
                  className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-300 hover:bg-red-50 hover:text-[#CF0921] hover:border-red-200 transition-colors"
                >
                  ⚠️
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
