"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
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
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AIPredictionModal } from "@/components/ai-prediction-modal"
import { DownloadReportModal } from "@/components/download-report-modal"
import { AIPredictionProgress } from "@/components/ai-prediction-progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { KOREA_REGIONS, Region } from "@/lib/regions"
import { MapPin, ChevronsUpDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

function getClosestRegion(lat: number, lon: number): Region {
  let closest = KOREA_REGIONS[0];
  let minDistance = Number.MAX_VALUE;
  for (const r of KOREA_REGIONS) {
    const dist = Math.pow(r.lat - lat, 2) + Math.pow(r.lon - lon, 2);
    if (dist < minDistance) {
      minDistance = dist;
      closest = r;
    }
  }
  return closest;
}
import { fetcher } from "@/lib/fetcher"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

interface DashboardResponse {
  stats: {
    predictedToday: number
    dayOverDayPct: number
    lowStock: number
    expiringCount: number
  }
  forecast: Array<{ date: string; actual: number | null; predicted: number; isToday: boolean }>
  todayLabel: string
  alerts: Array<{
    id: number
    type: "urgent" | "warning" | "info"
    time: string
    title: string
    description: string
    action?: string
  }>
}

const alertIconMap: Record<string, LucideIcon> = {
  urgent: AlertTriangle,
  warning: AlertCircle,
  info: CloudSun,
}

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
  const [region, setRegion] = useState<Region>(
    KOREA_REGIONS.find(r => r.name === "경상북도 경산시 하양읍") || KOREA_REGIONS[0]
  )
  const [openRegion, setOpenRegion] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAutoLoading, setIsAutoLoading] = useState(false)
  const [isPredictionOpen, setIsPredictionOpen] = useState(false)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [initialProgress, setInitialProgress] = useState(0)
  const [initialStatus, setInitialStatus] = useState({
    preprocessing: false,
    patternAnalysis: false,
    modelApplication: false,
  })
  const [showDashboard, setShowDashboard] = useState(false)
  const [customPrediction, setCustomPrediction] = useState<any>(null)

  const { data, isLoading } = useSWR<DashboardResponse>(`/api/dashboard?region=${region.name}&lat=${region.lat}&lon=${region.lon}`, fetcher)

  const handlePredictionComplete = (result: any) => {
    if (result && result.results) {
      setCustomPrediction(result)
    }
  }

  const displayData = useMemo(() => {
    if (!data) return null;
    if (!customPrediction || !customPrediction.results) return data;

    const newForecast = [...data.forecast];
    const results = customPrediction.results;
    
    // Sum q50_daily by date (M/D)
    const newSums: Record<string, number> = {};
    results.forEach((r: any) => {
      const parts = r.date.split("-");
      if (parts.length === 3) {
        const label = `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        newSums[label] = (newSums[label] || 0) + (r.q50_daily || 0);
      }
    });

    let newPredictedToday = data.stats.predictedToday;

    newForecast.forEach((f, idx) => {
      if (newSums[f.date] !== undefined) {
        newForecast[idx] = { ...f, predicted: Math.round(newSums[f.date]) };
        if (f.isToday) {
          newPredictedToday = Math.round(newSums[f.date]);
        }
      }
    });

    return {
      ...data,
      stats: {
        ...data.stats,
        predictedToday: newPredictedToday,
      },
      forecast: newForecast,
    };
  }, [data, customPrediction]);

  useEffect(() => {
    if (showDashboard) {
      // Trigger mount animation after dashboard becomes visible
      setMounted(false) // Reset first just in case
      setTimeout(() => setMounted(true), 50)
    }
  }, [showDashboard])

  useEffect(() => {
    // 최초 1회만 실행하도록 세션 스토리지 확인
    const hasRun = sessionStorage.getItem("dashboardPredictionRun")
    if (hasRun) {
      setShowDashboard(true)
      return
    }

    if (showDashboard) return

    const handleProgress = (e: any) => {
      const p = e.detail.progress;
      setInitialProgress(p);
      if (p >= 30) setInitialStatus((s) => ({ ...s, preprocessing: true }))
      if (p >= 60) setInitialStatus((s) => ({ ...s, patternAnalysis: true }))
      if (p >= 100) {
        setInitialStatus((s) => ({ ...s, modelApplication: true }))
        sessionStorage.setItem("dashboardPredictionRun", "true")
        setTimeout(() => setShowDashboard(true), 600)
      }
    };

    window.addEventListener("api-progress", handleProgress);
    return () => {
      window.removeEventListener("api-progress", handleProgress);
    };
  }, [showDashboard])

  const handleAutoRegion = () => {
    setIsAutoLoading(true)
    setTimeout(() => {
      const target = KOREA_REGIONS.find(r => r.name === "경상북도 경산시 하양읍")
      if (target) setRegion(target)
      setIsAutoLoading(false)
    }, 800)
  }

  const stats = displayData
    ? [
        {
          title: "오늘 예상 판매량",
          value: `${displayData.stats.predictedToday.toLocaleString()}잔`,
          change:
            displayData.stats.dayOverDayPct >= 0
              ? `+${displayData.stats.dayOverDayPct}%`
              : `${displayData.stats.dayOverDayPct}%`,
          changeType: displayData.stats.dayOverDayPct >= 0 ? ("positive" as const) : ("negative" as const),
          description: "전일 대비",
          icon: TrendingUp,
        },
        {
          title: "재고 부족 품목",
          value: `${displayData.stats.lowStock}개`,
          description: "긴급 발주 필요",
          icon: Package,
          urgent: true,
        },
        {
          title: "유통기한 임박",
          value: `${displayData.stats.expiringCount}개`,
          description: "3일 이내 만료",
          icon: Clock,
          warning: true,
        },
      ]
    : []

  if (!showDashboard) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Dialog open={true}>
          <DialogContent className="sm:max-w-md [&>button]:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl">AI 예측 모델 실행</DialogTitle>
              <DialogDescription>
                AI 모델을 사용하여 미래 수요를 예측합니다
              </DialogDescription>
            </DialogHeader>
            <AIPredictionProgress progress={initialProgress} status={initialStatus} />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      <div
        className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">종합 대시보드</h1>
            <p className="text-muted-foreground">오늘의 핵심 지표를 한눈에 확인하세요</p>
          </div>
          <div className="flex items-center gap-2 md:mt-1 md:border-l md:pl-4 border-border">
            <Button
              variant="outline"
              onClick={handleAutoRegion}
              disabled={isAutoLoading}
              className="shrink-0 px-3"
            >
              {isAutoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              자동
            </Button>
            <Popover 
              open={openRegion} 
              onOpenChange={(open) => {
                setOpenRegion(open)
                if (!open) setSearchQuery("")
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openRegion}
                  className="w-[240px] justify-between"
                >
                  <span className="truncate flex-1 text-left">{region.name}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="지역 검색..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {searchQuery.trim().length > 0 ? (
                      <>
                        <CommandEmpty>지역을 찾을 수 없습니다.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {KOREA_REGIONS.filter(r => r.name.replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, ''))).slice(0, 50).map((r) => (
                            <CommandItem
                              key={r.id}
                              value={r.name}
                              onSelect={() => {
                                setRegion(r)
                                setOpenRegion(false)
                                setSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  region.id === r.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {r.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        검색어를 입력하세요.
                      </div>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
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
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
                style={{ transitionDelay: `${200 + index * 150}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon
                    className={cn(
                      "h-5 w-5",
                      stat.urgent && "text-destructive",
                      stat.warning && "text-orange-500",
                      !stat.urgent && !stat.warning && "text-muted-foreground",
                    )}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">
                    {stat.change && (
                      <span
                        className={cn(
                          "mr-1 font-medium",
                          stat.changeType === "positive" && "text-green-600 dark:text-green-400",
                          stat.changeType === "negative" && "text-destructive",
                        )}
                      >
                        {stat.change}
                      </span>
                    )}
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
        style={{ transitionDelay: "700ms" }}
      >
        <CardHeader>
          <CardTitle>수요 예측</CardTitle>
            <CardDescription>실제 판매량과 AI 예측 비교 (10일)</CardDescription>
          </CardHeader>
          <CardContent>
            {displayData ? (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <AreaChart accessibilityLayer data={displayData.forecast} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={40} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  {displayData.todayLabel && (
                    <ReferenceLine
                      x={displayData.todayLabel}
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
            <CardTitle>스마트 알림</CardTitle>
            <CardDescription>실시간 알림 및 권장 사항</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {displayData?.alerts.map((alert, index) => {
                const Icon = alertIconMap[alert.type] || Info
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 transition-all duration-600 hover:bg-muted/50",
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                    )}
                    style={{ transitionDelay: `${1100 + index * 150}ms` }}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        alert.type === "urgent" && "bg-destructive/10 text-destructive",
                        alert.type === "warning" && "bg-orange-500/10 text-orange-500",
                        alert.type === "info" && "bg-blue-500/10 text-blue-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={alert.type === "urgent" ? "destructive" : "secondary"}
                          className={cn(
                            alert.type === "warning" && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                          )}
                        >
                          {alert.type === "urgent" ? "긴급" : alert.type === "warning" ? "주의" : "정보"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{alert.time}</span>
                      </div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alert.description}</p>
                      {alert.action && (
                        alert.action === "재고 현황으로 이동" ? (
                          <Link href="/inventory" passHref>
                            <Button variant="link" className="h-auto p-0 text-sm">
                              {alert.action} <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="link" className="h-auto p-0 text-sm">
                            {alert.action} <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
              {!data &&
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          </CardContent>
        </Card>

      <AIPredictionModal 
        open={isPredictionOpen} 
        onOpenChange={setIsPredictionOpen} 
        onComplete={handlePredictionComplete}
      />
      <DownloadReportModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} />
    </div>
  )
}
