import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Columns3, Check } from 'lucide-react'
import { Status } from '@samadya/shared/types'
import { formatCurrency, formatWeight } from '@samadya/shared/lib/utils/formatters'
import { getDirectImageUrl, getVideoUrl, isVideoUrl } from '@samadya/shared/lib/utils/imageUrl'
import { VideoCardThumbnail } from './VideoCardThumbnail'

interface CattleCardProps {
  id: string
  code: string
  name: string
  breed: string
  status: Status
  price: number
  lastWeight: number | null
  mainImage: string | null
  quantity?: number
  adg?: number | null
  progressPercentage?: number | null
  isSelected?: boolean
  isComparing?: boolean
  onClick?: () => void
  onCompare?: () => void
}

export function CattleCard({
  id,
  code,
  name,
  breed,
  status,
  price,
  lastWeight,
  mainImage,
  quantity = 1,
  adg,
  progressPercentage,
  isSelected = false,
  isComparing = false,
  onClick,
  onCompare,
}: CattleCardProps) {
  const [imageError, setImageError] = useState(false)
  const isSold = status === 'SOLD'
  const isBooked = status === 'BOOKED'

  // Use fallback image URL if optimized URL fails
  const imageSrc = imageError ? mainImage : getDirectImageUrl(mainImage)

  return (
    <article
      className={`catalog-card-v2 min-w-[180px] rounded-lg border bg-white shadow-card lg:min-w-0 overflow-hidden ${
        isSold || isBooked ? 'opacity-75' : ''
      } ${isSelected ? 'border-[hsl(var(--gold))] ring-2 ring-[hsl(var(--gold))]' : 'border-[hsl(var(--line))]'}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        {mainImage && !isVideoUrl(mainImage) ? (
          <>
            <Image
              src={imageSrc || '/placeholder-cattle.png'}
              alt={name}
              fill
              className={`object-cover transition-transform duration-300 ${
                isSold || isBooked ? '' : 'group-hover:scale-105'
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => {
                if (!imageError) {
                  setImageError(true)
                }
              }}
            />
            {isSold && (
              <>
                <div className="absolute left-2 top-2 z-20">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#FADCE0] px-2.5 py-1 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-red-600"></div>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-700">SOLD</span>
                  </div>
                </div>
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className="absolute inset-0 border-2 border-white/60 rounded-lg transform rotate-[-25deg]"></div>
                    <span className="relative block transform rotate-[-25deg] text-4xl font-extrabold uppercase tracking-widest text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]" style={{
                      WebkitTextStroke: '2px white',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 8px rgba(0,0,0,0.3)'
                    }}>
                      SOLD
                    </span>
                  </div>
                </div>
              </>
            )}
            {isBooked && (
              <div className="absolute left-2 top-2 z-20">
                <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700">BOOKING</span>
                </div>
              </div>
            )}
          </>
        ) : mainImage && isVideoUrl(mainImage) ? (
          <VideoCardThumbnail videoUrl={getVideoUrl(mainImage)} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[hsl(var(--cream))]">
            <span className="text-[10px] text-[hsl(var(--forest))/50]">Tidak Ada Foto</span>
          </div>
        )}
        {progressPercentage != null && !isSold && !isBooked && (
          <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[7px] font-bold text-[hsl(var(--forest))] shadow-sm">
            {Math.round(progressPercentage)}%
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-[11px] font-bold text-[hsl(var(--forest))] truncate">{name}</h4>
            <p className="mt-0.5 text-[8px] text-[hsl(var(--forest))/55] truncate">{code} - {breed}</p>
          </div>
          {onCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare() }}
              className={`compare-toggle flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[7px] font-bold ${
                isComparing ? 'border-[hsl(var(--forest))] bg-[hsl(var(--forest))] text-white' : 'border-[hsl(var(--line))] bg-white text-[hsl(var(--forest))]'
              }`}
            >
              {isComparing ? <><Check className="h-3 w-3" />Dipilih</> : <><Columns3 className="h-3 w-3" />Bandingkan</>}
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[8px]">
          <div className="rounded bg-[hsl(var(--cream))] px-2 py-1.5">
            <span className="text-[hsl(var(--forest))/45]">Bobot</span>
            <div className="font-bold text-[hsl(var(--forest))]">{formatWeight(lastWeight)}</div>
          </div>
          <div className="rounded bg-[hsl(var(--cream))] px-2 py-1.5">
            <span className="text-[hsl(var(--forest))/45]">ADG</span>
            <div className="font-bold text-[hsl(var(--forest))]">{adg != null ? `${adg.toFixed(2)} kg` : '-'}</div>
          </div>
        </div>

        <div className="mt-2 text-[11px] font-extrabold text-[hsl(var(--forest))]">{formatCurrency(price)}</div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {isSold || isBooked ? (
            <button disabled className="col-span-2 cursor-not-allowed rounded-md bg-gray-100 px-2 py-2 text-[8px] font-semibold text-gray-400">Tidak Tersedia</button>
          ) : quantity === 0 ? (
            <button disabled className="col-span-2 cursor-not-allowed rounded-md border border-red-200 bg-red-50 px-2 py-2 text-[8px] font-semibold text-red-400">Stok Habis</button>
          ) : (
            <>
              <Link href={`/sapi/${code}`} onClick={(e) => e.stopPropagation()}
                className="rounded-md bg-[hsl(var(--forest))] px-2 py-2 text-center text-[8px] font-bold text-white hover:bg-[hsl(var(--forest2))] transition-colors">Detail</Link>
              <button onClick={(e) => { e.stopPropagation(); onCompare?.() }}
                className={`rounded-md border px-2 py-2 text-center text-[8px] font-semibold transition-colors ${
                  isComparing ? 'border-[hsl(var(--forest))] bg-[hsl(var(--forest))] text-white' : 'border-[hsl(var(--line))] bg-white text-[hsl(var(--forest))] hover:bg-[hsl(var(--cream))]'
                }`}>
                {isComparing ? 'Dipilih' : 'Bandingkan'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
