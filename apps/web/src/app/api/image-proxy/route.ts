import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Drive file IDs are URL-safe base64 strings
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/
const DEFAULT_WIDTH = 1600
const MIN_WIDTH = 32
const MAX_WIDTH = 2048
const UPSTREAM_TIMEOUT_MS = 8000

// A Drive file ID always refers to the same bytes (replacing a photo creates
// a new file/ID), so a good response can be cached for a year - by browsers
// and by Vercel's CDN, which then answers repeat requests from the edge
// without running this function or touching Google at all.
const CACHE_FOR_A_YEAR = 'public, max-age=31536000, s-maxage=31536000, immutable'

/** Fetches `url`, returning it only if Google actually served an image */
async function fetchImage(url: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    const contentType = res.headers.get('content-type') || ''

    // Anything but an image (a sign-in page, the virus-scan interstitial, a
    // video's own bytes...) means this source can't serve it
    if (!res.ok || !contentType.startsWith('image/')) {
      await res.body?.cancel()
      return null
    }
    return { body: await res.arrayBuffer(), contentType }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Image Proxy API
 *
 * Serves publicly shared Google Drive images - and the poster frames Drive
 * generates for videos - from our own origin (avoids CORS/ORB blocking),
 * resized to at most `w` pixels wide.
 *
 * GET /api/image-proxy?id=<drive file id>&w=<max width, default 1600>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get('id')

  if (!fileId || !FILE_ID_PATTERN.test(fileId)) {
    return NextResponse.json(
      { error: 'A valid file ID is required' },
      { status: 400 }
    )
  }

  const requestedWidth = parseInt(searchParams.get('w') || '', 10)
  const width = Number.isNaN(requestedWidth)
    ? DEFAULT_WIDTH
    : Math.min(Math.max(requestedWidth, MIN_WIDTH), MAX_WIDTH)

  const sources = [
    // Google's image CDN, resized server-side: an uncompressed 4000px phone
    // photo comes back as a few hundred KB instead of several MB
    `https://lh3.googleusercontent.com/d/${fileId}=w${width}`,
    // Drive's own thumbnail endpoint (also resized)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`,
    // Last resort: the original file at full size (slow redirect, no resize)
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ]

  for (const url of sources) {
    try {
      const image = await fetchImage(url)
      if (image) {
        return new NextResponse(image.body, {
          status: 200,
          headers: {
            'Content-Type': image.contentType,
            'Cache-Control': CACHE_FOR_A_YEAR,
            'Access-Control-Allow-Origin': '*', // Allow cross-origin
          },
        })
      }
    } catch (error: any) {
      console.warn('[Image Proxy] Source failed:', {
        fileId,
        source: new URL(url).hostname,
        error: error.message,
      })
    }
  }

  console.error('[Image Proxy] No source could serve file:', fileId)
  return NextResponse.json(
    { error: 'Failed to fetch image' },
    // Never cache a failure - a transient Google hiccup mustn't stick for a year
    { status: 502, headers: { 'Cache-Control': 'no-store' } }
  )
}
