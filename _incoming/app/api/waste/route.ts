import { NextResponse } from "next/server"
import { listExpiring, listWasteHistory, createWasteHistory } from "@/lib/db"

function parseCost(v: string | number | undefined): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return Number(String(v).replace(/[^0-9]/g, ""))
}

export async function GET() {
  const expiring = await listExpiring()
  const history = await listWasteHistory()

  // Weekly waste cost (last 7 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  const prevWeekStart = new Date(weekAgo)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const weekly = history
    .filter((h) => new Date(h.date) >= weekAgo)
    .reduce((sum, h) => sum + parseCost((h as any).loss ?? (h as any).cost), 0)
  const prevWeekly = history
    .filter((h) => {
      const d = new Date(h.date)
      return d >= prevWeekStart && d < weekAgo
    })
    .reduce((sum, h) => sum + parseCost((h as any).loss ?? (h as any).cost), 0)

  const change = prevWeekly > 0
    ? Math.round(((weekly - prevWeekly) / prevWeekly) * 1000) / 10
    : 0

  return NextResponse.json({
    expiring,
    history,
    stats: {
      expiringCount: expiring.length,
      todayExpiringCount: expiring.filter((e) => e.daysLeft <= 1).length,
      weeklyCost: weekly,
      weeklyCostChangePct: change,
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { productId, quantity, reason } = body

    if (!productId || !quantity || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await createWasteHistory(productId, quantity, reason)
    
    if (result) {
      return NextResponse.json({ success: true, result }, { status: 201 })
    } else {
      return NextResponse.json({ error: "Failed to create waste record" }, { status: 500 })
    }
  } catch (error) {
    console.error("Waste API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
