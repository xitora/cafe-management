"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  FileText,
  Target,
  Sun,
  Moon,
  Menu,
  Droplets,
  X,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useTheme } from "next-themes"

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "재고 현황", href: "/inventory", icon: Package },
  { name: "리포트", href: "/reports", icon: FileText },
  { name: "예측 정확도", href: "/accuracy", icon: Target },
]

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark")

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="relative"
    >
      <Sun
        className={cn(
          "h-5 w-5 transition-all",
          mounted && isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-all",
          mounted && isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
      />
    </Button>
  )
}

function ResetButton() {
  const handleReset = async () => {
    try {
      localStorage.removeItem("predictionHistory")
      sessionStorage.removeItem("dashboardPredictionRun")
      await fetch("/api/reset", { method: "POST" })
      window.location.reload()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleReset}
      aria-label="초기화"
      className="text-muted-foreground/20 hover:text-muted-foreground transition-colors"
      title="시연 데이터 초기화"
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden text-base font-semibold sm:inline-block md:text-lg">
            물타는 알바생
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ResetButton />
          <ThemeToggle />

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">메뉴</SheetTitle>
              <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Droplets className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-base font-semibold">물타는 알바생</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="메뉴 닫기"
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
