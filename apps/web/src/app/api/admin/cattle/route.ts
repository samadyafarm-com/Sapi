import { NextRequest, NextResponse } from 'next/server'
import { Status } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getCurrentUser } from '@/lib/auth/jwt'
import { getPublicCattleList } from '@/lib/cattle/public-cattle'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100
const VALID_STATUSES = new Set<string>(Object.values(Status))

// "AVAILABLE,BOOKED" -> ['AVAILABLE', 'BOOKED']; null if any value isn't a real status
function parseStatusList(value: string | null): Status[] | null {
  if (!value) return []
  const statuses = value.split(',').map((s) => s.trim())
  return statuses.every((s) => VALID_STATUSES.has(s)) ? (statuses as Status[]) : null
}

// Auto-generate cattle code as SP-<year><month>-<sequence>, e.g. SP-202602-001
async function generateCattleCode(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `SP-${yearMonth}-`

  const lastCattle = await prisma.cattle.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let nextNum = 1
  if (lastCattle) {
    // Slice off the known prefix rather than splitting on '-' so the
    // extracted sequence can't accidentally swallow the year/month too
    // (that mistake previously produced codes like "SP-20262026002").
    const lastNum = parseInt(lastCattle.code.slice(prefix.length), 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = parseStatusList(searchParams.get('status'))
    const excludeStatus = parseStatusList(searchParams.get('excludeStatus'))
    if (!status || !excludeStatus) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }

    const limitParam = parseInt(searchParams.get('limit') || '', 10)
    const limit = Number.isNaN(limitParam) ? MAX_LIMIT : Math.min(Math.max(limitParam, 1), MAX_LIMIT)

    // This route is called unauthenticated by the public site (homepage /
    // katalog), so it serves the same lean, cost-field-free list those
    // pages pre-render. A cattle's full history comes from /api/cattle/[code].
    const items = await getPublicCattleList({ status, excludeStatus, limit })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    console.error('Error fetching cattle:', error)
    return NextResponse.json({ error: 'Failed to fetch cattle' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Auto-generate code if not provided
    let code = body.code
    if (!code) {
      code = await generateCattleCode()
    }

    // Check if code already exists
    const existing = await prisma.cattle.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Kode sapi sudah digunakan' }, { status: 400 })
    }

    const cattle = await prisma.cattle.create({
      data: {
        code,
        name: body.name,
        breed: body.breed,
        status: body.status || 'AVAILABLE',
        birthDate: new Date(body.birthDate),
        height: body.height ? parseFloat(body.height) : null,
        price: parseFloat(body.price),
        targetWeight: body.targetWeight ? parseFloat(body.targetWeight) : null,
        description: body.description || null,
        mainImage: body.mainImage || null,
        quantity: body.quantity ? parseInt(body.quantity) : 1,
      },
    })

    return NextResponse.json({ success: true, data: cattle })
  } catch (error) {
    console.error('Error creating cattle:', error)
    return NextResponse.json({ error: 'Failed to create cattle' }, { status: 500 })
  }
}
