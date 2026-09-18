'use client'

import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { CattleWithRelations } from '@samadya/shared/types'
import { CattleStatusBadge } from '@samadya/shared/components/ui/CattleStatusBadge'
import { formatWeight, formatDate } from '@samadya/shared/lib/utils/formatters'
import { getDirectImageUrl, isVideoUrl } from '@samadya/shared/lib/utils/imageUrl'
import { ScanLine, Columns3, Check, Film } from 'lucide-react'
import { SITE_URL } from '@/lib/site-url'

interface SelectedCattleDetailProps {
  cattle: CattleWithRelations | null
  onCompare?: () => void
  isComparing?: boolean
}

export function SelectedCattleDetail({ cattle, onCompare, isComparing = false }: SelectedCattleDetailProps) {
  if (!cattle) {
    return (
      <div className="h-full rounded-xl border border-dashed border-[hsl(var(--line))] bg-[hsl(var(--cream))]/50 flex flex-col items-center justify-center p-4 text-center min-h-[300px]">
        <img src="/images/cow-seeklogo.png" alt="Sapi" className="w-16 h-16 mb-3 opacity-50" />
        <h3 className="text-sm font-semibold text-[hsl(var(--forest))]">
          Pilih Sapi
        </h3>
        <p className="text-xs text-[hsl(var(--forest))/60] mt-1">
          Pilih sapi dari katalog untuk melihat detail perkembangan
        </p>
      </div>
    )
  }

  const sortedWeights = [...(cattle.weights || [])].sort(
    (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
  )
  const lastWeight = sortedWeights[sortedWeights.length - 1]?.weight
  const firstWeight = sortedWeights[0]?.weight
  const birthDate = cattle.birthDate ? new Date(cattle.birthDate) : null

  // Same absolute URL on server and client (the page is pre-rendered), so the
  // QR code hydrates without a mismatch
  const qrUrl = `${SITE_URL}/sapi/${cattle.code}`

  return (
    <div className="h-full w-full flex flex-col justify-between gap-3">
      {/* Cattle Info Card - Mengisi area atas sampai bawah */}
      <div className="rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--cream))]/70 p-3 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Photo diperbesar dari kiri ke kanan (Full Width 16:9) */}
          <div className="relative aspect-video w-full overflow-hidden rounded bg-[hsl(var(--cream))] border border-[hsl(var(--line))]">
            {cattle.mainImage && !isVideoUrl(cattle.mainImage) ? (
              <Image src={getDirectImageUrl(cattle.mainImage)} alt={cattle.name} fill className="object-cover" sizes="(min-width: 1024px) 300px, 100vw" />
            ) : cattle.mainImage && isVideoUrl(cattle.mainImage) ? (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-[hsl(var(--forest))/20] to-[hsl(var(--forest))/40]">
                <Film className="h-8 w-8 text-[hsl(var(--forest))/50]" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[hsl(var(--forest))/30] text-xs">
                Foto Tidak Tersedia
              </div>
            )}
          </div>

          {/* Info & Teks di Bawah Gambar */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-bold text-[hsl(var(--forest))]">{cattle.name}</span>
              <CattleStatusBadge status={cattle.status} />
            </div>

            <div className="space-y-1 text-xs leading-relaxed text-[hsl(var(--forest))/80] border-t border-[hsl(var(--line))/60] pt-2">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--forest))/60]">Kode Sapi:</span>
                <span className="font-semibold text-[hsl(var(--forest))]">{cattle.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--forest))/60]">Jenis Sapi:</span>
                <span className="font-semibold text-[hsl(var(--forest))]">{cattle.breed}</span>
              </div>
              {birthDate && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--forest))/60]">Tanggal Lahir:</span>
                  <span className="font-medium">{formatDate(birthDate)}</span>
                </div>
              )}
              {firstWeight && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--forest))/60]">Berat Awal:</span>
                  <span className="font-medium">{formatWeight(firstWeight)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[hsl(var(--forest))/60]">Lokasi:</span>
                <span className="font-medium">Kandang Utama</span>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section (Mendorong bagian tengah yang kosong ke bawah) */}
        <div className="mt-4 rounded-lg border border-[hsl(var(--line))] bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[hsl(var(--forest))]">QR Detail Sapi</div>
              <div className="mt-0.5 text-[11px] leading-tight text-[hsl(var(--forest))/60]">
                Scan QR untuk membuka profil detail.
              </div>
            </div>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--cream))] text-[hsl(var(--forest))/80]">
              <ScanLine className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3">
            {/* QR Code */}
            <div className="flex justify-start">
              <div className="aspect-square h-[76px] w-[76px] shrink-0 rounded border border-[hsl(var(--line))] bg-white p-1.5 flex items-center justify-center">
                <QRCodeSVG
                  value={qrUrl}
                  size={64}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#111111"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="grid gap-1 text-[10px] leading-snug text-[hsl(var(--forest))/70]">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-[hsl(var(--olive))] font-bold">&#10003;</span>
                  <span>Masuk ke profil sesuai QR.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-[hsl(var(--olive))] font-bold">&#10003;</span>
                  <span>Lihat timbang & kesehatan.</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={`/sapi/${cattle.code}`}
                  className="w-full rounded-md bg-[hsl(var(--forest))] px-2 py-1.5 text-xs font-bold text-white text-center block transition-colors hover:bg-[hsl(var(--forest))/90]"
                >
                  Lihat Detail Lengkap
                </a>
                {onCompare && (
                  <button
                    onClick={onCompare}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      isComparing
                        ? 'border-[hsl(var(--forest))] bg-[hsl(var(--forest))] text-white'
                        : 'border-[hsl(var(--line))] bg-white text-[hsl(var(--forest))]'
                    }`}
                  >
                    {isComparing ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Dipilih
                      </>
                    ) : (
                      <>
                        <Columns3 className="h-3.5 w-3.5" />
                        Bandingkan
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
