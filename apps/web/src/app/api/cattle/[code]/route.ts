import { NextRequest, NextResponse } from 'next/server'
import { calculateWeightStats, estimateTargetCompletion } from '@/lib/utils/calculations'
import { getPublicCattleDetail } from '@/lib/cattle/public-cattle'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // This is an unauthenticated public route - getPublicCattleDetail never
    // includes internal cost/margin fields.
    const cattle = await getPublicCattleDetail({ code: params.code })

    if (!cattle) {
      return NextResponse.json(
        { error: 'Cattle not found' },
        { status: 404 }
      )
    }

    // Calculate weight stats
    const weightData = cattle.weights.map((w) => ({
      weight: w.weight,
      measurementDate: w.measurementDate,
    }))

    const weightStats = calculateWeightStats(weightData)

    // Calculate target estimation
    let targetEstimation = null
    if (cattle.targetWeight && weightStats.lastWeight) {
      targetEstimation = estimateTargetCompletion(
        cattle.targetWeight,
        weightStats.lastWeight,
        weightStats.adg
      )
    }

    // Get last weight
    const lastWeight = cattle.weights.length > 0
      ? cattle.weights[cattle.weights.length - 1].weight
      : null

    return NextResponse.json({
      ...cattle,
      lastWeight,
      weightStats,
      targetEstimation,
    })
  } catch (error) {
    console.error('Error fetching cattle:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cattle' },
      { status: 500 }
    )
  }
}
