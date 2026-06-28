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
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium text-sm break-words"
          >
            {title}
          </a>
          {resource.description && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{resource.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* Copiar */}
          <button
            onClick={handleCopy}
            title="Copiar link"
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {copied ? '✓ Copiado' : '📋'}
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            title="Compartir por WhatsApp"
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors"
          >
            📱
          </button>

          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={voted}
            title={voted ? 'Ya votaste' : 'Marcar como útil'}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              voted
                ? 'border-blue-200 bg-blue-50 text-blue-600 cursor-default'
                : 'border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
            }`}
          >
            👍 {votes}
          </button>

          {/* Reportar */}
          <div ref={reportRef} className="relative">
            {reported ? (
              <span className="text-xs text-gray-400 px-1">Reportado</span>
            ) : (
              <>
                <button
                  onClick={() => setShowReport(!showReport)}
                  title="Reportar"
                  className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  ⚠️
                </button>
                {showReport && (
                  <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-44 overflow-hidden">
                    <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">¿Por qué reportas?</p>
                    <button
                      onClick={handleReport}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                    >
                      Desactualizado
                    </button>
                    <button
                      onClick={handleReport}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 border-t border-gray-100"
                    >
                      Erróneo / Inactivo
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {new Date(resource.updated_at).toLocaleDateString('es-VE', {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
      </p>
    </div>
  )
}
