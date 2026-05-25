import { NextResponse } from "next/server"
import { listOrders, listSales, listWasteHistory, daysAgo } from "@/lib/db"

function parseCost(v: string): number {
  return Number(v.replace(/[^0-9]/g, ""))
}

export async function GET() {
  const sales = await listSales()
  const orders = await listOrders()
  const waste = await listWasteHistory()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = daysAgo(0)
  const todayLabel = `${today.getMonth() + 1}/${today.getDate()}`

  // ----- 이번 달 vs 지난 달 -----
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const inRange = (iso: string, from: Date, to: Date) => {
    const d = new Date(iso)
    return d >= from && d <= to
  }
  const thisMonthSales = sales
    .filter((s) => inRange(s.date, thisMonthStart, today))
    .reduce((sum, s) => sum + s.amount, 0)
  const lastMonthSales = sales
    .filter((s) => inRange(s.date, lastMonthStart, lastMonthEnd))
    .reduce((sum, s) => sum + s.amount, 0)
  const salesChange =
    lastMonthSales > 0 ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 1000) / 10 : 0



  // ----- 주간 차트 (지난 7일, 일자 라벨) -----
  const weekly: Array<{
    date: string
    label: string
    sales: number
    isToday: boolean
  }> = []
  for (let i = 6; i >= 0; i--) {
    const dISO = daysAgo(i)
    const date = new Date(dISO)
    const daySales = sales.filter((s) => s.date === dISO).reduce((sum, s) => sum + s.quantity, 0)
    weekly.push({
      date: dISO,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      sales: daySales,
      isToday: dISO === todayISO,
    })
  }

  // ----- 월간 차트 (지난 30일) -----
  const monthly: Array<{
    date: string
    label: string
    sales: number
    isToday: boolean
  }> = []
  for (let i = 29; i >= 0; i--) {
    const dISO = daysAgo(i)
    const date = new Date(dISO)
    const daySales = sales.filter((s) => s.date === dISO).reduce((sum, s) => sum + s.quantity, 0)
    monthly.push({
      date: dISO,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      sales: daySales,
      isToday: dISO === todayISO,
    })
  }

  // ----- TOP 5 (지난 30일) -----
  const last30 = new Set<string>()
  for (let i = 0; i < 30; i++) last30.add(daysAgo(i))
  const productAgg = new Map<string, { sales: number; revenue: number }>()
  const productPrev = new Map<string, number>()
  const last60to31 = new Set<string>()
  for (let i = 30; i < 60; i++) last60to31.add(daysAgo(i))
  for (const s of sales) {
    if (last30.has(s.date)) {
      const cur = productAgg.get(s.menu) || { sales: 0, revenue: 0 }
      cur.sales += s.quantity
      cur.revenue += s.amount
      productAgg.set(s.menu, cur)
    }
    if (last60to31.has(s.date)) {
      productPrev.set(s.menu, (productPrev.get(s.menu) || 0) + s.quantity)
    }
  }
  const topProducts = [...productAgg.entries()]
    .sort((a, b) => b[1].sales - a[1].sales)
    .slice(0, 5)
    .map(([name, v], idx) => {
      const prev = productPrev.get(name) || 0
      const trend: "up" | "down" | "stable" =
        v.sales > prev * 1.05 ? "up" : v.sales < prev * 0.95 ? "down" : "stable"
      return {
        rank: idx + 1,
        name,
        sales: v.sales,
        revenue: `₩${v.revenue.toLocaleString()}`,
        trend,
      }
    })

  // ----- 카테고리별 매출 -----
  const catAgg = new Map<string, number>()
  for (const s of sales) {
    if (inRange(s.date, thisMonthStart, today)) {
      catAgg.set(s.category, (catAgg.get(s.category) || 0) + s.amount)
    }
  }
  const totalCat = [...catAgg.values()].reduce((a, b) => a + b, 0)
  const categoryData = [...catAgg.entries()].map(([name, amount]) => ({
    name,
    value: totalCat > 0 ? Math.round((amount / totalCat) * 1000) / 10 : 0,
    amount: `₩${amount.toLocaleString()}`,
  }))



  return NextResponse.json({
    stats: {
      totalSales: thisMonthSales,
      totalSalesChangePct: salesChange,
    },
    weekly,
    monthly,
    todayLabel,
    topProducts,
    categoryData,
  })
}
