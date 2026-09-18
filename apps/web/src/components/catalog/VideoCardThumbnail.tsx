'use client'

import { useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { getVideoThumbnailUrl } from '@samadya/shared/lib/utils/imageUrl'

// Thumbnail for a video card. Uses the poster frame Google Drive generates
// for uploaded videos (one small, CDN-cached image) and only falls back to
// grabbing a frame from the video itself - which streams the file through
// /api/stream - when Drive has no poster for it.
export function VideoCardThumbnail({ videoUrl }: { videoUrl: string }) {
  const posterUrl = getVideoThumbnailUrl(videoUrl)
  const [posterFailed, setPosterFailed] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Browsers won't paint a preview frame for a hidden/unplayed <video>, so
  // the fallback grabs one onto a canvas
  const handleSeeked = () => {
    if (!videoRef.current) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        setThumbnail(canvas.toDataURL('image/jpeg', 0.7))
      }
    } catch {
      // CORS-tainted canvas or decode failure - keep the icon fallback
    }
  }

  if (posterUrl && !posterFailed) {
    return (
      <img
        src={posterUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setPosterFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (thumbnail) {
    return <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
  }

  return (
    <>
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        muted
        crossOrigin="anonymous"
        onLoadedData={() => {
          if (videoRef.current) videoRef.current.currentTime = 1
        }}
        onSeeked={handleSeeked}
      />
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[hsl(var(--forest))/20] to-[hsl(var(--forest))/40]">
        <div className="flex flex-col items-center gap-1">
          <Film className="h-8 w-8 text-[hsl(var(--forest))/50]" />
          <span className="text-[9px] text-[hsl(var(--forest))/60]">Video</span>
        </div>
      </div>
    </>
  )
}
