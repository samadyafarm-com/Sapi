'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeCheck, Clock3, ClipboardList, Shield, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { CattleWithRelations } from '@samadya/shared/types'
import { getDirectImageUrl, isVideoUrl } from '@samadya/shared/lib/utils/imageUrl'
import { SITE_URL } from '@/lib/site-url'

interface HeroSectionProps {
  cattle: CattleWithRelations[]
  selectedCattle: CattleWithRelations | null
  onSelectCattle: (cattle: CattleWithRelations) => void
  isLoading?: boolean
}

interface CounterProps {
  end: number
  suffix: string
  duration?: number
}

function AnimatedCounter({ end, suffix, duration = 1200 }: CounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true
            const startTime = performance.now()

            const tick = (now: number) => {
              const elapsed = now - startTime
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              const current = Math.floor(end * eased)
              setCount(current)

              if (progress < 1) {
                requestAnimationFrame(tick)
              }
            }

            requestAnimationFrame(tick)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [end, duration])

  const displayValue = end >= 1000 ? count.toLocaleString('id-ID') + '+' : count

  return (
    <div ref={ref} className="counter text-[10px] xs:text-[11px] sm:text-[13px] md:text-[15px] lg:text-[16px] font-extrabold text-[hsl(var(--forest))]">
      {displayValue}{suffix}
    </div>
  )
}

const trustFeatures = [
  { icon: BadgeCheck, text: 'Sapi Pilihan Berkualitas' },
  { icon: Clock3, text: 'Dipantau Secara Berkala' },
  { icon: ClipboardList, text: 'Laporan Transparan' },
  { icon: Shield, text: 'InsyaAllah Sesuai Syariat' },
]

