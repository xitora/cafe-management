import { NextResponse } from "next/server"
import { listExpiring, listWasteHistory } from "@/lib/db"

function parseCost(v: string): number {
  return Number(v.replace(/[^0-9]/g, ""))
}

export async function GET() {
  const expiring = listExpiring()
  const history = listWasteHistory()

  // Weekly waste cost (last 7 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  const prevWeekStart = new Date(weekAgo)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const weekly = history
    .filter((h) => new Date(h.date) >= weekAgo)
    .reduce((sum, h) => sum + parseCost(h.cost), 0)
  const prevWeekly = history
    .filter((h) => {
      const d = new Date(h.date)
      return d >= prevWeekStart && d < weekAgo
    })
    .reduce((sum, h) => sum + parseCost(h.cost), 0)

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
