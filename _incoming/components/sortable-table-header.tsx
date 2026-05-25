"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc" | null

interface SortableTableHeaderProps {
  label: string
  sortKey: string
  currentSortKey: string | null
  currentSortDirection: SortDirection
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = currentSortKey === sortKey
  
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent font-medium"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          currentSortDirection === "asc" ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : (
            <ArrowDown className="ml-1 h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    </TableHead>
  )
}

// Hook for sorting logic
export function useSorting<T>(
  items: T[],
  defaultSortKey: string | null = null,
  defaultSortDirection: SortDirection = null
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)

  const handleSort = (key: string) => {
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

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0
    
    const aValue = (a as Record<string, unknown>)[sortKey]
    const bValue = (b as Record<string, unknown>)[sortKey]
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue, "ko")
        : bValue.localeCompare(aValue, "ko")
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  return {
    sortKey,
    sortDirection,
    handleSort,
    sortedItems,
  }
}

import { useState } from "react"
