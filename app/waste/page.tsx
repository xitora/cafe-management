"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Trash2,
  Search,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  expiringItems as initialExpiringItems,
  wasteHistory as initialWasteHistory,
  type WasteItem,
  type WasteHistory,
} from "@/lib/data"

type SortDirection = "asc" | "desc" | null
type SortKey = "product" | "quantity" | "reason" | "cost" | "date" | "handler" | null

export default function WastePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expiringItems] = useState<WasteItem[]>(initialExpiringItems)
  const [wasteHistoryData] = useState<WasteHistory[]>(initialWasteHistory)
  
  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Animation state
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortKey(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = wasteHistoryData.filter((waste) => {
      const matchesSearch = 
        waste.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        waste.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        waste.handler.toLowerCase().includes(searchQuery.toLowerCase()) ||
        waste.id.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })

    if (sortKey && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string
        let bValue: string

        switch (sortKey) {
          case "product":
            aValue = a.product
            bValue = b.product
            break
          case "quantity":
            aValue = a.quantity
            bValue = b.quantity
            break
          case "reason":
            aValue = a.reason
            bValue = b.reason
            break
          case "cost":
            aValue = a.cost
            bValue = b.cost
            break
          case "date":
            aValue = a.date
            bValue = b.date
            break
          case "handler":
            aValue = a.handler
            bValue = b.handler
            break
          default:
            return 0
        }

        return sortDirection === "asc"
          ? aValue.localeCompare(bValue, "ko")
          : bValue.localeCompare(aValue, "ko")
      })
    }

    return filtered
  }, [wasteHistoryData, searchQuery, sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  // Calculate stats
  const stats = useMemo(() => {
    const expiringCount = expiringItems.length
    const todayExpiring = expiringItems.filter(i => i.daysLeft <= 1).length
    return { expiringCount, todayExpiring }
  }, [expiringItems])

  const wasteStats = [
    {
      title: "이번 주 폐기량",
      value: "₩185,000",
      change: "-12%",
      changeType: "positive",
      description: "전주 대비",
      icon: Trash2,
    },
    {
      title: "유통기한 임박",
      value: `${stats.expiringCount}개`,
      description: "3일 이내 만료",
      icon: Calendar,
      warning: true,
    },
    {
      title: "폐기 예정",
      value: `${stats.todayExpiring}개`,
      description: "오늘 마감",
      icon: AlertTriangle,
      urgent: true,
    },
    {
      title: "절감 목표",
      value: "78%",
      description: "월간 목표 달성률",
      icon: TrendingDown,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div 
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">폐기 관리</h1>
          <p className="text-muted-foreground">유통기한 관리 및 폐기 현황을 확인합니다</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          리포트
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {wasteStats.map((stat, index) => (
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
              <div className="text-2xl font-bold">{stat.value}</div>
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

      <Card 
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: "800ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>유통기한 임박 상품</CardTitle>
              <CardDescription>조치가 필요한 상품 목록입니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {expiringItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-4 transition-all duration-600 hover:bg-muted/50",
                  item.daysLeft <= 1 && "border-destructive/50 bg-destructive/5",
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                )}
                style={{ transitionDelay: `${1000 + index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{item.product}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity}개</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      item.daysLeft <= 1 && "bg-destructive/10 text-destructive",
                      item.daysLeft === 2 && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                      item.daysLeft >= 3 && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                    )}
                  >
                    D-{item.daysLeft}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">예상 손실</span>
                  <span className="font-medium text-destructive">{item.cost}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  만료일: {item.expiryDate}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card 
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: "1200ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>폐기 내역</CardTitle>
              <CardDescription>최근 폐기 처리된 상품 목록</CardDescription>
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
                  <TableHead className="w-24">폐기번호</TableHead>
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
                      onClick={() => handleSort("quantity")}
                    >
                      수량 <SortIcon columnKey="quantity" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("reason")}
                    >
                      사유 <SortIcon columnKey="reason" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("cost")}
                    >
                      손실금액 <SortIcon columnKey="cost" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("date")}
                    >
                      처리일 <SortIcon columnKey="date" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("handler")}
                    >
                      담당자 <SortIcon columnKey="handler" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((waste, index) => (
                  <TableRow 
                    key={waste.id}
                    className={cn(
                      "transition-all duration-600",
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    )}
                    style={{ transitionDelay: `${1400 + index * 60}ms` }}
                  >
                    <TableCell className="font-mono text-sm">{waste.id}</TableCell>
                    <TableCell className="font-medium">{waste.product}</TableCell>
                    <TableCell>{waste.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{waste.reason}</Badge>
                    </TableCell>
                    <TableCell className="text-destructive font-medium">{waste.cost}</TableCell>
                    <TableCell className="text-muted-foreground">{waste.date}</TableCell>
                    <TableCell className="text-muted-foreground">{waste.handler}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <p className="mt-4 text-sm text-muted-foreground">
            총 {filteredAndSortedHistory.length}건
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
