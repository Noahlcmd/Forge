'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Trash2, Loader2, AlertCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'How can I increase revenue this month?',
  'Who are my best customers?',
  'What should I focus on this week?',
  'How is my lead pipeline looking?',
]

export function AIAssistantClient() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLTextAreaElement>(null)
  const submittingRef             = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || submittingRef.current) return

    submittingRef.current = true
    setError(null)
    setInput('')

    const userMsg: Message = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed }),
      })

      const json = await res.json() as { reply?: string; error?: string }

      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'Something went wrong. Please try again.')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: json.reply ?? '' }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      setError(msg)
      // Remove the optimistic user message on hard failure
      setMessages(prev => prev.slice(0, -1))
      setInput(trimmed)
    } finally {
      setLoading(false)
      submittingRef.current = false
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  function clearConversation() {
    setMessages([])
    setError(null)
    setInput('')
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0 px-6 pb-6">
      {/* ── Messages area ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto rounded-[12px] mb-4"
        style={{ border: '1px solid var(--border-color, #1e2128)', background: 'var(--card-bg, #14161c)' }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
              style={{ background: 'var(--color-primary, #f97316)22' }}
            >
              <Bot className="w-7 h-7" style={{ color: 'var(--color-primary, #f97316)' }} />
            </div>
            <p className="text-[16px] font-[600] mb-1" style={{ color: 'var(--text-primary)' }}>
              Ask me anything about your business
            </p>
            <p className="text-[13px] mb-8" style={{ color: 'var(--text-muted)' }}>
              I have access to your customers, leads, campaigns, and revenue data.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="text-[12px] px-3 py-[6px] rounded-[20px] border transition-colors"
                  style={{
                    borderColor: 'var(--border-color, #1e2128)',
                    color: 'var(--text-muted)',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary, #f97316)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary, #f97316)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color, #1e2128)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={
                    msg.role === 'assistant'
                      ? { background: 'var(--color-primary, #f97316)22' }
                      : { background: '#1e2128' }
                  }
                >
                  {msg.role === 'assistant'
                    ? <Bot className="w-4 h-4" style={{ color: 'var(--color-primary, #f97316)' }} />
                    : <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  }
                </div>

                {/* Bubble */}
                <div
                  className="max-w-[72%] rounded-[12px] px-4 py-3 text-[13px] leading-[1.65] whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? { background: 'var(--color-primary, #f97316)', color: '#fff' }
                      : { background: '#1e2128', color: 'var(--text-primary)' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {loading && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary, #f97316)22' }}
                >
                  <Bot className="w-4 h-4" style={{ color: 'var(--color-primary, #f97316)' }} />
                </div>
                <div
                  className="rounded-[12px] px-4 py-3 flex items-center gap-2"
                  style={{ background: '#1e2128' }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Analysing your data…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] mb-3 text-[13px]"
          style={{ background: '#2d1515', color: '#fc8181', border: '1px solid #4a1c1c' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-end gap-3 rounded-[12px] px-4 py-3"
        style={{ border: '1px solid var(--border-color, #1e2128)', background: 'var(--card-bg, #14161c)' }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your business…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] outline-none leading-[1.5] max-h-32 overflow-y-auto"
          style={{ color: 'var(--text-primary)', caretColor: 'var(--color-primary, #f97316)' }}
        />

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              title="Clear conversation"
              className="p-1.5 rounded-[6px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fc8181' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-opacity"
            style={{
              background: 'var(--color-primary, #f97316)',
              opacity: (!input.trim() || loading) ? 0.4 : 1,
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
        Press <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for newline
      </p>
    </div>
  )
}
