"use client"

import { useState } from "react"
import { Download, FileText, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { DateRange } from "react-day-picker"

interface DownloadReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateRange?: DateRange
}

const reportTypes = [
  {
    id: "daily",
    name: "일간 리포트",
    description: "오늘 데이터 요약",
    icon: FileText,
  },
  {
    id: "weekly",
    name: "주간 리포트",
    description: "이번 주 데이터 분석",
    icon: FileText,
  },
  {
    id: "monthly",
    name: "월간 리포트",
    description: "이번 달 종합 분석",
    icon: FileText,
  },
]

export function DownloadReportModal({ open, onOpenChange, dateRange }: DownloadReportModalProps) {
  const [selectedReport, setSelectedReport] = useState<string>("daily")
  const [isDownloading, setIsDownloading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set("from", dateRange.from.toISOString())
      if (dateRange?.to) params.set("to", dateRange.to.toISOString())
      
      const res = await fetch(`/api/reports/download?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to generate custom report")
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `cafe_full_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsComplete(true)
      setTimeout(() => {
        onOpenChange(false)
        setIsComplete(false)
      }, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader className="animate-fade-in-up">
          <DialogTitle className="text-xl">리포트 다운로드</DialogTitle>
          <DialogDescription>
            다운로드할 리포트 유형과 형식을 선택하세요
          </DialogDescription>
        </DialogHeader>

        {isComplete ? (
          <div className="flex flex-col items-center gap-4 py-8 animate-scale-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <p className="text-lg font-semibold">다운로드 완료!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">선택된 기간</label>
              <div className="rounded-lg border p-3 text-sm text-muted-foreground bg-muted/50">
                {dateRange?.from && dateRange?.to ? 
                  `${dateRange.from.toLocaleDateString()} ~ ${dateRange.to.toLocaleDateString()}` 
                  : '기간이 설정되지 않았습니다 (기본값 사용)'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                * 위 기간 내의 매출, 재고, 폐기, 예측 데이터를 모두 새롭게 더미로 생성하여 다운로드합니다.
              </p>
            </div>

            <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
              {isDownloading ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-bounce" />
                  다운로드 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  CSV 다운로드
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
