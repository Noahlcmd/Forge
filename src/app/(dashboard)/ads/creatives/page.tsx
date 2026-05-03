'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, ImageIcon, Film, FileText, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Asset = {
  id:         string
  name:       string
  file_type:  string
  file_size:  number | null
  public_url: string | null
  created_at: string
}

function fmt(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CreativeLibraryPage() {
  const [assets,    setAssets]    = useState<Asset[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/creatives')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setAssets(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function uploadFiles(files: File[]) {
    for (const file of files) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        const res  = await fetch('/api/creatives', { method: 'POST', body: form })
        const data = await res.json() as Asset & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        setAssets(prev => [data, ...prev])
        toast.success(`${file.name} uploaded`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
  }

  async function deleteAsset(asset: Asset) {
    try {
      const res = await fetch(`/api/creatives?id=${asset.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setAssets(prev => prev.filter(a => a.id !== asset.id))
      toast.success('Asset deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }, [])

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Creative Library</h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Upload and organize images, videos, and ad copy for your campaigns
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="forge-card flex flex-col items-center justify-center py-12 cursor-pointer transition-all"
        style={{
          borderStyle: 'dashed',
          borderColor: dragging ? 'var(--color-primary)' : 'var(--card-border)',
          background:  dragging ? 'rgba(249,115,22,0.04)' : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.pdf"
          multiple
          className="hidden"
          onChange={e => {
            uploadFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--color-primary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Uploading…</p>
          </>
        ) : (
          <>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: '#fff7ed' }}
            >
              <Upload className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
              Drop files here or click to upload
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Images, videos, PDFs — up to 50 MB each
            </p>
          </>
        )}
      </div>

      {/* Stats bar */}
      {assets.length > 0 && (
        <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span>{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{assets.filter(a => a.file_type.startsWith('image/')).length} images</span>
          <span>·</span>
          <span>{assets.filter(a => a.file_type.startsWith('video/')).length} videos</span>
        </div>
      )}

      {/* Asset grid */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : assets.length === 0 ? (
        <p className="text-center text-[13px] py-6" style={{ color: 'var(--text-muted)' }}>
          No assets yet — upload your first creative above.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {assets.map(asset => {
            const isImage = asset.file_type.startsWith('image/')
            const isVideo = asset.file_type.startsWith('video/')
            const Icon    = isImage ? ImageIcon : isVideo ? Film : FileText
            return (
              <div
                key={asset.id}
                className="forge-card group relative overflow-hidden"
                style={{ padding: 0 }}
              >
                <div
                  className="w-full aspect-square flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--surface-subtle)' }}
                >
                  {isImage && asset.public_url ? (
                    <img
                      src={asset.public_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)' }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); deleteAsset(asset) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: '#ef4444' }}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2">
                  <p className="text-[11px] font-[500] truncate" style={{ color: 'var(--text-primary)' }}>
                    {asset.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {fmt(asset.file_size)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
