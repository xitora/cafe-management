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

interface DownloadReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

const formatTypes = [
  { id: "pdf", name: "PDF", icon: FileText },
  { id: "excel", name: "Excel", icon: FileSpreadsheet },
  { id: "csv", name: "CSV", icon: FileText },
]

export function DownloadReportModal({ open, onOpenChange }: DownloadReportModalProps) {
  const [selectedReport, setSelectedReport] = useState<string>("daily")
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf")
  const [isDownloading, setIsDownloading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleDownload = () => {
    setIsDownloading(true)
    setTimeout(() => {
      setIsDownloading(false)
      setIsComplete(true)
      setTimeout(() => {
        onOpenChange(false)
        setIsComplete(false)
      }, 1500)
    }, 2000)
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
              <label className="text-sm font-medium">리포트 유형</label>
              <div className="grid gap-2">
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selectedReport === report.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    <report.icon className={cn(
                      "h-5 w-5",
                      selectedReport === report.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">파일 형식</label>
              <div className="flex gap-2">
                {formatTypes.map((format) => (
                  <Button
                    key={format.id}
                    variant={selectedFormat === format.id ? "default" : "outline"}
                    onClick={() => setSelectedFormat(format.id)}
                    className="flex-1"
                  >
                    <format.icon className="mr-2 h-4 w-4" />
                    {format.name}
                  </Button>
                ))}
              </div>
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
                  다운로드
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
