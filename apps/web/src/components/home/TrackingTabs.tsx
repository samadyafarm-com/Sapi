'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CattleWithRelations } from '@samadya/shared/types'
import { formatWeight, formatDate } from '@samadya/shared/lib/utils/formatters'
import { calculateWeightStats } from '@samadya/shared/lib/utils/calculations'
import { WeightChart } from './WeightChart'
import { Sprout, Wheat, Pill, Droplets, Loader2 } from 'lucide-react'
import { MediaTab } from '../cattle/MediaTab'

interface TrackingTabsProps {
  cattle: CattleWithRelations | null
  /** The selected cattle's full history is still being fetched */
  isLoadingHistory?: boolean
}

type TabKey = 'ringkasan' | 'timbang' | 'kesehatan' | 'pakan' | 'dokumentasi'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'timbang', label: 'Riwayat Timbang' },
  { key: 'kesehatan', label: 'Riwayat Kesehatan' },
  { key: 'pakan', label: 'Pakan' },
  { key: 'dokumentasi', label: 'Dokumentasi' },
]

export function TrackingTabs({ cattle, isLoadingHistory = false }: TrackingTabsProps) {
  const [selectedTab, setSelectedTab] = useState<TabKey>('ringkasan')
  // Tab panels stay hidden while the history loads, so they never flash
  // "Belum ada ..." for records that simply haven't arrived yet
  const activeTab = isLoadingHistory ? null : selectedTab

  if (!cattle) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--line))] bg-[hsl(var(--cream))/30] p-6 text-center">
        <div className="w-full max-w-md space-y-3">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-16 animate-pulse rounded bg-[hsl(var(--line))]" />
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <div className="mx-auto h-3.5 w-3/4 animate-pulse rounded bg-[hsl(var(--line))]" />
            <div className="mx-auto h-3.5 w-1/2 animate-pulse rounded bg-[hsl(var(--line))]" />
          </div>
        </div>
        <p className="mt-4 text-xs text-[hsl(var(--forest))/50]">
          Pilih sapi dari katalog untuk melihat detail perkembangan
        </p>
      </div>
    )
  }

  const weights = cattle.weights || []
  const healthRecords = cattle.healthRecords || []
  const feedRecords = cattle.feedRecords || []
  const media = cattle.media || []
  const weightStats = calculateWeightStats(weights)

  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
  )

  const lastWeight = sortedWeights[sortedWeights.length - 1]?.weight
  const firstWeight = sortedWeights[0]?.weight
  const totalGain = lastWeight && firstWeight ? lastWeight - firstWeight : 0

  const birthDate = cattle.birthDate ? new Date(cattle.birthDate) : null
  const ageMonths = birthDate
    ? Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null

  const latestHealth = healthRecords[0]

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tab Navigation Header */}
      <div className="scroll-thin flex gap-2 overflow-x-auto border-b border-[hsl(var(--line))] pb-2 text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`whitespace-nowrap rounded-md px-3.5 py-2 font-semibold transition-all ${
              selectedTab === tab.key
                ? 'bg-[hsl(var(--forest))] text-white shadow-sm'
                : 'text-[hsl(var(--forest))/75] hover:bg-[hsl(var(--cream))]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <div className="w-full">
        {isLoadingHistory && (
          <div className="flex h-48 items-center justify-center gap-2 text-xs text-[hsl(var(--forest))/60]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat riwayat perkembangan...
          </div>
        )}

        {/* RINGKASAN TAB */}
        {activeTab === 'ringkasan' && (
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Main Box: Metrics Grid + Chart (Width 7/12) */}
            <div className="flex flex-col gap-4 lg:col-span-7">
              {/* Stat Cards Matrix */}
              <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Statistik Utama</div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">Berat Terakhir</div>
                    <div className="text-sm font-bold text-[hsl(var(--forest))]">{formatWeight(lastWeight || null)}</div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">
                      {sortedWeights.length > 0
                        ? formatDate(new Date(sortedWeights[sortedWeights.length - 1].measurementDate))
                        : '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">Kenaikan Total</div>
                    <div className="text-sm font-bold text-[hsl(var(--forest))]">
                      {totalGain > 0 ? `+${formatWeight(totalGain)}` : '-'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">Sejak Awal</div>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">ADG Rata-rata</div>
                    <div className="text-sm font-bold text-[hsl(var(--forest))]">
                      {weightStats.adg?.toFixed(2) || '-'} kg/hr
                    </div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">Pertumbuhan</div>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">Target Bobot</div>
                    <div className="text-sm font-bold text-[hsl(var(--forest))]">{formatWeight(cattle.targetWeight)}</div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">Target Qurban</div>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">Umur Sapi</div>
                    <div className="text-sm font-bold text-[hsl(var(--forest))]">{ageMonths ? `${ageMonths} Bulan` : '-'}</div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">Estimasi Usia</div>
                  </div>

                  <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/20] p-2.5 text-xs">
                    <div className="text-[hsl(var(--forest))/60] text-[10px]">Status Kesehatan</div>
                    <div className="truncate text-sm font-bold text-[hsl(var(--forest))]">
                      {latestHealth?.status
                        ? latestHealth.status.charAt(0).toUpperCase() + latestHealth.status.slice(1).toLowerCase()
                        : 'Sehat'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--forest))/50]">Kondisi Aktif</div>
                  </div>
                </div>
              </div>

              {/* Weight Chart Container */}
              <div className="flex-1 rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-[hsl(var(--forest))]">Grafik Kenaikan Bobot</div>
                  <span className="rounded border border-[hsl(var(--line))] px-2 py-0.5 text-[10px] text-[hsl(var(--forest))/60]">
                    Semua Riwayat
                  </span>
                </div>
                <div className="w-full">
                  <WeightChart weights={sortedWeights} height={180} />
                </div>
              </div>
            </div>

            {/* Right Columns: Quick Summaries (Width 5/12) */}
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
              {/* Riwayat Timbang Box */}
              <div className="flex flex-col rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Riwayat Timbang Terakhir</div>
                <div className="flex-1 space-y-2">
                  {sortedWeights.length > 0 ? (
                    sortedWeights.slice(-4).map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] px-3 py-2 text-xs"
                      >
                        <span className="text-[hsl(var(--forest))/70]">{formatDate(new Date(w.measurementDate))}</span>
                        <span className="font-semibold text-[hsl(var(--forest))]">{formatWeight(w.weight)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs text-[hsl(var(--forest))/50]">Belum ada data timbang</p>
                  )}
                </div>
              </div>

              {/* Riwayat Kesehatan Box */}
              <div className="flex flex-col rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Catatan Kesehatan</div>
                <div className="flex-1 space-y-2">
                  {healthRecords.length > 0 ? (
                    healthRecords.slice(0, 3).map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-2.5 text-xs"
                      >
                        <div className="font-semibold text-[hsl(var(--forest))]">
                          {formatDate(new Date(record.recordDate))}
                        </div>
                        <div className="truncate text-[hsl(var(--forest))/70]">{record.healthType}</div>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs text-[hsl(var(--forest))/50]">Belum ada catatan kesehatan</p>
                  )}
                </div>
              </div>

              {/* Pakan Box */}
              <div className="flex flex-col rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Program Pakan</div>
                <div className="grid grid-cols-2 gap-2">
                  {feedRecords.length > 0 ? (
                    feedRecords.slice(0, 4).map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-2 text-[10px]"
                      >
                        <div className="truncate font-semibold text-[hsl(var(--forest))]">{record.feedType}</div>
                        <div className="text-[hsl(var(--forest))/60]">{record.frequency}</div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-2 text-[10px]">
                        <div className="font-semibold text-[hsl(var(--forest))]">Rumput Gajah</div>
                        <div className="text-[hsl(var(--forest))/60]">2x sehari</div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-2 text-[10px]">
                        <div className="font-semibold text-[hsl(var(--forest))]">Konsentrat</div>
                        <div className="text-[hsl(var(--forest))/60]">2 kg/hari</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIMBANG TAB */}
        {activeTab === 'timbang' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Rincian Penimbangan</div>
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {sortedWeights.length > 0 ? (
                  Object.entries(
                    sortedWeights.reduce((acc, w) => {
                      const date = new Date(w.measurementDate)
                      const monthKey = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                      if (!acc[monthKey]) acc[monthKey] = []
                      acc[monthKey].push(w)
                      return acc
                    }, {} as Record<string, typeof sortedWeights>)
                  ).map(([month, monthWeights]) => (
                    <div key={month}>
                      <div className="mb-1 text-xs font-bold text-[hsl(var(--forest))]">{month}</div>
                      <div className="space-y-1.5">
                        {monthWeights.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center justify-between rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] px-3 py-2 text-xs"
                          >
                            <span className="text-[hsl(var(--forest))/75]">{formatDate(new Date(w.measurementDate))}</span>
                            <span className="font-bold text-[hsl(var(--forest))]">{formatWeight(w.weight)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[hsl(var(--line))] p-6 text-center">
                    <p className="text-xs text-[hsl(var(--forest))/50]">Belum ada riwayat timbang</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Grafik Perkembangan</div>
              <WeightChart weights={sortedWeights} height={280} />
            </div>
          </div>
        )}

        {/* KESEHATAN TAB */}
        {activeTab === 'kesehatan' && (
          <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Riwayat Kesehatan</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {healthRecords.length > 0 ? (
                healthRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col justify-between rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-xs"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-[hsl(var(--forest))]">
                          {formatDate(new Date(record.recordDate))}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            record.status === 'SEHAT'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'SAKIT'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                      <p className="font-medium text-[hsl(var(--forest))/80]">{record.healthType}</p>
                      {record.notes && <p className="mt-1 text-[hsl(var(--forest))/60]">{record.notes}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-lg border border-dashed border-[hsl(var(--line))] p-8 text-center">
                  <p className="text-xs text-[hsl(var(--forest))/50]">Belum ada riwayat kesehatan</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAKAN TAB */}
        {activeTab === 'pakan' && (
          <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-bold text-[hsl(var(--forest))]">Pemberian Pakan</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {feedRecords.length > 0 ? (
                feedRecords.map((record) => {
                  const IconComponent = record.feedType.toLowerCase().includes('rumput')
                    ? Sprout
                    : record.feedType.toLowerCase().includes('konsentrat')
                    ? Wheat
                    : record.feedType.toLowerCase().includes('vitamin')
                    ? Pill
                    : Sprout

                  return (
                    <div
                      key={record.id}
                      className="flex flex-col justify-between rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-xs"
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--cream))] text-[hsl(var(--forest))]">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-[hsl(var(--forest))]">{record.feedType}</div>
                            <div className="text-[10px] text-[hsl(var(--forest))/55]">{record.frequency}</div>
                          </div>
                        </div>
                        {record.amount && <div className="font-medium text-[hsl(var(--forest))/70]">{record.amount}</div>}
                        {record.notes && <p className="mt-1 text-[10px] text-[hsl(var(--forest))/60]">{record.notes}</p>}
                      </div>
                      <div className="mt-2 text-[10px] text-[hsl(var(--forest))/50]">
                        {formatDate(new Date(record.recordDate))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <>
                  <div className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-xs">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--cream))] text-[hsl(var(--forest))]">
                        <Sprout className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[hsl(var(--forest))]">Rumput Gajah</div>
                        <div className="text-[10px] text-[hsl(var(--forest))/55]">2x sehari</div>
                      </div>
                    </div>
                    <div className="text-[hsl(var(--forest))/70]">Pakan utama hijauan</div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-xs">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--cream))] text-[hsl(var(--forest))]">
                        <Wheat className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[hsl(var(--forest))]">Konsentrat</div>
                        <div className="text-[10px] text-[hsl(var(--forest))/55]">2 kg / hari</div>
                      </div>
                    </div>
                    <div className="text-[hsl(var(--forest))/70]">Menjaga laju ADG</div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-xs">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--cream))] text-[hsl(var(--forest))]">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[hsl(var(--forest))]">Vitamin & Mineral</div>
                        <div className="text-[10px] text-[hsl(var(--forest))/55]">Terjadwal</div>
                      </div>
                    </div>
                    <div className="text-[hsl(var(--forest))/70]">Suplemen harian</div>
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--cream))/10] p-3 text-[10px]">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--cream))] text-[hsl(var(--forest))]">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[hsl(var(--forest))]">Air Bersih</div>
                        <div className="text-[10px] text-[hsl(var(--forest))/55]">Ad libitum</div>
                      </div>
                    </div>
                    <div className="text-[hsl(var(--forest))/70]">Minum tanpa batas</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* DOKUMENTASI TAB */}
        {activeTab === 'dokumentasi' && (
          <div className="rounded-xl border border-[hsl(var(--line))] bg-white p-4 shadow-sm">
            <MediaTab media={media} />
          </div>
        )}
      </div>
    </div>
  )
}