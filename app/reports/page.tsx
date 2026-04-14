"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Trash2,
  BarChart3,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DownloadReportModal } from "@/components/download-report-modal"
import { cn } from "@/lib/utils"
import { weeklyData, topProducts } from "@/lib/data"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const reportStats = [
  {
    title: "총 매출",
    value: "₩12,450,000",
    change: "+12.5%",
    changeType: "positive",
    description: "전월 대비",
    icon: DollarSign,
  },
  {
    title: "총 발주액",
    value: "₩4,850,000",
    change: "-5.2%",
    changeType: "positive",
    description: "전월 대비",
    icon: ShoppingCart,
  },
  {
    title: "폐기 손실",
    value: "₩385,000",
    change: "-18.3%",
    changeType: "positive",
    description: "전월 대비",
    icon: Trash2,
  },
  {
    title: "순이익률",
    value: "32.4%",
    change: "+2.1%",
    changeType: "positive",
    description: "전월 대비",
    icon: TrendingUp,
  },
]

const recentReports = [
  {
    id: 1,
    title: "4월 주간 리포트",
    type: "weekly",
    date: "2026-04-13",
    status: "ready",
  },
  {
    id: 2,
    title: "3월 월간 리포트",
    type: "monthly",
    date: "2026-04-01",
    status: "ready",
  },
  {
    id: 3,
    title: "1분기 분석 리포트",
    type: "quarterly",
    date: "2026-04-01",
    status: "ready",
  },
  {
    id: 4,
    title: "재고 분석 리포트",
    type: "inventory",
    date: "2026-04-10",
    status: "ready",
  },
]

const categoryData = [
  { name: "커피", value: 65, amount: "₩8,092,500" },
  { name: "음료", value: 20, amount: "₩2,490,000" },
  { name: "푸드", value: 10, amount: "₩1,245,000" },
  { name: "MD", value: 5, amount: "₩622,500" },
]

const costData = [
  { name: "원재료비", value: 45, amount: "₩5,602,500", color: "bg-chart-1" },
  { name: "인건비", value: 30, amount: "₩3,735,000", color: "bg-chart-2" },
  { name: "임대료", value: 15, amount: "₩1,867,500", color: "bg-chart-3" },
  { name: "기타", value: 10, amount: "₩1,245,000", color: "bg-chart-4" },
]

const salesChartConfig = {
  sales: {
    label: "판매량",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function ReportsPage() {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("weekly")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <div className="flex flex-col gap-8">
      <div 
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">리포트</h1>
          <p className="text-muted-foreground">매출, 발주, 폐기 현황을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            기간 설정
          </Button>
          <Button onClick={() => setIsDownloadOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportStats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className={cn(
              "border card-hover transition-all duration-1000",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
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
                <span className={cn(
                  "mr-1 font-medium",
                  stat.changeType === "positive" && "text-green-600 dark:text-green-400"
                )}>
                  {stat.change}
                </span>
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
          style={{ transitionDelay: "800ms" }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>주간 매출 현황</CardTitle>
                <CardDescription>최근 7일간 판매량 추이</CardDescription>
              </div>
              <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <TabsList className="h-8">
                  <TabsTrigger value="weekly" className="text-xs">주간</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs">월간</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesChartConfig} className="h-64 w-full">
              <BarChart
                accessibilityLayer
                data={weeklyData}
                margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
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
                <Bar
                  dataKey="sales"
                  fill="var(--color-sales)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
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
            <CardTitle>인기 상품 TOP 5</CardTitle>
            <CardDescription>이번 달 판매량 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {topProducts.map((product, index) => (
                <div 
                  key={product.rank} 
                  className={cn(
                    "flex items-center gap-4 transition-all duration-600",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: `${1100 + index * 100}ms` }}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    product.rank === 1 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                    product.rank === 2 && "bg-slate-300/50 text-slate-600 dark:bg-slate-600/50 dark:text-slate-300",
                    product.rank === 3 && "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                    product.rank > 3 && "bg-muted text-muted-foreground"
                  )}>
                    {product.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales.toLocaleString()}잔</p>
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
                      <span className={cn(
                        product.trend === "up" && "text-green-600 dark:text-green-400",
                        product.trend === "down" && "text-destructive",
                        product.trend === "stable" && "text-muted-foreground"
                      )}>
                        {product.trend === "up" ? "상승" : product.trend === "down" ? "하락" : "유지"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card 
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: "1200ms" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>최근 리포트</CardTitle>
              <CardDescription>생성된 리포트 목록</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {recentReports.map((report, index) => (
              <div
                key={report.id}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-4 transition-all duration-600 hover:bg-muted/50",
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                )}
                style={{ transitionDelay: `${1400 + index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary">
                    {report.type === "weekly" && "주간"}
                    {report.type === "monthly" && "월간"}
                    {report.type === "quarterly" && "분기"}
                    {report.type === "inventory" && "재고"}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setIsDownloadOpen(true)}>
                  다운로드 <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card 
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "1600ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              카테고리별 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {categoryData.map((category, index) => (
                <div 
                  key={category.name} 
                  className={cn(
                    "flex flex-col gap-2 transition-all duration-600",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: `${1800 + index * 100}ms` }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">{category.value}% | {category.amount}</span>
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

        <Card 
          className={cn(
            "border card-hover transition-all duration-1000",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "1700ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              비용 구성
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {costData.map((category, index) => (
                <div 
                  key={category.name} 
                  className={cn(
                    "flex items-center gap-4 transition-all duration-600",
                    mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                  style={{ transitionDelay: `${1900 + index * 100}ms` }}
                >
                  <div className={cn("h-3 w-3 rounded-full", category.color)} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-muted-foreground">{category.value}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{category.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <DownloadReportModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} />
    </div>
  )
}
