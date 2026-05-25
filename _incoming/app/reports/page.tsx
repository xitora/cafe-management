"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Trash2,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DownloadReportModal } from "@/components/download-report-modal"
import { DateRangePicker } from "@/components/date-range-picker"
import { cn } from "@/lib/utils"
import { fetcher, formatKRW } from "@/lib/fetcher"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, ReferenceLine } from "recharts"
import { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartPoint {
  date: string
  label: string
  sales: number
  isToday: boolean
}

interface ReportsResponse {
  stats: {
    totalSales: number
    totalSalesChangePct: number
  }
  weekly: ChartPoint[]
  monthly: ChartPoint[]
  todayLabel: string
  topProducts: Array<{
    rank: number
    name: string
    sales: number
    revenue: string
    trend: "up" | "down" | "stable"
  }>
  categoryData: Array<{ name: string; value: number; amount: string }>
}

const salesChartConfig = {
  sales: { label: "판매량", color: "var(--chart-1)" },
} satisfies ChartConfig

function fmtChange(v: number, invert = false): { text: string; positive: boolean } {
  const positive = invert ? v <= 0 : v >= 0
  return { text: `${v >= 0 ? "+" : ""}${v}%`, positive }
}

export default function ReportsPage() {
  const { data, isLoading } = useSWR<ReportsResponse>("/api/reports", fetcher)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 4, 15),
    to: addDays(new Date(2026, 4, 15), 10),
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    return period === "weekly" ? data.weekly : data.monthly
  }, [data, period])

  const todayLabel = data?.todayLabel

  const stats = data
    ? [
        {
          title: "총 매출",
          value: formatKRW(data.stats.totalSales),
          ...fmtChange(data.stats.totalSalesChangePct),
          description: "전월 대비",
          icon: DollarSign,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-8">
      <div
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">리포트</h1>
          <p className="text-muted-foreground">매출, 발주, 폐기 현황을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button onClick={() => setIsDownloadOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        {isLoading || !data
          ? Array.from({ length: 1 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : stats.map((stat, index) => (
              <Card
                key={stat.title}
                className={cn(
                  "border card-hover transition-all duration-1000",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
                style={{ transitionDelay: `${200 + index * 150}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">
                    <span
                      className={cn(
                        "mr-1 font-medium",
                        stat.positive ? "text-green-600 dark:text-green-400" : "text-destructive",
                      )}
                    >
                      {stat.text}
                    </span>
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card
        className={cn(
          "border card-hover transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "800ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>매출 추이</CardTitle>
              <CardDescription>
                {period === "weekly" ? "최근 7일간 일별 판매량" : "최근 30일간 일별 판매량 (월간 흐름)"}
              </CardDescription>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as "weekly" | "monthly")}>
              <TabsList className="h-8">
                <TabsTrigger value="weekly" className="text-xs">
                  주간
                </TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs">
                  월간
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {data ? (
            <ChartContainer config={salesChartConfig} className="h-72 w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={period === "monthly" ? 3 : 0}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                {todayLabel && (
                  <ReferenceLine
                    x={todayLabel}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "오늘",
                      position: "top",
                      fill: "var(--primary)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {chartData.map((p) => (
                    <Cell
                      key={p.label}
                      fill={p.isToday ? "var(--primary)" : "var(--chart-1)"}
                      fillOpacity={p.isToday ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <Skeleton className="h-72 w-full" />
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border card-hover transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "900ms" }}
      >
        <CardHeader>
          <CardTitle>인기 상품 TOP 5</CardTitle>
          <CardDescription>최근 30일 판매량 기준</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {data?.topProducts.map((product, index) => (
              <div
                key={product.rank}
                className={cn(
                  "flex items-center gap-4 transition-all duration-600",
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                )}
                style={{ transitionDelay: `${1100 + index * 100}ms` }}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    product.rank === 1 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                    product.rank === 2 &&
                      "bg-slate-300/50 text-slate-600 dark:bg-slate-600/50 dark:text-slate-300",
                    product.rank === 3 && "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                    product.rank > 3 && "bg-muted text-muted-foreground",
                  )}
                >
                  {product.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.sales.toLocaleString()}잔
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{product.revenue}</p>
                  <div className="flex items-center justify-end gap-1 text-sm">
                    {product.trend === "up" && (
                      <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                    )}
                    {product.trend === "down" && (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span
                      className={cn(
                        product.trend === "up" && "text-green-600 dark:text-green-400",
                        product.trend === "down" && "text-destructive",
                        product.trend === "stable" && "text-muted-foreground",
                      )}
                    >
                      {product.trend === "up"
                        ? "상승"
                        : product.trend === "down"
                          ? "하락"
                          : "유지"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {!data &&
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
          style={{ transitionDelay: "1300ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              카테고리별 매출
            </CardTitle>
            <CardDescription>이번 달 카테고리별 매출 비중</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {data?.categoryData.map((category, index) => (
                <div
                  key={category.name}
                  className={cn(
                    "flex flex-col gap-2 transition-all duration-600",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                  )}
                  style={{ transitionDelay: `${1500 + index * 100}ms` }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.value}% | {category.amount}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${category.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


      </div>

      <DownloadReportModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} dateRange={dateRange} />
    </div>
  )
}