export function HeroSection({ cattle, selectedCattle, onSelectCattle, isLoading }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isSliderChange = useRef(false)

  // Get total count from cattle array
  const totalCattleCount = cattle.length

  // Dynamic stats with real cattle count
  const stats = [
    { value: totalCattleCount, suffix: '', label: 'Sapi Terdaftar' },
    { value: 90, suffix: '%', label: 'Kepuasan %' },
    { value: 24, suffix: '/7', label: 'Jam Monitoring' },
    { value: 100, suffix: '%', label: 'Transparan %' },
  ]

  // Get available cattle with photos (a video can't be the hero image)
  const displayCattle = useMemo(
    () => cattle.filter(c => c.mainImage && !isVideoUrl(c.mainImage)),
    [cattle]
  )
  const currentCattle = displayCattle[currentIndex] || selectedCattle
  const heroImage = currentCattle?.mainImage && !isVideoUrl(currentCattle.mainImage) ? currentCattle.mainImage : null

  // Determine if we should show loading state
  const showLoading = !!isLoading

  // Sync currentIndex when selectedCattle changes from outside (e.g., catalog card click)
  useEffect(() => {
    if (!selectedCattle || displayCattle.length === 0) return

    const index = displayCattle.findIndex(c => c.id === selectedCattle.id)
    if (index !== -1 && index !== currentIndex && !isSliderChange.current) {
      setCurrentIndex(index)
    }
    // Reset flag after use
    isSliderChange.current = false
  }, [selectedCattle, displayCattle, currentIndex])

  // Update selected cattle when slider changes (via arrows/dots)
  const handleSliderChange = useCallback((index: number) => {
    isSliderChange.current = true
    setCurrentIndex(index)
    if (displayCattle[index]) {
      onSelectCattle(displayCattle[index])
    }
  }, [displayCattle, onSelectCattle])

  const goToPrev = () => {
    if (displayCattle.length <= 1) return
    const newIndex = currentIndex === 0 ? displayCattle.length - 1 : currentIndex - 1
    handleSliderChange(newIndex)
  }

  const goToNext = () => {
    if (displayCattle.length <= 1) return
    const newIndex = currentIndex === displayCattle.length - 1 ? 0 : currentIndex + 1
    handleSliderChange(newIndex)
  }

  useEffect(() => {
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

    const revealElements = heroRef.current?.querySelectorAll('.reveal')
    revealElements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  // Not a .reveal (fade-in) element: the hero is above the fold and
  // pre-rendered, so it should paint right away instead of waiting for JS
  return (
    <section ref={heroRef} className="mx-auto grid max-w-full grid-cols-1 items-stretch md:grid-cols-[3.3fr_2.1fr_.9fr] overflow-visible">
      {/* Image Slider - Mobile uses aspect ratio, desktop uses height */}
      <div className="hero-photo relative w-full md:min-h-[280px] lg:min-h-[350px] xl:min-h-[450px] 2xl:min-h-[520px] overflow-hidden">
        {/* Mobile: Aspect ratio container */}
        <div className="relative w-full aspect-[16/10] md:aspect-auto md:absolute md:inset-0">
          {/* Image - next/image (resized for the screen, preloaded with the
              HTML) rather than a CSS background of the full-size original */}
          {showLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--cream))]">
              <Loader2 className="h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-[hsl(var(--forest))] mb-1 sm:mb-2 md:mb-3" />
              <p className="text-[8px] xs:text-[9px] sm:text-xs font-semibold text-[hsl(var(--forest))]">Memuat...</p>
            </div>
          ) : heroImage ? (
            <Image
              src={getDirectImageUrl(heroImage)}
              alt={currentCattle?.name || 'Foto sapi'}
              fill
              priority
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `url('https://images.unsplash.com/photo-1551750590-90f231373f73?auto=format&fit=crop&w=1600&q=85') center/cover no-repeat`,
              }}
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/12 via-transparent to-transparent" />

        {/* Slider Arrows - Only show when not loading and has multiple cattle */}
        {!showLoading && displayCattle.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-0.5 xs:left-1 sm:left-2 top-1/2 z-10 grid h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[hsl(var(--forest))] shadow-lg transition-all hover:bg-white hover:scale-110"
              aria-label="Previous"
            >
              <ChevronLeft className="h-3 w-3 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0.5 xs:right-1 sm:right-2 top-1/2 z-10 grid h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[hsl(var(--forest))] shadow-lg transition-all hover:bg-white hover:scale-110"
              aria-label="Next"
            >
              <ChevronRight className="h-3 w-3 xs:h-4 xs:w-4 sm:h-6 sm:w-6" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-1 xs:bottom-2 sm:bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1 xs:gap-1.5 sm:gap-2">
              {displayCattle.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleSliderChange(index)}
                  className={`h-1.5 w-1.5 xs:h-2 xs:w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-all ${
                    index === currentIndex
                      ? 'scale-125 bg-white'
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Middle Content Section - Responsive */}
      <div className="flex flex-col justify-center bg-[#F4EFE2] px-2 xs:px-3 sm:px-5 py-2 xs:py-3 sm:py-5 md:px-6 md:py-6 lg:px-6 lg:py-6">
        <h1 className="text-[14px] xs:text-[16px] sm:text-[20px] md:text-[24px] lg:text-[28px] xl:text-[32px] 2xl:text-[36px] font-bold leading-[1.1] text-[hsl(var(--forest))]">
          Sapi Anda, Amanah Kami.<br />
          Dipantau Transparan, Hingga Siap Dipilih.
        </h1>
        <p className="mt-1.5 xs:mt-2 sm:mt-3 max-w-[520px] text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] leading-3 xs:leading-4 sm:leading-5 text-[hsl(var(--forest))/75]">
          Setiap sapi pilihan dirawat dengan penuh perhatian di peternakan kami. Anda bisa memantau bobot, kesehatan, dan perawatannya secara berkala sebelum memutuskan membeli.
        </p>

        <div className="mt-2 xs:mt-3 sm:mt-4 flex flex-wrap gap-1 xs:gap-1.5 sm:gap-2.5">
          <Link href="#katalog" className="rounded-md bg-[hsl(var(--forest))] px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2.5 text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-white shadow-card">
            Pilih Sapi
          </Link>
          <Link href="#cara-kerja" className="rounded-md border border-[hsl(var(--forest))/25] bg-white px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2.5 text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-[hsl(var(--forest))]">
            Lihat Cara Kerja
          </Link>
        </div>

        <div className="mt-1.5 xs:mt-2 sm:mt-3 inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 rounded-full border border-[hsl(var(--line))] bg-white px-1.5 xs:px-2 sm:px-3 py-0.5 xs:py-1 sm:py-1.5 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-[hsl(var(--forest))]">
          <BadgeCheck className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-3.5 sm:w-3.5 text-[hsl(var(--olive))]" />
          Semua foto di halaman ini khusus sapi
        </div>

        {/* Stats Grid - Responsive */}
        <div className="mt-2 xs:mt-3 sm:mt-4 md:mt-5 grid grid-cols-4 gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 rounded-lg sm:rounded-xl border border-[hsl(var(--line))/80] bg-white/75 p-1 xs:p-1.5 sm:p-2 md:p-2.5 shadow-card backdrop-blur">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              <div className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-[hsl(var(--forest))/55]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Trust Features - Responsive */}
        <div className="mt-1.5 xs:mt-2 sm:mt-3 md:mt-4 grid grid-cols-2 gap-x-1 xs:gap-x-2 gap-y-0.5 xs:gap-y-1 sm:gap-x-3 sm:gap-y-2 text-[8px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-[hsl(var(--forest))/70]">
          {trustFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5">
              <feature.icon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[hsl(var(--olive))]" />
              <span className="truncate">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Tag Container - Unified unit: Pin + Rope + Card */}
      <div className="relative flex items-start justify-center lg:justify-end overflow-visible bg-[#F1EFE2] px-2 sm:px-3 md:px-4 py-0 sm:py-0 md:py-0 lg:px-4 lg:pr-2">
        {/* Unified tag unit: Pin + Rope + Card stays together on all screen sizes */}
        <div className="relative mr-0.5 sm:mr-1 lg:mr-0">
          <div
            key={currentCattle?.id || 'default'}
            className="paper-pull-up relative z-10 flex flex-col items-center"
          >
            {/* Pin Hanger - Unified with rope, positioned at absolute top */}
            <div className="absolute -top-1 sm:top-0 left-1/2 -translate-x-1/2">
              {/* Unified SVG: Pin circle + rope as one continuous piece */}
              <svg width="12" height="38" viewBox="0 0 12 38" fill="none" className="drop-shadow-md">
                {/* Pin nail head - at very top */}
                <circle cx="6" cy="3" r="2.5" fill="#302111" />
                <circle cx="6" cy="3" r="1.8" fill="#1a1208" />
                {/* Rope - continuous from pin */}
                <rect x="5" y="5" width="2" height="33" rx="1" fill="#6E5030" />
                {/* Rope texture lines */}
                <line x1="5.3" y1="8" x2="6.7" y2="8" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="12" x2="6.7" y2="12" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="16" x2="6.7" y2="16" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="20" x2="6.7" y2="20" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="24" x2="6.7" y2="24" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="28" x2="6.7" y2="28" stroke="#5a4020" strokeWidth="0.5" />
                <line x1="5.3" y1="32" x2="6.7" y2="32" stroke="#5a4020" strokeWidth="0.5" />
              </svg>
            </div>

            {/* Tag Card - connected to rope with no gap */}
            <div className="relative w-[80px] xs:w-[90px] sm:w-[110px] md:w-[130px] lg:w-[145px] xl:w-[155px] rounded-[12px] xs:rounded-[14px] sm:rounded-[16px] md:rounded-[18px] lg:rounded-[20px] bg-gradient-to-b from-[#F7F3E9] via-[#F0EAD8] to-[#E3D9C2] px-1.5 xs:px-2 sm:px-3 md:px-3.5 pb-1.5 xs:pb-2 sm:pb-3 md:pb-3.5 pt-5 sm:pt-6 md:pt-6.5 shadow-2xl border border-[#D4C9B0] -mt-[2px]">
              {/* Eyelet - golden ring at top, connects to rope */}
              <div className="absolute -top-1 sm:-top-0.5 left-1/2 -translate-x-1/2 z-30">
                <div className="relative flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full border-[2px] sm:border-[2px] border-[#9E7B4F] bg-gradient-to-br from-[#D4AF37] via-[#AA7C11] to-[#5B430B] shadow-md">
                  <div className="h-1.5 w-1.5 sm:h-1.8 sm:w-1.8 rounded-full bg-[#302111] shadow-inner" />
                </div>
              </div>

              {/* Website Name */}
              <div className="text-center text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-extrabold tracking-[.02em] text-[hsl(var(--forest))] pt-0.5 sm:pt-1">
                samadyafarm.id
              </div>
              <div className="text-center text-[6px] xs:text-[6.5px] sm:text-[7px] md:text-[7.5px] lg:text-[8px] font-semibold uppercase tracking-[.12em] sm:tracking-[.14em] md:tracking-[.16em] text-[hsl(var(--forest))/70]">
                Sapi Pilihan
              </div>

              {/* Code Plate */}
              <div className="mt-0.5 xs:mt-1 sm:mt-1.5 rounded-[4px] xs:rounded-[5px] sm:rounded-[6px] md:rounded-[8px] border border-[#D4C9B0] bg-gradient-to-b from-[#FFFFFF] to-[#F4EFE2] px-0.5 xs:px-1 sm:px-1.5 py-0.5 xs:py-1 sm:py-1.5 text-center font-extrabold leading-none text-[12px] xs:text-[14px] sm:text-[16px] md:text-[18px] lg:text-[20px] text-[hsl(var(--forest))] shadow-sm">
                {currentCattle?.code || 'NF-0001'}
              </div>

              {/* Breed & Gender */}
              <div className="mt-0.5 xs:mt-1 sm:mt-1.5 text-center text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold uppercase leading-tight text-[hsl(var(--forest))]">
                {currentCattle?.breed || 'LIMOUSIN'}
              </div>
              <div className="text-center text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold uppercase leading-tight text-[hsl(var(--forest))/80]">
                {currentCattle?.gender === 'FEMALE' ? 'BETINA' : 'JANTAN'}
              </div>

              {/* QR Code - generated right in the page, no request to an external QR service */}
              <div className="mx-auto mt-0.5 xs:mt-1 sm:mt-1.5 aspect-square h-[40px] xs:h-[50px] sm:h-[60px] md:h-[70px] lg:h-[80px] w-[40px] xs:w-[50px] sm:w-[60px] md:w-[70px] lg:w-[80px] shrink-0 rounded-[3px] xs:rounded-[4px] sm:rounded-[5px] md:rounded-[6px] border border-[#D4C9B0] bg-white p-0.5 xs:p-1 sm:p-1.5 shadow-sm">
                {showLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Loader2 className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 animate-spin text-[hsl(var(--forest))/50]" />
                    <span className="text-[5px] xs:text-[5.5px] sm:text-[6px] text-[hsl(var(--forest))/50] mt-0.5">Memuat...</span>
                  </div>
                ) : currentCattle ? (
                  <div className="flex h-full items-center justify-center">
                    <QRCodeSVG
                      value={`${SITE_URL}/sapi/${currentCattle.code}`}
                      size={80}
                      level="M"
                      className="h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-[6px] xs:text-[6.5px] sm:text-[7px] text-[hsl(var(--forest))/50]">
                    QR Code
                  </div>
                )}
              </div>

              <div className="mt-0.5 xs:mt-1 sm:mt-1.5 text-center text-[6px] xs:text-[6.5px] sm:text-[7px] md:text-[7.5px] lg:text-[9px] font-bold uppercase tracking-[.02em] sm:tracking-[.03em] md:tracking-[.04em] text-[hsl(var(--forest))/75]">
                SCAN UNTUK PROFIL
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
