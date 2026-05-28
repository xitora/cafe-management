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
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AIPredictionModal } from "@/components/ai-prediction-modal"
import { DownloadReportModal } from "@/components/download-report-modal"
import { AIPredictionProgress } from "@/components/ai-prediction-progress"
import { PredictionDetailModal } from "@/components/prediction-detail-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { KOREA_REGIONS, Region } from "@/lib/regions"
import { MapPin, ChevronsUpDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
  success: CheckCircle2,
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
  const [isApplyingEffect, setIsApplyingEffect] = useState(false)
  const { toast } = useToast()

  const [initialProgress, setInitialProgress] = useState(0)
  const [initialStatus, setInitialStatus] = useState({
    preprocessing: false,
    patternAnalysis: false,
    modelApplication: false,
  })
  const [showDashboard, setShowDashboard] = useState(false)
  const [predictionHistory, setPredictionHistory] = useState<any[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("predictionHistory")
      if (savedHistory) setPredictionHistory(JSON.parse(savedHistory))
    } catch (e) {
      console.error("Failed to load from localStorage", e)
    }
  }, [])

  const { data, isLoading, mutate } = useSWR<DashboardResponse>(`/api/dashboard?region=${region.name}&lat=${region.lat}&lon=${region.lon}`, fetcher)

  const handlePredictionComplete = (result: any) => {
    if (result && result.results && data) {
      let newPredictedToday = data.stats.predictedToday;
      const newSums: Record<string, number> = {};
      result.results.forEach((r: any) => {
        const parts = r.date.split("-");
        if (parts.length === 3) {
          const label = `${parseInt(parts[1])}/${parseInt(parts[2])}`;
          newSums[label] = (newSums[label] || 0) + (r.q50_daily || 0);
        }
      });
      const todayForecast = data.forecast.find(f => f.isToday);
      if (todayForecast && newSums[todayForecast.date] !== undefined) {
        newPredictedToday = Math.round(newSums[todayForecast.date]);
      }
      
      const variables = [...(result.selectedWeather || []), ...(result.selectedEvents || [])];
      if (result.customInput && result.customInput.trim().length > 0) {
        const trunc = result.customInput.length > 20 ? result.customInput.substring(0, 20) + "..." : result.customInput;
        variables.push(`"${trunc}"`);
      }
      
      let isPast = true;
      const updatedForecast = data.forecast.map(f => {
        if (f.isToday) isPast = false;
        
        if (!isPast && newSums[f.date] !== undefined) {
          return {
            ...f,
            predicted: Math.round(newSums[f.date])
          };
        }
        return f;
      });

      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const todayIsoStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

      setPredictionHistory(prev => {
        const previousValue = prev.length > 0 ? prev[0].newValue : data.stats.predictedToday;
        const diff = newPredictedToday - previousValue;
        
        const newHistory = [{
          timestamp: new Date().toLocaleTimeString(),
          date: todayIsoStr,
          variables: variables.length > 0 ? variables.join(", ") : "선택 안함",
          oldValue: previousValue,
          newValue: newPredictedToday,
          diff,
          forecast: updatedForecast,
          weather: result.selectedWeather || [],
          events: result.selectedEvents || [],
          customInput: result.customInput || ""
        }, ...prev];
        try {
          localStorage.setItem("predictionHistory", JSON.stringify(newHistory));
        } catch(e) {}
        return newHistory;
      });

      // Show visual effect and toast
      setIsApplyingEffect(true);
      toast({
        title: "✨ 예측값 적용 완료",
        description: "AI 예측 결과가 대시보드에 반영되었습니다.",
      });
      setTimeout(() => setIsApplyingEffect(false), 2000);

      // DB 업데이트된 최신 예측값을 화면에 다시 불러오기
      mutate();
    }
  }

  const displayData = data;

  useEffect(() => {
    if (showDashboard) {
      // Trigger mount animation after dashboard becomes visible
      setMounted(false) // Reset first just in case
      setTimeout(() => setMounted(true), 50)
    }
  }, [showDashboard])

  useEffect(() => {
    const hasRun = sessionStorage.getItem("dashboardPredictionRun")
    if (hasRun) {
      setShowDashboard(true)
      return
    }

    let active = true
    const runInitialPrediction = async () => {
      try {
        const d = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const todayIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            date: todayIso,
            weather: [],
            events: [],
            customInput: ""
          }),
        })

        if (!res.ok) throw new Error("API Error")
        if (!res.body) throw new Error("No response body")

        const reader = res.body.getReader()
        const decoder = new TextDecoder("utf-8")
        let buffer = ""

        const updateProg = (p: number) => {
          if (!active) return
          setInitialProgress(p)
          if (p >= 10) setInitialStatus((s) => ({ ...s, preprocessing: true }))
          if (p >= 40) setInitialStatus((s) => ({ ...s, patternAnalysis: true }))
          if (p >= 70) setInitialStatus((s) => ({ ...s, modelApplication: true }))
        }

        let visualProgress = 0
        const visualInterval = setInterval(() => {
          if (!active) {
            clearInterval(visualInterval)
            return
          }
          visualProgress += (99 - visualProgress) * 0.025
          updateProg(Math.round(visualProgress))
        }, 200)

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            clearInterval(visualInterval)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split("\n\n")
          buffer = parts.pop() || ""

          for (const part of parts) {
            const line = part.trim()
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6))
                if (data.type === "progress") {
                  if (data.percent > visualProgress) {
                    visualProgress = data.percent
                    updateProg(Math.round(visualProgress))
                  }
                } else if (data.type === "result") {
                  clearInterval(visualInterval)
                  setInitialProgress(100)
                  setInitialStatus({
                    preprocessing: true,
                    patternAnalysis: true,
                    modelApplication: true,
                  })
                  sessionStorage.setItem("dashboardPredictionRun", "true")
                  mutate()
                  setTimeout(() => {
                    if (active) setShowDashboard(true)
                  }, 600)
                } else if (data.type === "error") {
                  throw new Error(data.error_detail)
                }
              } catch (err) {
                console.error("SSE parse error", err)
              }
            }
          }
        }
      } catch (e) {
        console.error("Initial prediction failed, showing dashboard anyway", e)
        sessionStorage.setItem("dashboardPredictionRun", "true")
        mutate()
        setShowDashboard(true)
      }
    }

    runInitialPrediction()

    return () => {
      active = false
    }
  }, [mutate])

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
                  isApplyingEffect && "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-[1.03] transition-all duration-300 z-10"
                )}
                style={{ transitionDelay: isApplyingEffect ? "0ms" : `${200 + index * 150}ms` }}
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
          isApplyingEffect && "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-[1.01] transition-all duration-300 z-10"
        )}
        style={{ transitionDelay: isApplyingEffect ? "0ms" : "700ms" }}
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
                  />
                  <Area
                    dataKey="actual"
                    type="monotone"
                    fill="url(#fillActual)"
                    fillOpacity={0.4}
                    stroke="var(--color-actual)"
                    strokeWidth={2}
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
                        alert.type === "success" && "bg-green-500/10 text-green-600 dark:text-green-400",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={alert.type === "urgent" ? "destructive" : alert.type === "success" ? "outline" : "secondary"}
                          className={cn(
                            alert.type === "warning" && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                            alert.type === "success" && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
                          )}
                        >
                          {alert.type === "urgent" ? "긴급" : alert.type === "warning" ? "주의" : alert.type === "success" ? "정상" : "정보"}
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

        {predictionHistory.length > 0 && (
          <Card
            className={cn(
              "border card-hover transition-all duration-1000",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: "1000ms" }}
          >
            <CardHeader>
              <CardTitle>최근 AI 예측 기록</CardTitle>
              <CardDescription>최근 실행된 수요 예측 결과 및 적용된 변수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {predictionHistory.map((history, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedHistoryItem(history)
                      setIsDetailOpen(true)
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">실행 시간: {history.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">적용 변수: {history.variables}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">오늘 예상 판매량</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-sm line-through text-muted-foreground">{history.oldValue}잔</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold">{history.newValue}잔</span>
                        <Badge variant={history.diff > 0 ? "default" : history.diff < 0 ? "destructive" : "secondary"} className="ml-1">
                          {history.diff > 0 ? "+" : ""}{history.diff}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      <AIPredictionModal 
        open={isPredictionOpen} 
        onOpenChange={setIsPredictionOpen} 
        onComplete={handlePredictionComplete}
      />
      <PredictionDetailModal
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        historyItem={selectedHistoryItem}
      />
      <DownloadReportModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} />
    </div>
  )
}
