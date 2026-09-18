import { KatalogPageClient } from '../../components/catalog/KatalogPageClient'
import { getPublicCattleList } from '@/lib/cattle/public-cattle'
import { loadForPrerender, toPlainJson } from '@/lib/prerender'
import type { CattleWithRelations } from '@samadya/shared/types'

// Pre-rendered with the data inside and rebuilt at most once a minute (see app/page.tsx)
export const revalidate = 60

async function loadKatalogCattle() {
  // Sold cattle no longer have anything to offer buyers - keep them out
  // of the public catalog entirely rather than just badging them.
  const cattle = await getPublicCattleList({ excludeStatus: ['SOLD'], limit: 100 })
  return toPlainJson<CattleWithRelations[]>(cattle)
}

export default async function KatalogPage() {
  const initialCattle = await loadForPrerender(loadKatalogCattle, null)

  return <KatalogPageClient initialCattle={initialCattle} generatedAt={Date.now()} />
}
