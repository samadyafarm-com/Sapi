const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '/api/images'
const VIDEO_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_BASE_URL || '/api/videos'
const IMAGE_PROXY_URL = process.env.NEXT_PUBLIC_IMAGE_PROXY_URL || '/api/image-proxy'

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractDriveFileId(url: string): string | null {
  // Format: https://drive.google.com/uc?export=view&id=FILE_ID
  const ucMatch = url.match(/[?&]id=([^&]+)/)
  if (ucMatch) return ucMatch[1]

  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([^/]+)/)
  if (fileMatch) return fileMatch[1]

  // Format: https://docs.google.com/uc?export=view&id=FILE_ID
  const docsMatch = url.match(/docs\.google\.com.*[?&]id=([^&]+)/)
  if (docsMatch) return docsMatch[1]

  return null
}

/**
 * Get direct image URL for display
 * Automatically proxies Google Drive images to bypass CORS. Pass `width` to
 * get a resized copy from the proxy - for spots that don't go through
 * next/image (which resizes on its own), like CSS backgrounds.
 */
export function getDirectImageUrl(path: string | null | undefined, width?: number): string {
  if (!path) return '/placeholder-cattle.png'

  // If it's already an absolute URL (external), check if it's Google Drive
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const driveFileId = extractDriveFileId(path)
    if (driveFileId) {
      // Use image proxy for Google Drive images
      return `${IMAGE_PROXY_URL}?id=${driveFileId}${width ? `&w=${width}` : ''}`
    }
    // Return other external URLs as-is
    return path
  }

  // If it's a path starting with /, prepend the image base URL
  if (path.startsWith('/')) {
    return `${IMAGE_BASE_URL}${path}`
  }

  // Otherwise treat as a storage path
  return `${IMAGE_BASE_URL}/${path}`
}

/**
 * Poster-frame image for a video stored on Google Drive (Drive generates one
 * on upload), served through the image proxy. Null for non-Drive videos.
 */
export function getVideoThumbnailUrl(path: string | null | undefined, width = 640): string | null {
  if (!path) return null

  // Our stream URLs carry the Drive ID as ?fileId=..., Drive links as ?id= or /file/d/
  const streamFileId = path.match(/[?&]fileId=([^&]+)/)?.[1]
  const fileId = streamFileId || (isGoogleDriveUrl(path) ? extractDriveFileId(path) : null)
  return fileId ? `${IMAGE_PROXY_URL}?id=${fileId}&w=${width}` : null
}

/**
 * Get direct video URL for display
 * Automatically proxies Google Drive videos to bypass ORB blocking
 */
export function getVideoUrl(path: string | null | undefined): string {
  if (!path) return ''

  // If it's a stream URL (like /api/stream?fileId=xxx), return as-is
  if (path.startsWith('/api/stream') || path.startsWith('/api/videos')) {
    return path
  }

  // If it's already an absolute URL (external), check if it's Google Drive
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const driveFileId = extractDriveFileId(path)
    if (driveFileId) {
      // Use /api/stream proxy for Google Drive videos to bypass ORB
      return `/api/stream?fileId=${driveFileId}`
    }
    return path
  }

  // If it's a path starting with /, prepend the video base URL
  if (path.startsWith('/')) {
    return `${VIDEO_BASE_URL}${path}`
  }

  return `${VIDEO_BASE_URL}/${path}`
}

/**
 * Check if a URL is a video
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.includes('/api/stream') ||
    lower.includes('/api/videos') ||
    lower.includes('/videos/') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.includes('mimetype=video')
  )
}

/**
 * Check if URL is from Google Drive
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('drive.google.com') || url.includes('docs.google.com')
}
