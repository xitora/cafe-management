"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Trash2,
  Package,
  FileText,
  Target,
  Sun,
  Moon,
  Droplets,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "재고 현황", href: "/inventory", icon: Package },
  { name: "폐기 관리", href: "/waste", icon: Trash2 },
  { name: "발주 관리", href: "/order", icon: ShoppingCart },
  { name: "리포트", href: "/reports", icon: FileText },
  { name: "예측 정확도", href: "/accuracy", icon: Target },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">물타는 알바생</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center justify-between rounded-lg bg-muted p-2">
          <Button
            variant={mounted && theme === "light" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTheme("light")}
            className="flex-1"
          >
            <Sun className="h-4 w-4" />
            <span className="ml-2">라이트</span>
          </Button>
          <Button
            variant={mounted && theme === "dark" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTheme("dark")}
            className="flex-1"
          >
            <Moon className="h-4 w-4" />
            <span className="ml-2">다크</span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
