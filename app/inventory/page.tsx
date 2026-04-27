"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import {
  Package,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Box,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  BarChart3,
  Trash2,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  categories,
  getStockLevelPercent,
  getStockStatus,
  stockStatusConfig,
  formatCurrency,
  type InventoryItem,
} from "@/lib/data"
import { fetcher } from "@/lib/fetcher"

type SortDirection = "asc" | "desc" | null
type SortKey = "product" | "category" | "stockPercent" | "lastUpdated" | null

interface InventoryResponse {
  items: InventoryItem[]
}

export default function InventoryPage() {
  const { data, isLoading, mutate } = useSWR<InventoryResponse>("/api/inventory", fetcher)
  const items = data?.items ?? []

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("전체")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    if (sortKey && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number
        let bValue: string | number
        switch (sortKey) {
          case "product":
            aValue = a.product
            bValue = b.product
            break
          case "category":
            aValue = a.category
            bValue = b.category
            break
          case "stockPercent":
            aValue = getStockLevelPercent(a)
            bValue = getStockLevelPercent(b)
            break
          case "lastUpdated":
            aValue = a.lastUpdated
            bValue = b.lastUpdated
            break
          default:
            return 0
        }
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" ? aValue.localeCompare(bValue, "ko") : bValue.localeCompare(aValue, "ko")
        }
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }
        return 0
      })
    }

    return filtered
  }, [items, searchQuery, selectedCategory, sortKey, sortDirection])

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

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
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
        className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">재고 현황</h1>
          <p className="text-muted-foreground">실시간 재고 현황을 확인하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
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

      <Card
        className={cn(
          "border transition-all duration-1000",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
        style={{ transitionDelay: "800ms" }}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>재고 목록</CardTitle>
              <CardDescription>품목별 재고 현황을 확인합니다</CardDescription>
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
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
            <TabsList className="flex-wrap h-auto gap-1">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="text-sm">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">품목코드</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("product")}
                    >
                      품목명 <SortIcon columnKey="product" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("category")}
                    >
                      카테고리 <SortIcon columnKey="category" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("stockPercent")}
                    >
                      현재 재고 <SortIcon columnKey="stockPercent" />
                    </Button>
                  </TableHead>
                  <TableHead>재고 상태</TableHead>
                  <TableHead>단가</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium"
                      onClick={() => handleSort("lastUpdated")}
                    >
                      최종 업데이트 <SortIcon columnKey="lastUpdated" />
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
                  : filteredAndSortedItems.map((item, index) => {
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
                          style={{ transitionDelay: `${1000 + index * 60}ms` }}
                          onClick={() => handleEditClick(item)}
                        >
                          <TableCell className="font-mono text-sm">{item.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.product}</span>
                              {stockStatus === "low" && <AlertTriangle className="h-4 w-4 text-destructive" />}
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
                          <TableCell className="text-muted-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-muted-foreground">{item.lastUpdated}</TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">총 {filteredAndSortedItems.length}개 품목</p>
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
                저장
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>품목 삭제</DialogTitle>
            <DialogDescription>
              정말로 <span className="font-medium text-foreground">{selectedItem?.product}</span> 품목을
              삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>품목 추가</DialogTitle>
            <DialogDescription>새로운 품목을 추가합니다</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">품목명</label>
              <Input
                placeholder="품목명을 입력하세요"
                value={addForm.product}
                onChange={(e) => setAddForm({ ...addForm, product: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select value={addForm.category} onValueChange={(value) => setAddForm({ ...addForm, category: value })}>
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
                    placeholder="수량"
                    value={addForm.currentStock || ""}
                    onChange={(e) => setAddForm({ ...addForm, currentStock: Number(e.target.value) })}
                  />
                  <Input
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-16"
                    placeholder="단위"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">단가</label>
                <Input
                  type="number"
                  placeholder="원"
                  value={addForm.unitPrice || ""}
                  onChange={(e) => setAddForm({ ...addForm, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최소 재고</label>
                <Input
                  type="number"
                  value={addForm.minStock || ""}
                  onChange={(e) => setAddForm({ ...addForm, minStock: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">최대 재고</label>
                <Input
                  type="number"
                  value={addForm.maxStock || ""}
                  onChange={(e) => setAddForm({ ...addForm, maxStock: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">일평균 사용량</label>
              <Input
                type="number"
                placeholder="일평균 사용량"
                value={addForm.dailyUsage || ""}
                onChange={(e) => setAddForm({ ...addForm, dailyUsage: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddItem} disabled={!addForm.product || isSubmitting}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
