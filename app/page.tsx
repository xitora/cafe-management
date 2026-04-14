"use client"

import { useState, useEffect } from "react"
import { 
  TrendingUp, 
  Package, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Download,
  Sparkles,
  AlertCircle,
  Info,
  CloudSun,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AIPredictionModal } from "@/components/ai-prediction-modal"
import { DownloadReportModal } from "@/components/download-report-modal"
import { cn } from "@/lib/utils"
import { forecastData } from "@/lib/data"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const stats = [
  {
    title: "오늘 예상 판매량",
    value: "150잔",
    change: "+8%",
    changeType: "positive",
    description: "전일 대비",
    icon: TrendingUp,
  },
  {
    title: "재고 부족 품목",
    value: "9개",
    description: "긴급 발주 필요",
    icon: Package,
    urgent: true,
  },
  {
    title: "유통기한 임박",
    value: "12개",
    description: "3일 이내 만료",
    icon: Clock,
    warning: true,
  },
]

const alerts = [
  {
    id: 1,
    type: "urgent",
    time: "오전 08:30",
    title: "긴급 발주 필요",
    description: "아메리카노 원두 재고 부족 (현재: 3kg, 일평균 소비: 2kg)",
    action: "발주 권고 페이지로 이동",
    icon: AlertTriangle,
  },
  {
    id: 2,
    type: "warning",
    time: "오전 08:25",
    title: "유통기한 임박",
    description: "샌드위치 10개 - 내일(03/24) 유통기한 만료",
    action: "프로모션 진행 권장",
    icon: AlertCircle,
  },
  {
    id: 3,
    type: "info",
    time: "오전 07:45",
    title: "날씨 변화 감지",
    description: "내일 기온 상승 예상 (+8°C) - 아이스 음료 수요 증가 예측",
    icon: CloudSun,
  },
  {
    id: 4,
    type: "warning",
    time: "오전 07:15",
    title: "재고 부족 예상",
    description: "플라스틱 뚜껑 - 2일 후 재고 부족 예상",
    action: "발주 권고 페이지로 이동",
    icon: Info,
  },
]

const chartConfig = {
  actual: {
    label: "실제 판매량",
    color: "var(--chart-1)",
  },
  predicted: {
    label: "예측 판매량",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const [isPredictionOpen, setIsPredictionOpen] = useState(false)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div 
        className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">종합 대시보드</h1>
          <p className="text-muted-foreground">오늘의 핵심 지표를 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDownloadOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            리포트 다운로드
          </Button>
          <Button onClick={() => setIsPredictionOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI 예측 실행
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className={cn(
              "border card-hover transition-all duration-1000",
              stat.urgent && "border-destructive/50",
              stat.warning && "border-orange-500/50",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )} 
            style={{ transitionDelay: `${200 + index * 150}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={cn(
                "h-5 w-5",
                stat.urgent && "text-destructive",
                stat.warning && "text-orange-500",
                !stat.urgent && !stat.warning && "text-muted-foreground"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">
                {stat.change && (
                  <span className={cn(
                    "mr-1 font-medium",
                    stat.changeType === "positive" && "text-green-600 dark:text-green-400"
                  )}>
                    {stat.change}
                  </span>
                )}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card 
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "700ms" }}
        >
          <CardHeader>
            <CardTitle>수요 예측</CardTitle>
            <CardDescription>실제 판매량과 AI 예측 비교 (14일)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart
                accessibilityLayer
                data={forecastData}
                margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  width={40}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <defs>
                  <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-predicted)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-predicted)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="predicted"
                  type="monotone"
                  fill="url(#fillPredicted)"
                  fillOpacity={0.4}
                  stroke="var(--color-predicted)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  stackId="a"
                />
                <Area
                  dataKey="actual"
                  type="monotone"
                  fill="url(#fillActual)"
                  fillOpacity={0.4}
                  stroke="var(--color-actual)"
                  strokeWidth={2}
                  stackId="b"
                  connectNulls={false}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "900ms" }}
        >
          <CardHeader>
            <CardTitle>스마트 알림</CardTitle>
            <CardDescription>실시간 알림 및 권장 사항</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {alerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex gap-3 rounded-lg border p-3 transition-all duration-600 hover:bg-muted/50",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: `${1100 + index * 150}ms` }}
                >
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    alert.type === "urgent" && "bg-destructive/10 text-destructive",
                    alert.type === "warning" && "bg-orange-500/10 text-orange-500",
                    alert.type === "info" && "bg-blue-500/10 text-blue-500"
                  )}>
                    <alert.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={alert.type === "urgent" ? "destructive" : "secondary"}
                        className={cn(
                          alert.type === "warning" && "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        )}
                      >
                        {alert.type === "urgent" ? "긴급" : alert.type === "warning" ? "주의" : "정보"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.action && (
                      <Button variant="link" className="h-auto p-0 text-sm">
                        {alert.action} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AIPredictionModal open={isPredictionOpen} onOpenChange={setIsPredictionOpen} />
      <DownloadReportModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} />
    </div>
  )
}
