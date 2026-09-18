'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Download, Play, Grid, Maximize2, Film, Loader2 } from 'lucide-react'
import { CattleMedia } from '@samadya/shared/types'
import { getDirectImageUrl, getVideoUrl } from '@samadya/shared/lib/utils/imageUrl'

interface MediaTabProps {
  media: CattleMedia[]
}

// Component to capture video thumbnail
function VideoThumbnail({ videoUrl, itemId }: { videoUrl: string; itemId: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const captureThumbnail = async () => {
      if (!videoRef.current) return

      try {
        videoRef.current.src = videoUrl
        videoRef.current.currentTime = 1 // Seek to 1 second
      } catch (e) {
        console.warn('Failed to load video for thumbnail')
        setLoading(false)
      }
    }

    captureThumbnail()
  }, [videoUrl])

  const handleSeeked = () => {
    if (!videoRef.current) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 180
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
        setThumbnail(thumbnailUrl)
      }
    } catch (e) {
      console.warn('Failed to capture thumbnail')
    } finally {
      setLoading(false)
    }
  }

  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt="Video thumbnail"
        className="absolute inset-0 w-full h-full object-cover"
      />
    )
  }

  return (
    <>
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        onSeeked={handleSeeked}
        onLoadedData={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 1
          }
        }}
        onError={() => setLoading(false)}
        crossOrigin="anonymous"
      />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--forest))/30] to-[hsl(var(--forest))/50]">
          <Loader2 className="h-8 w-8 text-white/70 animate-spin" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--forest))/30] to-[hsl(var(--forest))/50]">
          <Film className="h-12 w-12 text-white/70" />
        </div>
      )}
    </>
  )
}

export function MediaTab({ media }: MediaTabProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')

  if (!media || media.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-[hsl(var(--cream))] rounded-full flex items-center justify-center">
          <Grid className="h-8 w-8 text-[hsl(var(--forest))/40]" />
        </div>
        <h3 className="text-lg font-semibold text-[hsl(var(--forest))] mb-2">Belum Ada Dokumentasi</h3>
        <p className="text-sm text-[hsl(var(--forest))/60]">
          Foto dan video dokumentasi akan muncul setelah diupload.
        </p>
      </div>
    )
  }

  // Helper function to check if item is video
  const isVideo = (item: CattleMedia): boolean => {
    const type = (item.fileType || '').toUpperCase()
    const url = item.fileUrl || ''
    return type.includes('VIDEO') ||
           url.includes('/api/stream') ||
           url.includes('/api/videos') ||
           url.match(/\.(mp4|webm|mov)(\?|$)/i) !== null
  }

  const images = media.filter(m => !isVideo(m))
  const videos = media.filter(m => isVideo(m))

  const currentItem = media[currentIndex]
  const isCurrentVideo = currentItem ? isVideo(currentItem) : false

  const openItem = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
    if (e.key === 'Escape') setLightboxOpen(false)
  }

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--forest))]">
              Dokumentasi ({images.length} foto{videos.length > 0 && `, ${videos.length} video`})
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[hsl(var(--forest))] text-white'
                  : 'bg-[hsl(var(--cream))] text-[hsl(var(--forest))]'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'masonry'
                  ? 'bg-[hsl(var(--forest))] text-white'
                  : 'bg-[hsl(var(--cream))] text-[hsl(var(--forest))]'
              }`}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
              : 'columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3'
          }
        >
          {media.map((item, index) => {
            const itemIsVideo = isVideo(item)
            return (
              <button
                key={item.id}
                onClick={() => openItem(index)}
                className={`group relative overflow-hidden rounded-xl bg-[hsl(var(--cream))] ${
                  viewMode === 'masonry' ? 'break-inside-avoid mb-3' : ''
                }`}
              >
                <div className="relative aspect-square">
                  {itemIsVideo ? (
                    <>
                      <VideoThumbnail videoUrl={getVideoUrl(item.fileUrl)} itemId={item.id} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-7 w-7 text-[hsl(var(--forest))] fill-current ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                        VIDEO
                      </div>
                    </>
                  ) : (
                    <Image
                      src={getDirectImageUrl(item.fileUrl)}
                      alt={item.title || 'Dokumentasi'}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                {item.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-white text-xs font-medium">{item.title}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentItem && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-3 text-white hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {media.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Content */}
          <div className="relative w-full h-full max-w-[90vw] max-h-[85vh] m-4 flex items-center justify-center">
            {isCurrentVideo ? (
              <video
                key={currentItem.id}
                src={getVideoUrl(currentItem.fileUrl)}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg object-contain"
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={getDirectImageUrl(currentItem.fileUrl)}
                  alt=""
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white text-sm">
              {currentIndex + 1} / {media.length}
            </span>
            <button
              onClick={() => downloadFile(
                isCurrentVideo ? getVideoUrl(currentItem.fileUrl) : getDirectImageUrl(currentItem.fileUrl),
                `${currentItem.title || 'dokumentasi'}-${currentIndex + 1}${isCurrentVideo ? '.mp4' : '.jpg'}`
              )}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {/* Dots */}
          {media.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
