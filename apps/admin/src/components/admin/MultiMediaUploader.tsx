'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { compressImageForUpload } from '@/lib/utils/compressImage'

interface MultiMediaUploaderProps {
  cattleId: string
  onUploaded: () => void
}

// Chunk size: 2MB (must be smaller than Vercel's ~4.5MB request body limit)
const CHUNK_SIZE = 2 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/jpg,image/webp,image/gif,video/mp4,video/webm'

async function uploadDirect(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', file.type.startsWith('video/') ? 'video' : 'image')

  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text || `Server error: ${res.status}`)
  }
  if (!res.ok) throw new Error(data.error || 'Gagal mengupload file')
  return data.url
}

async function uploadChunked(file: File, onProgress: (text: string) => void): Promise<string> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

  const initRes = await fetch('/api/upload-chunked/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      folder: 'video',
      totalChunks,
      uploadId,
    }),
  })
  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(text || 'Gagal inisialisasi upload video')
  }
  const { sessionId } = await initRes.json()

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    onProgress(`Mengupload video (${i + 1}/${totalChunks})...`)

    const fd = new FormData()
    fd.append('chunk', chunk)
    fd.append('sessionId', sessionId)
    fd.append('chunkIndex', i.toString())
    fd.append('start', start.toString())
    fd.append('end', (end - 1).toString())

    const chunkRes = await fetch('/api/upload-chunked', { method: 'POST', body: fd })
    if (!chunkRes.ok) {
      const text = await chunkRes.text()
      throw new Error(text || `Gagal upload chunk ${i + 1}`)
    }
  }

  onProgress('Memproses video...')
  const finalizeRes = await fetch('/api/upload-chunked/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  if (!finalizeRes.ok) {
    const text = await finalizeRes.text()
    throw new Error(text || 'Gagal finalize upload video')
  }
  const result = await finalizeRes.json()
  return result.url
}

export function MultiMediaUploader({ cattleId, onUploaded }: MultiMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList)
    setError(null)
    setUploading(true)

    const failed: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const isVideo = file.type.startsWith('video/')
        setProgressText(`Mengupload ${i + 1}/${files.length}: ${file.name}`)

        try {
          const url =
            isVideo && file.size > CHUNK_SIZE
              ? await uploadChunked(file, setProgressText)
              : await uploadDirect(await compressImageForUpload(file))

          const saveRes = await fetch('/api/admin/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cattleId,
              fileUrl: url,
              fileType: isVideo ? 'VIDEO' : 'IMAGE',
              category: 'GENERAL',
            }),
          })
          if (!saveRes.ok) {
            const data = await saveRes.json()
            throw new Error(data.error || 'Gagal menyimpan media')
          }
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err)
          failed.push(`${file.name}: ${err.message || 'gagal'}`)
        }
      }

      onUploaded()
      if (failed.length > 0) {
        setError(`${failed.length} file gagal diupload:\n${failed.join('\n')}`)
      }
    } finally {
      setUploading(false)
      setProgressText('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (!uploading && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
        }}
        className={`w-full rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center transition-all border-[hsl(var(--line))] hover:border-[hsl(var(--forest))] hover:bg-[hsl(var(--cream))/50] ${
          uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--forest))] mb-2" />
            <p className="text-sm text-muted-foreground text-center">{progressText}</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-[hsl(var(--forest))/40] mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Klik atau drag beberapa foto/video sekaligus ke sini
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, WebP, GIF, MP4, WebM</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
        </div>
      )}
    </div>
  )
}
