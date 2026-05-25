"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Package,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Box,
  BarChart3,
  Trash2,
  ShoppingCart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  categories,
  getStockLevelPercent,
  getStockStatus,
  stockStatusConfig,
  formatCurrency,
  type RecommendedOrder,
} from "@/lib/data"
import { type InventoryItem } from "@/lib/db"
import { fetcher } from "@/lib/fetcher"

interface InventoryResponse {
  items: InventoryItem[]
}

interface OrdersResponse {
  recommended: RecommendedOrder[]
}

const urgencyMeta: Record<RecommendedOrder["urgency"], { label: string; tone: string }> = {
  high: { label: "긴급", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  medium: { label: "주의", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  low: { label: "여유", tone: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" },
}

export default function InventoryPage() {
  const { data, isLoading, mutate } = useSWR<InventoryResponse>("/api/inventory", fetcher)
  const { data: ordersData } = useSWR<OrdersResponse>("/api/orders", fetcher)
  const { data: wasteData, mutate: mutateWaste } = useSWR<any>("/api/waste", fetcher)
  const items = data?.items ?? []
  const recommended = ordersData?.recommended ?? []
  const wasteHistory = wasteData?.history ?? []

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("전체")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isWasteOpen, setIsWasteOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 재고 목록 정렬 — 폐기 내역과 동일한 asc/desc/none 토글 패턴
  type InvSortKey = "id" | "product" | "category" | "currentStock" | "stockPercent" | "unitPrice" | "lastUpdated"
  type SortDir = "asc" | "desc" | null
  const [invSortKey, setInvSortKey] = useState<InvSortKey | null>("stockPercent")
  const [invSortDir, setInvSortDir] = useState<SortDir>("asc")
  const handleInvSort = (key: InvSortKey) => {
    if (invSortKey === key) {
      if (invSortDir === "asc") setInvSortDir("desc")
      else if (invSortDir === "desc") {
        setInvSortKey(null)
        setInvSortDir(null)
      } else setInvSortDir("asc")
    } else {
      setInvSortKey(key)
      setInvSortDir("asc")
    }
  }
  const InvSortIcon = ({ k }: { k: InvSortKey }) => {
    if (invSortKey !== k) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return invSortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  // 발주 필요 품목 정렬 — 카드 그리드용 동일 토글 패턴
  type OrdSortKey = "urgency" | "product" | "currentStock" | "dailyUsage" | "recommendedQty"
  const [ordSortKey, setOrdSortKey] = useState<OrdSortKey>("urgency")
  const [ordSortDir, setOrdSortDir] = useState<SortDir>("asc")
  const handleOrdSort = (key: OrdSortKey) => {
    if (ordSortKey === key) {
      if (ordSortDir === "asc") setOrdSortDir("desc")
      else if (ordSortDir === "desc") setOrdSortDir("asc")
      else setOrdSortDir("asc")
    } else {
      setOrdSortKey(key)
      setOrdSortDir("asc")
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [editForm, setEditForm] = useState({
    product: "",
    category: "",
    currentStock: 0,
    unitPrice: 0,
    unit: "",
    minStock: 0,
    maxStock: 0,
  })
  const [addForm, setAddForm] = useState({
    product: "",
    category: "원두",
    currentStock: 0,
    unitPrice: 0,
    unit: "개",
    minStock: 0,
    maxStock: 100,
    dailyUsage: 0,
  })
  
  const [wasteForm, setWasteForm] = useState({
    productId: 0,
    quantity: 1,
    reason: "유통기한 만료",
  })

  // 검색/카테고리 필터 후 사용자 정렬 적용. 정렬 미설정 시 기본은 재고비율 오름차순
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        item.product.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    if (!invSortKey || !invSortDir) {
      return filtered.slice().sort((a, b) => getStockLevelPercent(a) - getStockLevelPercent(b))
    }

    return filtered.slice().sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (invSortKey === "stockPercent") {
        av = getStockLevelPercent(a)
        bv = getStockLevelPercent(b)
      } else {
        av = a[invSortKey] as string | number
        bv = b[invSortKey] as string | number
      }
      if (typeof av === "number" && typeof bv === "number") {
        return invSortDir === "asc" ? av - bv : bv - av
      }
      return invSortDir === "asc"
        ? String(av).localeCompare(String(bv), "ko")
        : String(bv).localeCompare(String(av), "ko")
    })
  }, [items, searchQuery, selectedCategory, invSortKey, invSortDir])

  // 발주 필요 품목 정렬된 결과
  const sortedRecommended = useMemo(() => {
    const urgencyOrder: Record<RecommendedOrder["urgency"], number> = { high: 0, medium: 1, low: 2 }
    return recommended.slice().sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (ordSortKey === "urgency") {
        av = urgencyOrder[a.urgency]
        bv = urgencyOrder[b.urgency]
      } else {
        av = a[ordSortKey] as string | number
        bv = b[ordSortKey] as string | number
      }
      const dir = ordSortDir ?? "asc"
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv), "ko")
        : String(bv).localeCompare(String(av), "ko")
    })
  }, [recommended, ordSortKey, ordSortDir])

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item)
    setEditForm({
      product: item.product,
      category: item.category,
      currentStock: item.currentStock,
      unitPrice: item.unitPrice,
      unit: item.unit,
      minStock: item.minStock,
      maxStock: item.maxStock,
    })
    setIsEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      await fetch(`/api/inventory/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      await mutate()
      setIsEditOpen(false)
      setSelectedItem(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddWaste = async () => {
    setIsSubmitting(true)
    try {
      await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wasteForm),
      })
      await mutateWaste()
      await mutate()
      setIsWasteOpen(false)
      setWasteForm({
        productId: 0,
        quantity: 1,
        reason: "유통기한 만료",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddItem = async () => {
    setIsSubmitting(true)
    try {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      await mutate()
      setIsAddOpen(false)
      setAddForm({
        product: "",
        category: "원두",
        currentStock: 0,
        unitPrice: 0,
        unit: "개",
        minStock: 0,
        maxStock: 100,
        dailyUsage: 0,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      await fetch(`/api/inventory/${selectedItem.id}`, { method: "DELETE" })
      await mutate()
      setIsDeleteConfirmOpen(false)
      setIsEditOpen(false)
      setSelectedItem(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    const lowStock = items.filter((i) => getStockStatus(i) === "low").length
    const highStock = items.filter((i) => getStockStatus(i) === "high").length
    return { total: items.length, lowStock, highStock }
  }, [items])

  const inventoryStats = [
    { title: "총 품목 수", value: `${stats.total}개`, description: "관리 중인 품목", icon: Package },
    {
      title: "재고 부족",
      value: `${stats.lowStock}개`,
      description: "발주 필요",
      icon: AlertTriangle,
      urgent: true,
    },
    {
      title: "재고 과잉",
      value: `${stats.highStock}개`,
      description: "판매 촉진 필요",
      icon: Box,
      warning: true,
    },
    {
      title: "재고 회전율",
      value: "4.2회",
      change: "+0.3",
      changeType: "positive",
      description: "전월 대비",
      icon: BarChart3,
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">재고 현황</h1>
          <p className="text-muted-foreground">실시간 재고 현황을 확인하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsWasteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            폐기 관리
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            품목 추가
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {inventoryStats.map((stat, index) => (
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
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">
                {stat.change && (
                  <span
                    className={cn(
                      "mr-1 font-medium",
                      stat.changeType === "positive" && "text-green-600 dark:text-green-400",
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

      {/* 발주 필요 품목 — 기존 /order 페이지의 핵심 기능을 이곳으로 흡수 */}
      <Card
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "700ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                발주 필요 품목
              </CardTitle>
              <CardDescription>일평균 소비량과 현재 재고 기준 권장 발주 목록</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { k: "urgency", label: "긴급도" },
                  { k: "product", label: "상품명" },
                  { k: "currentStock", label: "재고" },
                  { k: "dailyUsage", label: "일평균" },
                  { k: "recommendedQty", label: "권장량" },
                ] as { k: OrdSortKey; label: string }[]
              ).map(({ k, label }) => {
                const active = ordSortKey === k
                return (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    className="h-8 px-2 text-xs"
                    onClick={() => handleOrdSort(k)}
                  >
                    {label}
                    {active ? (
                      ordSortDir === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!ordersData ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">현재 발주가 필요한 품목이 없습니다.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {sortedRecommended.map((rec, i) => {
                const meta = urgencyMeta[rec.urgency]
                return (
                  <div
                    key={rec.product + i}
                    className={cn(
                      "rounded-lg border p-4 transition-all duration-600 hover:bg-muted/50",
                      meta.tone,
                      mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                    )}
                    style={{ transitionDelay: `${800 + i * 80}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{rec.product}</p>
                      <Badge variant="outline" className={cn("shrink-0", meta.tone)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">현재 재고</span>
                      <span className="font-medium">{rec.currentStock}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">일평균 소비</span>
                      <span className="font-medium">{rec.dailyUsage}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">권장 발주량</span>
                      <span className="font-semibold text-primary">{rec.recommendedQty}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "900ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>재고 및 폐기 관리</CardTitle>
              <CardDescription>재고 현황과 폐기 내역을 조회합니다</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="품목명 또는 카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full md:w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="inventory">재고 목록</TabsTrigger>
              <TabsTrigger value="waste">폐기 내역</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inventory" className="m-0">
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
                <TabsList className="flex-wrap h-auto gap-1">
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category} className="text-sm">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("id")}
                        >
                          품목코드 <InvSortIcon k="id" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("product")}
                        >
                          품목명 <InvSortIcon k="product" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("category")}
                        >
                          카테고리 <InvSortIcon k="category" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("currentStock")}
                        >
                          현재 재고 <InvSortIcon k="currentStock" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("stockPercent")}
                        >
                          재고 상태 <InvSortIcon k="stockPercent" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("unitPrice")}
                        >
                          단가 <InvSortIcon k="unitPrice" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleInvSort("lastUpdated")}
                        >
                          최종 업데이트 <InvSortIcon k="lastUpdated" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      : filteredItems.map((item, index) => {
                          const stockStatus = getStockStatus(item)
                          const stockPercent = getStockLevelPercent(item)
                          const status = stockStatusConfig[stockStatus]
                          return (
                            <TableRow
                              key={item.id}
                              className={cn(
                                "cursor-pointer hover:bg-muted/50 transition-all duration-600",
                                mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                              )}
                              style={{ transitionDelay: `${1000 + index * 30}ms` }}
                              onClick={() => handleEditClick(item)}
                            >
                              <TableCell className="font-mono text-sm">{item.id}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.product}</span>
                                  {stockStatus === "low" && (
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{item.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">
                                    {item.currentStock}
                                    {item.unit} ({stockPercent}%)
                                  </span>
                                  <Progress value={Math.min(stockPercent, 100)} className="h-1.5 w-24" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={status.color}>
                                  {stockStatus === "low" && <TrendingDown className="mr-1 h-3 w-3" />}
                                  {stockStatus === "high" && <TrendingUp className="mr-1 h-3 w-3" />}
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{item.lastUpdated}</TableCell>
                            </TableRow>
                          )
                        })}
                  </TableBody>
                </Table>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">총 {filteredItems.length}개 품목</p>
            </TabsContent>
            
            <TabsContent value="waste" className="m-0">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>폐기코드</TableHead>
                      <TableHead>날짜</TableHead>
                      <TableHead>품목명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>수량</TableHead>
                      <TableHead>폐기사유</TableHead>
                      <TableHead>손실금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!wasteData
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      : wasteHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            폐기 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : wasteHistory.map((waste: any, index: number) => (
                          <TableRow
                            key={waste.id}
                            className={cn(
                              "transition-all duration-600",
                              mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
                            )}
                            style={{ transitionDelay: `${200 + index * 30}ms` }}
                          >
                            <TableCell className="font-mono text-sm">{waste.id}</TableCell>
                            <TableCell>{waste.date}</TableCell>
                            <TableCell className="font-medium">{waste.product}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{waste.category}</Badge>
                            </TableCell>
                            <TableCell>{waste.quantity}개</TableCell>
                            <TableCell>{waste.reason}</TableCell>
                            <TableCell className="text-destructive font-medium">{formatCurrency(waste.loss)}</TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">총 {wasteHistory.length}건의 폐기 내역</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>품목 수정</DialogTitle>
            <DialogDescription>품목 정보를 수정합니다</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">품목명</label>
              <Input
                value={editForm.product}
                onChange={(e) => setEditForm({ ...editForm, product: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c !== "전체")
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">현재 재고</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editForm.currentStock}
                    onChange={(e) => setEditForm({ ...editForm, currentStock: Number(e.target.value) })}
                  />
                  <Input
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-16"
                    placeholder="단위"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">단가</label>
                <Input
                  type="number"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최소 재고</label>
                <Input
                  type="number"
                  value={editForm.minStock}
                  onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최대 재고</label>
                <Input
                  type="number"
                  value={editForm.maxStock}
                  onChange={(e) => setEditForm({ ...editForm, maxStock: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                취소
              </Button>
              <Button onClick={handleEditSave} disabled={isSubmitting}>
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>품목 추가</DialogTitle>
            <DialogDescription>새 품목을 등록합니다</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">품목명</label>
              <Input
                value={addForm.product}
                onChange={(e) => setAddForm({ ...addForm, product: e.target.value })}
                placeholder="예: 아메리카노 원두"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select
                value={addForm.category}
                onValueChange={(value) => setAddForm({ ...addForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c !== "전체")
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">현재 재고</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={addForm.currentStock}
                    onChange={(e) => setAddForm({ ...addForm, currentStock: Number(e.target.value) })}
                  />
                  <Input
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-16"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">단가</label>
                <Input
                  type="number"
                  value={addForm.unitPrice}
                  onChange={(e) => setAddForm({ ...addForm, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최소</label>
                <Input
                  type="number"
                  value={addForm.minStock}
                  onChange={(e) => setAddForm({ ...addForm, minStock: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최대</label>
                <Input
                  type="number"
                  value={addForm.maxStock}
                  onChange={(e) => setAddForm({ ...addForm, maxStock: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">일평균</label>
                <Input
                  type="number"
                  value={addForm.dailyUsage}
                  onChange={(e) => setAddForm({ ...addForm, dailyUsage: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddItem} disabled={isSubmitting}>
              {isSubmitting ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waste Item Dialog */}
      <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>폐기 등록</DialogTitle>
            <DialogDescription>폐기할 품목과 사유를 입력하세요 (DB 즉시 반영)</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">폐기 품목</label>
              <Select
                value={String(wasteForm.productId)}
                onValueChange={(value) => setWasteForm({ ...wasteForm, productId: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="품목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.internalProductId)}>
                      {item.product} (재고: {item.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">폐기 개수</label>
              <Input
                type="number"
                value={wasteForm.quantity}
                onChange={(e) => setWasteForm({ ...wasteForm, quantity: Number(e.target.value) })}
                min={1}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">폐기 사유</label>
              <Select
                value={wasteForm.reason}
                onValueChange={(value) => setWasteForm({ ...wasteForm, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="유통기한 만료">유통기한 만료</SelectItem>
                  <SelectItem value="품질 불량">품질 불량</SelectItem>
                  <SelectItem value="파손/오염">파손/오염</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWasteOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddWaste} disabled={isSubmitting || wasteForm.productId === 0 || wasteForm.quantity < 1}>
              {isSubmitting ? "처리 중..." : "폐기 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>품목 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{selectedItem?.product}</span>을(를) 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
              {isSubmitting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
