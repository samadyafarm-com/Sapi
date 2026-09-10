import { HomePageClient } from '../components/home/HomePageClient'
import { getPublicCattleDetail, getPublicCattleList } from '@/lib/cattle/public-cattle'
import { loadForPrerender, toPlainJson } from '@/lib/prerender'
import type { CattleWithRelations } from '@samadya/shared/types'

// Served as pre-rendered HTML with the cattle data already inside, straight
// from the CDN, and rebuilt in the background at most once a minute - so the
// hero photo, catalog and QR code no longer wait on a client-side API call.
export const revalidate = 60

async function loadHomePageData() {
  const cattle = await getPublicCattleList({ status: ['AVAILABLE'], limit: 50 })
  // The first cattle is pre-selected in "Pantau Perkembangan", so include its
  // full history up front instead of fetching it right after the page loads
  const firstDetails = cattle[0] ? await getPublicCattleDetail({ id: cattle[0].id }) : null

  return {
    initialCattle: toPlainJson<CattleWithRelations[]>(cattle),
    initialDetails: firstDetails ? toPlainJson<CattleWithRelations>(firstDetails) : null,
  }
}

export default async function HomePage() {
  const data = await loadForPrerender(loadHomePageData, {
    initialCattle: null,
    initialDetails: null,
  })

  return <HomePageClient {...data} generatedAt={Date.now()} />
}
