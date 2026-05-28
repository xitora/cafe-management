"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, CloudSun, Calendar, MessageSquare, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

interface PredictionDetailModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  historyItem: any
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

export function PredictionDetailModal({ isOpen, onOpenChange, historyItem }: PredictionDetailModalProps) {
  if (!historyItem) return null

  const variables = [
    ...(historyItem.weather || []),
    ...(historyItem.events || [])
  ]
  if (historyItem.customInput && historyItem.customInput.trim().length > 0) {
    variables.push(`"${historyItem.customInput}"`)
  }

  // Find if today is in the forecast to show reference line
  const today = new Date()
  const todayLabel = `${today.getMonth() + 1}/${today.getDate()}`
  const hasToday = historyItem.forecast?.some((f: any) => f.date === todayLabel)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>AI 예측 실행 기록 상세</span>
          </div>
          <DialogTitle className="text-xl">예측 시점: {historyItem.timestamp}</DialogTitle>
          <DialogDescription>
            {historyItem.date || today.toLocaleDateString()} 기준 적용된 외생 변수와 수요 예측 비교 그래프입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-2">
          {/* 변수 및 지표 정보 */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 flex flex-col gap-3">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4 text-muted-foreground" />
                  적용 외생 변수
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {variables.length > 0 ? (
                    variables.map((v: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs">
                        {v}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">적용된 외부 변수 없음</span>
                  )}
                </div>
                {historyItem.customInput && (
                  <div className="mt-2 text-xs border-t pt-2 border-border flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <p className="text-muted-foreground whitespace-pre-wrap">{historyItem.customInput}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="pt-4 flex flex-col justify-between h-full gap-3">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    수요 예측 요약
                  </h4>
                  <div className="flex items-center gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">이전 예상 판매량</p>
                      <p className="text-sm font-semibold line-through text-muted-foreground mt-0.5">
                        {historyItem.oldValue}잔
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">조정 예측 판매량</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {historyItem.newValue}잔
                      </p>
                    </div>
                    <Badge
                      variant={historyItem.diff > 0 ? "default" : historyItem.diff < 0 ? "destructive" : "secondary"}
                      className="ml-auto text-xs"
                    >
                      {historyItem.diff > 0 ? "+" : ""}
                      {historyItem.diff}잔
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 예측 그래프 시각화 */}
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-sm mb-4">당시 수요 예측 그래프비교 (10일)</h4>
            {historyItem.forecast && historyItem.forecast.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <AreaChart accessibilityLayer data={historyItem.forecast} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={40} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  {hasToday && (
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
                  <defs>
                    <linearGradient id="fillActualDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillPredictedDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-predicted)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-predicted)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="predicted"
                    type="monotone"
                    fill="url(#fillPredictedDetail)"
                    fillOpacity={0.4}
                    stroke="var(--color-predicted)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Area
                    dataKey="actual"
                    type="monotone"
                    fill="url(#fillActualDetail)"
                    fillOpacity={0.4}
                    stroke="var(--color-actual)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-72 w-full flex items-center justify-center bg-muted/20 rounded-lg">
                <span className="text-sm text-muted-foreground">그래프 데이터를 찾을 수 없습니다.</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
