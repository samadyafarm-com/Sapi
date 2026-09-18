'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HeroSection } from '../catalog/HeroSection'
import { JourneySection } from '../catalog/JourneySection'
import { TrustRow } from '../catalog/TrustRow'
import { CTASection } from '../catalog/CTASection'
import { CatalogSection } from '../catalog/CatalogSection'
import { PantauPerkembanganSection } from './PantauPerkembanganSection'
import { RecentComments } from './RecentComments'
import { CompareModalWrapper } from './CompareModalWrapper'
import { CattleWithLatestWeight, CattleWithRelations } from '@samadya/shared/types'
import { getDirectImageUrl, isVideoUrl } from '@samadya/shared/lib/utils/imageUrl'
import { Columns3, X } from 'lucide-react'

const CATTLE_LIST_URL = '/api/admin/cattle?status=AVAILABLE&limit=50'
// Pre-rendered data older than this (the cached page sat through a quiet
// period) is refreshed in the background right after the page shows
const STALE_AFTER_MS = 60 * 1000
const COMPARE_STORAGE_KEY = 'compareCattleIds'
const MAX_COMPARE = 3

// The per-cattle history the list leaves out; loaded when a cattle is
// selected or compared
type CattleHistory = Pick<CattleWithRelations, 'weights' | 'healthRecords' | 'feedRecords' | 'media'>

function pickHistory(cattle: CattleWithRelations): CattleHistory {
  return {
    weights: cattle.weights || [],
    healthRecords: cattle.healthRecords || [],
    feedRecords: cattle.feedRecords || [],
    media: cattle.media || [],
  }
}

async function fetchCattleList(): Promise<CattleWithRelations[]> {
  const res = await fetch(CATTLE_LIST_URL)
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
  const data = await res.json()
  // API returns { items: [...], total: number } directly
  return Array.isArray(data) ? data : data.items || data.data?.items || []
}

interface HomePageClientProps {
  /** Pre-rendered list; null when the server couldn't load it (fetched here instead) */
  initialCattle: CattleWithRelations[] | null
  /** Full history of the first (pre-selected) cattle */
  initialDetails: CattleWithRelations | null
  generatedAt: number
}

export function HomePageClient({ initialCattle, initialDetails, generatedAt }: HomePageClientProps) {
  const [fullCattleData, setFullCattleData] = useState<CattleWithRelations[]>(initialCattle ?? [])
  const [history, setHistory] = useState<Record<string, CattleHistory>>(
    initialDetails ? { [initialDetails.id]: pickHistory(initialDetails) } : {}
  )
  const [failedHistoryIds, setFailedHistoryIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialCattle?.[0]?.id ?? null)
  const [comparingIds, setComparingIds] = useState<string[]>([])
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(initialCattle === null)
  const pageRef = useRef<HTMLDivElement>(null)
  const historyRequests = useRef(new Set<string>())

  useEffect(() => {
    // Restore a previously-picked compare list (e.g. after navigating
    // away to a cattle detail page and back) instead of losing it.
    const restoreCompareList = (items: CattleWithRelations[]) => {
      try {
        const savedIds: string[] = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]')
        const restored = savedIds.filter(id => items.some(c => c.id === id))
        if (restored.length > 0) setComparingIds(restored)
      } catch {
        // Ignore malformed/inaccessible storage - compare list just starts empty
      }
    }

    const applyList = (items: CattleWithRelations[]) => {
      setFullCattleData(items)
      // Keep the current selection if that cattle is still listed
      setSelectedId(prev => (prev && items.some(c => c.id === prev) ? prev : items[0]?.id ?? null))
    }

    if (initialCattle === null) {
      fetchCattleList()
        .then(items => {
          applyList(items)
          restoreCompareList(items)
        })
        .catch(err => console.error('Failed to fetch cattle data:', err))
        .finally(() => setIsLoading(false))
    } else {
      restoreCompareList(initialCattle)
      if (Date.now() - generatedAt > STALE_AFTER_MS) {
        fetchCattleList()
          .then(items => {
            applyList(items)
            setComparingIds(prev => prev.filter(id => items.some(c => c.id === id)))
            // Cached history is as old as the page - load it fresh too
            setHistory({})
            setFailedHistoryIds([])
          })
          // A failed background refresh just keeps the pre-rendered data
          .catch(err => console.error('Failed to refresh cattle data:', err))
      }
    }

    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    const revealElements = pageRef.current?.querySelectorAll('.reveal')
    revealElements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  // Load the full history of the selected / compared cattle on demand
  useEffect(() => {
    const wantedIds = Array.from(new Set([selectedId, ...comparingIds])).filter((id): id is string => !!id)

    for (const id of wantedIds) {
      if (history[id] || failedHistoryIds.includes(id) || historyRequests.current.has(id)) continue
      const item = fullCattleData.find(c => c.id === id)
      if (!item) continue

      historyRequests.current.add(id)
      fetch(`/api/cattle/${encodeURIComponent(item.code)}`)
        .then(res => {
          if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
          return res.json()
        })
        .then((details: CattleWithRelations) => setHistory(prev => ({ ...prev, [id]: pickHistory(details) })))
        .catch(err => {
          console.error('Failed to fetch cattle history:', err)
          setFailedHistoryIds(prev => [...prev, id])
        })
        .finally(() => historyRequests.current.delete(id))
    }
  }, [selectedId, comparingIds, fullCattleData, history, failedHistoryIds])

  const withHistory = useCallback(
    (cattle: CattleWithRelations): CattleWithRelations =>
      history[cattle.id] ? { ...cattle, ...history[cattle.id] } : cattle,
    [history]
  )

  const selectedCattle = useMemo(() => {
    const cattle = fullCattleData.find(c => c.id === selectedId)
    return cattle ? withHistory(cattle) : null
  }, [fullCattleData, selectedId, withHistory])

  const comparingCattle = useMemo(
    () =>
      comparingIds
        .map(id => fullCattleData.find(c => c.id === id))
        .filter((c): c is CattleWithRelations => !!c)
        .map(withHistory),
    [comparingIds, fullCattleData, withHistory]
  )

  const isLoadingHistory = !!selectedId && !history[selectedId] && !failedHistoryIds.includes(selectedId)

  // Map to CattleWithLatestWeight for the catalog cards
  const cattle = useMemo<CattleWithLatestWeight[]>(
    () =>
      fullCattleData.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        breed: c.breed,
        status: c.status,
        price: c.price,
        mainImage: c.mainImage,
        quantity: c.quantity,
        lastWeight: c.lastWeight || c.weights?.[0]?.weight || null
      })),
    [fullCattleData]
  )

  // Handler when user selects a cow from catalog
  const handleSelectCattle = (c: { id: string }) => {
    setSelectedId(c.id)
  }

  // Updates the compare list, remembering it across page navigations
  const updateComparing = (update: (prev: string[]) => string[]) => {
    setComparingIds(prev => {
      const next = update(prev)
      try {
        localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable (private browsing, etc.) - selection still works for this session
      }
      return next
    })
  }

  // Handler for compare selection
  const handleCompareSelect = (c: CattleWithRelations) => {
    updateComparing(prev =>
      prev.includes(c.id) ? prev.filter(id => id !== c.id) : prev.length >= MAX_COMPARE ? prev : [...prev, c.id]
    )
  }

  // Open compare modal
  const handleOpenCompare = () => {
    // Start from the selected cattle when nothing has been picked yet
    if (comparingIds.length === 0 && selectedId) {
      updateComparing(() => [selectedId])
    }
    setCompareModalOpen(true)
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-[hsl(var(--cream2))]">
      <HeroSection
        cattle={fullCattleData}
        selectedCattle={selectedCattle}
        onSelectCattle={handleSelectCattle}
        isLoading={isLoading}
      />
      <JourneySection />
      {/* KATALOG - Combined Swiper/Grid with Toggle */}
      <CatalogSection
        cattle={cattle}
        onSelect={handleSelectCattle}
        selectedId={selectedId ?? undefined}
        allCattle={fullCattleData}
        onCompareSelect={handleCompareSelect}
        comparingIds={comparingIds}
      />

      {/* Compare Drawer */}
      {comparingCattle.length > 0 && (
        <CompareDrawer
          selectedCattle={comparingCattle}
          onOpenModal={handleOpenCompare}
          onRemove={handleCompareSelect}
          onClear={() => updateComparing(() => [])}
        />
      )}

      {/* PANTAU PERKEMBANGAN - Below Katalog */}
      <PantauPerkembanganSection
        cattle={selectedCattle}
        isLoadingHistory={isLoadingHistory}
        allCattle={fullCattleData}
        comparingCattle={comparingCattle}
        onCompareSelect={handleCompareSelect}
        onOpenCompare={handleOpenCompare}
      />
      <TrustRow />
      <RecentComments />
      <CTASection />

      {/* Compare Modal */}
      <CompareModalWrapper
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        selectedCattle={comparingCattle}
        allCattle={fullCattleData}
        onSelectCattle={handleCompareSelect}
      />
    </div>
  )
}

