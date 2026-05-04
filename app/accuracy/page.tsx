"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Sparkles,
  ArrowRight,
  Info,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { AIPredictionModal } from "@/components/ai-prediction-modal"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/fetcher"
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface AccuracyResponse {
  stats: {
    overall: number
    demand: number
    stock: number
    runs: number
  }
  weeklyAccuracy: Array<{
    date: string
    label: string
    accuracy: number
    isToday: boolean
  }>
  todayLabel: string
  categoryAccuracy: Array<{ name: string; accuracy: number; predictions: number }>
  history: Array<{
    id: number
    date: string
    type: string
    predicted: string
    actual: string
    accuracy: number
    status: "accurate" | "warning" | "inaccurate"
  }>
  insights: Array<{
    type: "success" | "warning" | "info"
    title: string
    description: string
  }>
}

const insightIcons: Record<string, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
}

const chartConfig = {
  accuracy: { label: "정확도 (%)", color: "var(--chart-1)" },
} satisfies ChartConfig

export default function AccuracyPage() {
  const { data, isLoading } = useSWR<AccuracyResponse>("/api/accuracy", fetcher)
  const [isPredictionOpen, setIsPredictionOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const accuracyStats = data
    ? [
        {
          title: "전체 예측 정확도",
          value: `${data.stats.overall}%`,
          description: "최근 30일 평균",
          icon: Target,
        },
        {
          title: "수요 예측 정확도",
          value: `${data.stats.demand}%`,
          description: "최근 30일 평균",
          icon: TrendingUp,
        },
        {
          title: "재고 예측 정확도",
          value: `${data.stats.stock}%`,
          description: "최근 30일 평균",
          icon: BarChart3,
        },
        {
          title: "예측 실행 횟수",
          value: `${data.stats.runs}회`,
          description: "이번 달",
          icon: Sparkles,
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">예측 정확도</h1>
          <p className="text-muted-foreground">AI 예측 모델의 성능을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            기간 설정
          </Button>
          <Button onClick={() => setIsPredictionOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            새 예측 실행
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : accuracyStats.map((stat, index) => (
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
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className={cn(
            "border card-hover lg:col-span-2 transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
          style={{ transitionDelay: "800ms" }}
        >
          <CardHeader>
            <CardTitle>주간 정확도 추이</CardTitle>
            <CardDescription>최근 7일간 일별 예측 정확도</CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <LineChart
                  accessibilityLayer
                  data={data.weeklyAccuracy}
                  margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
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
                    width={44}
                    domain={[60, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <ReferenceLine
                    x={data.todayLabel}
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
                  <Line
                    dataKey="accuracy"
                    type="linear"
                    stroke="var(--color-accuracy)"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload, key } = props as {
                        cx: number
                        cy: number
                        payload: { isToday: boolean }
                        key: string
                      }
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={payload.isToday ? 6 : 3.5}
                          fill={payload.isToday ? "var(--primary)" : "var(--color-accuracy)"}
                          stroke="var(--background)"
                          strokeWidth={payload.isToday ? 2 : 1}
                        />
                      )
                    }}
                  />
                </LineChart>
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
            <CardTitle>AI 인사이트</CardTitle>
            <CardDescription>예측 모델 분석 결과</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {data?.insights.map((insight, index) => {
                const Icon = insightIcons[insight.type]
                return (
                  <div
                    key={index}
                    className={cn(
                      "rounded-lg border p-3 transition-all duration-600",
                      insight.type === "success" && "border-green-500/30 bg-green-500/5",
                      insight.type === "warning" && "border-orange-500/30 bg-orange-500/5",
                      insight.type === "info" && "border-blue-500/30 bg-blue-500/5",
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                    )}
                    style={{ transitionDelay: `${1100 + index * 100}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          insight.type === "success" && "text-green-600 dark:text-green-400",
                          insight.type === "warning" && "text-orange-500",
                          insight.type === "info" && "text-blue-500",
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium">{insight.title}</p>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
          style={{ transitionDelay: "1200ms" }}
        >
          <CardHeader>
            <CardTitle>품목별 예측 정확도</CardTitle>
            <CardDescription>상위 5개 품목 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {data?.categoryAccuracy.map((item, index) => (
                <div
                  key={item.name}
                  className={cn(
                    "flex flex-col gap-2 transition-all duration-600",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                  )}
                  style={{ transitionDelay: `${1400 + index * 100}ms` }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.predictions}회</span>
                      <span
                        className={cn(
                          "font-medium",
                          item.accuracy >= 90 && "text-green-600 dark:text-green-400",
                          item.accuracy >= 80 && item.accuracy < 90 && "text-orange-500",
                          item.accuracy < 80 && "text-destructive",
                        )}
                      >
                        {item.accuracy}%
                      </span>
                    </div>
                  </div>
                  <Progress value={item.accuracy} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
          style={{ transitionDelay: "1300ms" }}
        >
          <CardHeader>
            <CardTitle>최근 예측 기록</CardTitle>
            <CardDescription>최근 실행된 예측 결과</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {data?.history.slice(0, 5).map((prediction, index) => (
                <div
                  key={prediction.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border p-3 transition-all duration-600 hover:bg-muted/50",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                  )}
                  style={{ transitionDelay: `${1500 + index * 100}ms` }}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      prediction.status === "accurate" && "bg-green-500/10",
                      prediction.status === "warning" && "bg-orange-500/10",
                      prediction.status === "inaccurate" && "bg-destructive/10",
                    )}
                  >
                    {prediction.status === "accurate" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {prediction.status === "warning" && (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    {prediction.status === "inaccurate" && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prediction.type}</span>
                      <Badge variant="secondary" className="text-xs">
                        {prediction.date}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      예측: {prediction.predicted} / 실제: {prediction.actual}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-lg font-bold",
                        prediction.accuracy >= 90 && "text-green-600 dark:text-green-400",
                        prediction.accuracy >= 70 && prediction.accuracy < 90 && "text-orange-500",
                        prediction.accuracy < 70 && "text-destructive",
                      )}
                    >
                      {prediction.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-4 w-full">
              모든 기록 보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <AIPredictionModal open={isPredictionOpen} onOpenChange={setIsPredictionOpen} />
    </div>
  )
}
