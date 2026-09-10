'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Play, Pause } from 'lucide-react'
import { getDirectImageUrl } from '@samadya/shared/lib/utils/imageUrl'
import { compressImageForUpload } from '@/lib/utils/compressImage'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  folder?: string
  accept?: string
  maxSize?: number
}

// Chunk size: 2MB (must be smaller than Vercel 4.5MB limit)
const CHUNK_SIZE = 2 * 1024 * 1024

export function ImageUploader({
  value,
  onChange,
  folder = 'cattle',
  accept = 'image/jpeg,image/png,image/jpg,video/mp4,video/webm',
  maxSize = 20,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [uploadingIsVideo, setUploadingIsVideo] = useState(false)
  const [statusText, setStatusText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = value?.includes('/api/stream') || value?.match(/\.(mp4|webm|ogg)$/i) || value?.startsWith('data:video')

  const validateFile = (file: File): string | null => {
    // Check file type exists
    if (!file.type || typeof file.type !== 'string') {
      return 'File type tidak valid atau missing'
    }

    const isVideoFile = file.type.startsWith('video/')
    const isImageFile = file.type.startsWith('image/')

    if (!isImageFile && !isVideoFile) {
      return 'Format file tidak didukung. Gunakan JPG, PNG, atau MP4.'
    }

    const maxSizeBytes = isVideoFile ? 500 * 1024 * 1024 : maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Ukuran file terlalu besar. Maksimal ${isVideoFile ? '500MB' : `${maxSize}MB`}.`
    }
    return null
  }

  // Chunked upload for large files
  const uploadChunked = async (file: File, uploadFolder: string): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    setStatusText(`Mengupload video (0/${totalChunks})...`)

    // Initialize upload session
    const initRes = await fetch('/api/upload-chunked/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        folder: uploadFolder,
        totalChunks,
        uploadId,
      }),
    })

    if (!initRes.ok) {
      const text = await initRes.text()
      throw new Error(text || 'Gagal inisialisasi upload')
    }

    const { sessionId } = await initRes.json()

    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('sessionId', sessionId)
      formData.append('chunkIndex', i.toString())
      formData.append('start', start.toString())
      formData.append('end', (end - 1).toString())

      const chunkRes = await fetch('/api/upload-chunked', {
        method: 'POST',
        body: formData,
      })

      if (!chunkRes.ok) {
        const text = await chunkRes.text()
        throw new Error(text || `Gagal upload chunk ${i + 1}`)
      }

      setUploadProgress(Math.round(((i + 1) / totalChunks) * 80))
      setStatusText(`Mengupload video (${i + 1}/${totalChunks})...`)
    }

    setStatusText('Memproses video...')

    // Finalize upload (server will compress and upload to Google Drive)
    const finalizeRes = await fetch('/api/upload-chunked/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    if (!finalizeRes.ok) {
      const text = await finalizeRes.text()
      throw new Error(text || 'Gagal finalize upload')
    }

    const result = await finalizeRes.json()
    return result.url
  }

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Validate file type exists
    if (!file.type || typeof file.type !== 'string') {
      setError('File type tidak valid atau missing')
      setUploading(false)
      return
    }

    setUploading(true)
    const isVideoFile = file.type.startsWith('video/')
    setUploadingIsVideo(isVideoFile)
    setError(null)
    setUploadProgress(0)
    setStatusText('')

    try {
      const uploadFolder = isVideoFile ? 'video' : 'image'
      let url: string

      // For images or small videos, use direct upload
      // For large videos, use chunked upload
      if (isVideoFile && file.size > CHUNK_SIZE) {
        url = await uploadChunked(file, uploadFolder)
      } else {
        // Direct upload for images and small videos. Photos are shrunk
        // first - phone originals are often several MB
        let uploadFile = file
        if (!isVideoFile) {
          setStatusText('Mengompres foto...')
          uploadFile = await compressImageForUpload(file)
        }

        const formData = new FormData()
        formData.append('file', uploadFile)
        formData.append('folder', uploadFolder)

        setStatusText('Mengupload...')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        setUploadProgress(80)

        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch {
          throw new Error(responseText || 'Server error: ' + response.status)
        }

        if (!response.ok) {
          throw new Error(data.error || 'Gagal mengupload file')
        }

        url = data.url
      }

      if (url) {
        onChange(url)
        setUploadProgress(100)
        setStatusText('Berhasil!')
      } else {
        throw new Error('URL tidak ditemukan')
      }
    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupload'
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Tidak dapat terhubung ke server.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setUploading(false)
      setUploadingIsVideo(false)
      setUploadProgress(0)
      setStatusText('')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    setError(null)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [folder])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleRemove = () => {
    onChange('')
    setError(null)
    setIsVideoPlaying(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  // Show video preview
  if (value && isVideo) {
    const videoUrl = value.startsWith('/') ? value : getDirectImageUrl(value)

    return (
      <div className="space-y-2">
        <div className="relative w-full rounded-lg overflow-hidden border border-[hsl(var(--line))] bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-48 object-contain"
            onEnded={() => setIsVideoPlaying(false)}
            onError={(e) => {
              console.error('Video load error:', e)
              e.currentTarget.poster = ''
            }}
          />
          <button
            type="button"
            onClick={toggleVideoPlayback}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
            title={isVideoPlaying ? 'Pause' : 'Play'}
          >
            {isVideoPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Hapus video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--forest))/50] text-center">
          Video dokumentasi
        </p>
      </div>
    )
  }

  // Show image preview
  if (value) {
    const imageUrl = getDirectImageUrl(value)

    return (
      <div className="space-y-2">
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-[hsl(var(--line))] bg-[hsl(var(--cream))]">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = value
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Hapus gambar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--forest))/40] text-center break-all px-2">
          URL: {value}
        </p>
        <p className="text-xs text-[hsl(var(--forest))/50] text-center">
          Klik gambar untuk menghapus
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[hsl(var(--forest))] bg-[hsl(var(--cream))]'
            : 'border-[hsl(var(--line))] hover:border-[hsl(var(--forest))] hover:bg-[hsl(var(--cream))/50]'
        } ${uploading ? 'cursor-not-allowed' : ''}`}
      >
        {uploading ? (
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--forest))] mx-auto mb-3" />
            <p className="text-sm text-[hsl(var(--forest))/60]">
              {uploadingIsVideo ? statusText || 'Mengupload video...' : 'Mengupload gambar...'} {uploadProgress}%
            </p>
            <div className="w-48 h-2 bg-[hsl(var(--line))] rounded-full mt-3 mx-auto overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--forest))] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--cream))] flex items-center justify-center mb-3">
              {dragOver ? (
                <ImageIcon className="h-8 w-8 text-[hsl(var(--forest))]" />
              ) : (
                <Upload className="h-8 w-8 text-[hsl(var(--forest))/40]" />
              )}
            </div>
            <p className="text-sm text-[hsl(var(--forest))/60]">
              {dragOver ? 'Lepaskan file di sini' : 'Klik atau drag gambar/video ke sini'}
            </p>
            <p className="text-xs text-[hsl(var(--forest))/40] mt-1">
              JPG, PNG - Maksimal {maxSize}MB | Video - Maksimal 500MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
