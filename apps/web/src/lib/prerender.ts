import { PHASE_PRODUCTION_BUILD } from 'next/constants'

/**
 * Loads the data an ISR page is pre-rendered with.
 *
 * On the production server errors propagate on purpose: Next.js then keeps
 * serving the last successfully generated page and retries on a later
 * request. During `next build` (the DB may be unreachable from the build
 * machine) and in local dev it returns `fallback` instead, so the page
 * renders a shell that loads its data client-side rather than failing.
 */
export async function loadForPrerender<T, F>(load: () => Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await load()
  } catch (error) {
    const isProductionServer =
      process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD
    if (isProductionServer) throw error

    console.error('[Prerender] Data unavailable, page will load it client-side:', error)
    return fallback
  }
}

/**
 * Plain-JSON copy of server data (Dates -> ISO strings, Decimal -> string):
 * exactly what the API routes return, and safe to pass to client components.
 */
export function toPlainJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value))
}
