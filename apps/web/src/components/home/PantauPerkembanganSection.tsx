'use client'

import { useState } from 'react'
import { CattleWithRelations } from '@samadya/shared/types'
import { SelectedCattleDetail } from './SelectedCattleDetail'
import { TrackingTabs } from './TrackingTabs'
import { CompareModal } from './CompareModal'

interface PantauPerkembanganSectionProps {
  cattle: CattleWithRelations | null
  /** Full history of `cattle` is still loading */
  isLoadingHistory?: boolean
  allCattle?: CattleWithRelations[]
  comparingCattle?: CattleWithRelations[]
  onCompareSelect?: (cattle: CattleWithRelations) => void
  onOpenCompare?: () => void
}

export function PantauPerkembanganSection({
  cattle,
  isLoadingHistory = false,
  allCattle = [],
  comparingCattle = [],
  onCompareSelect,
  onOpenCompare
}: PantauPerkembanganSectionProps) {
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<CattleWithRelations[]>([])

  const handleOpenCompare = () => {
    const initial = cattle ? [cattle] : comparingCattle.slice(0, 3)
    setSelectedForCompare(initial)
    setCompareModalOpen(true)
  }

  const handleSelectCattle = (c: CattleWithRelations) => {
    if (onCompareSelect) {
      onCompareSelect(c)
    } else {
      setSelectedForCompare(prev => {
        if (prev.find(x => x.id === c.id)) {
          return prev.filter(x => x.id !== c.id)
        }
        if (prev.length >= 3) return prev
        return [...prev, c]
      })
    }
  }

  const handleClose = () => {
    setCompareModalOpen(false)
  }

  const activeComparingCattle = onCompareSelect ? comparingCattle : selectedForCompare

  return (
    <section className="reveal mx-auto max-w-[1400px] px-3 pb-4 sm:px-5 sm:pb-6 lg:px-8">
      <div className="rounded-xl border border-[hsl(var(--line))] bg-white shadow-sm overflow-hidden">
        {/* Grid diset items-stretch agar sidebar & main memiliki tinggi yang sama */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] items-stretch">

          {/* Left Sidebar - Dibuat h-full & flex agar menyerap tinggi container */}
          <aside className="flex flex-col h-full border-b border-[hsl(var(--line))] p-3 sm:p-5 lg:border-b-0 lg:border-r bg-[hsl(var(--cream))/10]">
            <SelectedCattleDetail
              cattle={cattle}
              onCompare={onOpenCompare || handleOpenCompare}
              isComparing={cattle ? comparingCattle.some(c => c.id === cattle.id) : false}
            />
          </aside>

          {/* Right Main Content - Tracking Tabs */}
          <div className="p-3 sm:p-5 min-w-0">
            <TrackingTabs cattle={cattle} isLoadingHistory={isLoadingHistory} />
          </div>

        </div>
      </div>

      {/* Compare Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={handleClose}
        selectedCattle={activeComparingCattle}
        allCattle={allCattle}
        onSelectCattle={handleSelectCattle}
      />
    </section>
  )
}
