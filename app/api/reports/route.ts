import { NextResponse } from "next/server"
import { listOrders, listSales, listWasteHistory, daysAgo, toISO } from "@/lib/db"

function parseCost(v: string): number {
  return Number(v.replace(/[^0-9]/g, ""))
}

export async function GET() {
  const sales = listSales()
  const orders = listOrders()
  const waste = listWasteHistory()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ----- This month vs last month -----
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
  const salesChange = lastMonthSales > 0
    ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 1000) / 10
    : 0

  const thisMonthOrders = orders
    .filter((o) => inRange(o.date, thisMonthStart, today))
    .reduce((sum, o) => sum + parseCost(o.price), 0)
  const lastMonthOrders = orders
    .filter((o) => inRange(o.date, lastMonthStart, lastMonthEnd))
    .reduce((sum, o) => sum + parseCost(o.price), 0)
  const ordersChange = lastMonthOrders > 0
    ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 1000) / 10
    : 0

  const thisMonthWaste = waste
    .filter((w) => inRange(w.date, thisMonthStart, today))
    .reduce((sum, w) => sum + parseCost(w.cost), 0)
  const lastMonthWaste = waste
    .filter((w) => inRange(w.date, lastMonthStart, lastMonthEnd))
    .reduce((sum, w) => sum + parseCost(w.cost), 0)
  const wasteChange = lastMonthWaste > 0
    ? Math.round(((thisMonthWaste - lastMonthWaste) / lastMonthWaste) * 1000) / 10
    : 0

  const profitMargin = thisMonthSales > 0
    ? Math.round(((thisMonthSales - thisMonthOrders - thisMonthWaste) / thisMonthSales) * 1000) / 10
    : 0
  const lastProfitMargin = lastMonthSales > 0
    ? Math.round(((lastMonthSales - lastMonthOrders - lastMonthWaste) / lastMonthSales) * 1000) / 10
    : 0
  const profitChange = Math.round((profitMargin - lastProfitMargin) * 10) / 10

  // ----- Weekly chart (last 7 days) -----
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  const weekly: Array<{ day: string; sales: number; orders: number; waste: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dISO = daysAgo(i)
    const date = new Date(dISO)
    const daySales = sales.filter((s) => s.date === dISO).reduce((sum, s) => sum + s.quantity, 0)
    const dayOrders = orders.filter((o) => o.date === dISO).length
    const dayWaste = waste.filter((w) => w.date === dISO).reduce((sum, w) => sum + parseCost(w.cost), 0)
    weekly.push({
      day: dayLabels[date.getDay()],
      sales: daySales,
      orders: dayOrders,
      waste: Math.round(dayWaste / 1000),
    })
  }

  // ----- Top products (last 30 days) -----
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

  // ----- Category breakdown (this month) -----
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

  // ----- Cost breakdown (synthetic but proportional) -----
  const costData = [
    { name: "원재료비", pct: 45 },
    { name: "인건비", pct: 30 },
    { name: "임대료", pct: 15 },
    { name: "기타", pct: 10 },
  ].map((c, i) => ({
    name: c.name,
    value: c.pct,
    amount: `₩${Math.round((thisMonthSales * c.pct) / 100).toLocaleString()}`,
    color: `bg-chart-${i + 1}`,
  }))

  // ----- Recent reports listing -----
  const recentReports = [
    {
      id: 1,
      title: `${today.getMonth() + 1}월 주간 리포트`,
      type: "weekly",
      date: toISO(today),
      status: "ready",
    },
    {
      id: 2,
      title: `${lastMonthEnd.getMonth() + 1}월 월간 리포트`,
      type: "monthly",
      date: toISO(thisMonthStart),
      status: "ready",
    },
    {
      id: 3,
      title: `${Math.floor(today.getMonth() / 3) + 1}분기 분석 리포트`,
      type: "quarterly",
      date: toISO(thisMonthStart),
      status: "ready",
    },
    {
      id: 4,
      title: "재고 분석 리포트",
      type: "inventory",
      date: daysAgo(3),
      status: "ready",
    },
  ]

  return NextResponse.json({
    stats: {
      totalSales: thisMonthSales,
      totalSalesChangePct: salesChange,
      totalOrders: thisMonthOrders,
      totalOrdersChangePct: ordersChange,
      totalWaste: thisMonthWaste,
      totalWasteChangePct: wasteChange,
      profitMargin,
      profitMarginChangePct: profitChange,
    },
    weekly,
    topProducts,
    categoryData,
    costData,
    recentReports,
  })
}
