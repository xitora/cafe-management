"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import {
  ShoppingCart,
  Search,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { orderStatusConfig, type Order, type RecommendedOrder } from "@/lib/data"
import { fetcher } from "@/lib/fetcher"

type SortDirection = "asc" | "desc" | null
type SortKey = "product" | "supplier" | "status" | "date" | null

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  shipping: Truck,
  delivered: Package,
}

interface OrdersResponse {
  orders: Order[]
  recommended: RecommendedOrder[]
}

function parsePrice(p: string): number {
  return Number(p.replace(/[^0-9]/g, ""))
}

export default function OrderPage() {
  const { data, isLoading } = useSWR<OrdersResponse>("/api/orders", fetcher)
  const orders = data?.orders ?? []
  const recommendedOrders = data?.recommended ?? []

  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortKey(null)
        setSortDirection(null)
      } else setSortDirection("asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      const q = searchQuery.toLowerCase()
      return (
        order.product.toLowerCase().includes(q) ||
        order.supplier.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q)
      )
    })
    if (sortKey && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const av = (a[sortKey] ?? "") as string
        const bv = (b[sortKey] ?? "") as string
        return sortDirection === "asc" ? av.localeCompare(bv, "ko") : bv.localeCompare(av, "ko")
      })
    }
    return filtered
  }, [orders, searchQuery, sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length
    const shipping = orders.filter((o) => o.status === "shipping").length
    const urgent = orders.filter((o) => o.urgent).length
    const total = orders.reduce((s, o) => s + parsePrice(o.price), 0)
    return { pending, shipping, urgent, totalAmount: `₩${total.toLocaleString()}` }
  }, [orders])

  const orderStats = [
    { title: "이번 주 발주", value: `${orders.length}건`, description: `총 ${stats.totalAmount}`, icon: ShoppingCart },
    { title: "대기 중", value: `${stats.pending}건`, description: "승인 대기", icon: Clock },
    { title: "배송 중", value: `${stats.shipping}건`, description: "예정 도착일 확인", icon: Truck },
    {
      title: "긴급 발주 필요",
      value: `${stats.urgent}건`,
      description: "재고 부족 품목",
      icon: AlertTriangle,
      urgent: true,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">발주 관리</h1>
          <p className="text-muted-foreground">발주 현황 및 추천 발주를 관리합니다</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {orderStats.map((stat, index) => (
          <Card
            key={stat.title}
            className={cn(
              "border card-hover transition-all duration-1000",
              stat.urgent && "border-destructive/50",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: `${200 + index * 150}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={cn("h-5 w-5", stat.urgent ? "text-destructive" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "800ms" }}
      >
        <CardHeader>
          <CardTitle>AI 추천 발주</CardTitle>
          <CardDescription>재고 분석 기반 발주 추천 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
              : recommendedOrders.map((item, index) => (
                  <div
                    key={item.product}
                    className={cn(
                      "rounded-lg border p-4 transition-all duration-600 hover:bg-muted/50",
                      item.urgency === "high" && "border-destructive/50",
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                    )}
                    style={{ transitionDelay: `${1000 + index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.product}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          item.urgency === "high" && "bg-destructive/10 text-destructive",
                          item.urgency === "medium" && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                          item.urgency === "low" && "bg-green-500/10 text-green-600 dark:text-green-400",
                        )}
                      >
                        {item.urgency === "high" ? "긴급" : item.urgency === "medium" ? "보통" : "여유"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>현재 재고:</span>
                        <span>{item.currentStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>일평균 사용:</span>
                        <span>{item.dailyUsage}</span>
                      </div>
                      <div className="flex justify-between font-medium text-foreground">
                        <span>권장 발주량:</span>
                        <span>{item.recommendedQty}</span>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "1200ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>발주 내역</CardTitle>
              <CardDescription>전체 발주 내역을 확인합니다</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full md:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">발주번호</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("product")}
                    >
                      상품명 <SortIcon columnKey="product" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("supplier")}
                    >
                      공급업체 <SortIcon columnKey="supplier" />
                    </Button>
                  </TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("status")}
                    >
                      상태 <SortIcon columnKey="status" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("date")}
                    >
                      발주일 <SortIcon columnKey="date" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : filteredAndSortedOrders.map((order, index) => {
                      const status = orderStatusConfig[order.status]
                      const StatusIcon = statusIcons[order.status]
                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            "transition-all duration-600",
                            mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                          )}
                          style={{ transitionDelay: `${1400 + index * 60}ms` }}
                        >
                          <TableCell className="font-mono text-sm">{order.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.product}</span>
                              {order.urgent && (
                                <Badge variant="destructive" className="text-xs">
                                  긴급
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{order.supplier}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>{order.price}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{order.date}</TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">총 {filteredAndSortedOrders.length}건</p>
        </CardContent>
      </Card>
    </div>
  )
}
