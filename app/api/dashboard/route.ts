import { NextResponse } from "next/server"
import { getStockStatus } from "@/lib/data"
import { listExpiring, listInventory, listSales, daysAgo, daysFromNow } from "@/lib/db"

export async function GET() {
  const inventory = listInventory()
  const sales = listSales()
  const expiring = listExpiring()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayISO = daysAgo(0)
  const yesterdayISO = daysAgo(1)
  const last7 = new Set<string>()
  for (let i = 1; i <= 7; i++) last7.add(daysAgo(i))

  const todayQty = sales.filter((s) => s.date === todayISO).reduce((s, x) => s + x.quantity, 0)
  const yesterdayQty = sales.filter((s) => s.date === yesterdayISO).reduce((s, x) => s + x.quantity, 0)
  const last7Qty = sales.filter((s) => last7.has(s.date)).reduce((s, x) => s + x.quantity, 0)
  const avg7 = last7Qty / 7
  const predictedToday = Math.round(avg7 * 1.02)
  const dayOverDayPct =
    yesterdayQty > 0 ? Math.round(((todayQty - yesterdayQty) / yesterdayQty) * 1000) / 10 : 0

  const lowStock = inventory.filter((i) => getStockStatus(i) === "low").length
  const expiringCount = expiring.length

  // 14일 forecast (지난 7일 실제+예측, 향후 7일 예측)
  const todayLabel = `${today.getMonth() + 1}/${today.getDate()}`
  const forecast: Array<{
    date: string
    actual: number | null
    predicted: number
    isToday: boolean
  }> = []
  for (let i = 6; i >= 0; i--) {
    const dISO = daysAgo(i)
    const day = sales.filter((s) => s.date === dISO).reduce((s, x) => s + x.quantity, 0)
    const date = new Date(dISO)
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    forecast.push({
      date: label,
      actual: day,
      predicted: Math.round(day * (0.95 + Math.random() * 0.1)),
      isToday: label === todayLabel,
    })
  }
  // 향후 7일 예측 (요일 평균 패턴)
  const weekdayAvg: Record<number, { sum: number; count: number }> = {}
  for (let i = 1; i <= 28; i++) {
    const dISO = daysAgo(i)
    const dow = new Date(dISO).getDay()
    const day = sales.filter((s) => s.date === dISO).reduce((s, x) => s + x.quantity, 0)
    if (!weekdayAvg[dow]) weekdayAvg[dow] = { sum: 0, count: 0 }
    weekdayAvg[dow].sum += day
    weekdayAvg[dow].count += 1
  }
  for (let i = 1; i <= 7; i++) {
    const dISO = daysFromNow(i)
    const date = new Date(dISO)
    const dow = date.getDay()
    const avg = weekdayAvg[dow] ? weekdayAvg[dow].sum / weekdayAvg[dow].count : avg7
    forecast.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      actual: null,
      predicted: Math.round(avg * 1.03),
      isToday: false,
    })
  }

  // Alerts
  const lowStockItems = inventory.filter((i) => getStockStatus(i) === "low").slice(0, 1)
  const expiringSoon = expiring.filter((e) => e.daysLeft <= 1).slice(0, 1)

  const alerts: Array<{
    id: number
    type: "urgent" | "warning" | "info"
    time: string
    title: string
    description: string
    action?: string
  }> = []
  let alertId = 1

  if (lowStockItems[0]) {
    const i = lowStockItems[0]
    alerts.push({
      id: alertId++,
      type: "urgent",
      time: "오전 08:30",
      title: "긴급 발주 필요",
      description: `${i.product} 재고 부족 (현재: ${i.currentStock}${i.unit}, 일평균 소비: ${i.dailyUsage}${i.unit})`,
      action: "재고 현황으로 이동",
    })
  }
  if (expiringSoon[0]) {
    const e = expiringSoon[0]
    alerts.push({
      id: alertId++,
      type: "warning",
      time: "오전 08:25",
      title: "유통기한 임박",
      description: `${e.product} ${e.quantity}개 - 내일 유통기한 만료`,
      action: "프로모션 진행 권장",
    })
  }
  alerts.push({
    id: alertId++,
    type: "info",
    time: "오전 07:45",
    title: "날씨 변화 감지",
    description: "내일 기온 상승 예상 (+8°C) - 아이스 음료 수요 증가 예측",
  })
  const lidLow = inventory.find(
    (i) => i.product.includes("플라스틱 뚜껑") && getStockStatus(i) === "low",
  )
  if (lidLow) {
    alerts.push({
      id: alertId++,
      type: "warning",
      time: "오전 07:15",
      title: "재고 부족 예상",
      description: `${lidLow.product} - ${Math.max(1, Math.floor(lidLow.currentStock / Math.max(1, lidLow.dailyUsage)))}일 후 재고 부족 예상`,
      action: "재고 현황으로 이동",
    })
  }

  return NextResponse.json({
    stats: {
      predictedToday,
      dayOverDayPct,
      lowStock,
      expiringCount,
    },
    forecast,
    todayLabel,
    alerts,
  })
}