// Compare Drawer Component
function CompareDrawer({
  selectedCattle,
  onOpenModal,
  onRemove,
  onClear
}: {
  selectedCattle: CattleWithRelations[]
  onOpenModal: () => void
  onRemove: (cattle: CattleWithRelations) => void
  onClear: () => void
}) {
  return (
    <div
      id="compareDrawer"
      className="fixed bottom-3 left-1/2 z-[85] flex items-center gap-3 rounded-2xl border border-[hsl(var(--line))] bg-white p-3 shadow-2xl"
      style={{ width: 'min(760px, calc(100vw - 24px))', transform: 'translateX(-50%)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[hsl(var(--forest))]">
          <Columns3 className="h-3.5 w-3.5" />
          Bandingkan Sapi
        </div>
        <div className="text-[8px] text-[hsl(var(--forest))/50]">
          {selectedCattle.length} dari 3 sapi dipilih
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="rounded-lg border border-[hsl(var(--line))] px-3 py-2 text-[8px] font-semibold text-[hsl(var(--forest))]"
        >
          Kosongkan
        </button>
        <button
          onClick={onOpenModal}
          disabled={selectedCattle.length < 2}
          className={`rounded-lg px-3 py-2 text-[8px] font-bold transition-colors ${
            selectedCattle.length >= 2
              ? 'bg-[hsl(var(--forest))] text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Lihat Perbandingan
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {selectedCattle.map(cattle => (
          <div
            key={cattle.id}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))] px-2 py-1.5"
          >
            <div
              className="h-9 w-9 rounded bg-cover bg-center"
              style={{
                // Small resized copy via the image proxy, not the full-size Drive original
                backgroundImage: cattle.mainImage && !isVideoUrl(cattle.mainImage)
                  ? `url('${getDirectImageUrl(cattle.mainImage, 96)}')`
                  : undefined,
              }}
            />
            <div>
              <div className="text-[8px] font-bold text-[hsl(var(--forest))]">{cattle.name}</div>
              <div className="text-[7px] text-[hsl(var(--forest))/45]">{cattle.code}</div>
            </div>
            <button
              onClick={() => onRemove(cattle)}
              className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[hsl(var(--forest))/55 hover:bg-red-100 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
