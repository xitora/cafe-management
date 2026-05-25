"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Loader2, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { AIPredictionProgress } from "./ai-prediction-progress"
import { cn } from "@/lib/utils"

interface AIPredictionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = "input" | "confirm" | "analyzing" | "complete"

const weatherOptions = ["비", "눈", "우박", "안개"]
const eventOptions = ["지역 축제", "콘서트", "전시회", "스포츠 경기"]

export function AIPredictionModal({ open, onOpenChange }: AIPredictionModalProps) {
  const [step, setStep] = useState<Step>("input")
  const [progress, setProgress] = useState(0)
  const [selectedWeather, setSelectedWeather] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [predictionResult, setPredictionResult] = useState<any>(null)
  const [isError, setIsError] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState({
    preprocessing: false,
    patternAnalysis: false,
    modelApplication: false,
  })

  const today = new Date()
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`

  const toggleOption = (
    option: string,
    selected: string[],
    setSelected: (value: string[]) => void
  ) => {
    if (selected.includes(option)) {
      setSelected(selected.filter((item) => item !== option))
    } else {
      setSelected([...selected, option])
    }
  }

  const handleNextStep = () => {
    if (step === "input") {
      setStep("confirm")
    } else if (step === "confirm") {
      setStep("analyzing")
      startAnalysis()
    }
  }

  const handlePrevStep = () => {
    if (step === "confirm") {
      setStep("input")
    }
  }

  const startAnalysis = async () => {
    setProgress(0)
    setAnalysisStatus({
      preprocessing: false,
      patternAnalysis: false,
      modelApplication: false,
    })
    setIsError(false)

    try {
      const todayIso = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: todayIso,
          weather: selectedWeather,
          events: selectedEvents
        }),
      })

      if (!res.ok) throw new Error("API Error")
      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        
        // 마지막 조각은 완성되지 않았을 수 있으므로 버퍼에 남깁니다.
        buffer = parts.pop() || ""

        for (const part of parts) {
          const line = part.trim()
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6))
              
              if (data.type === "progress") {
                setProgress(data.percent)
                if (data.percent >= 10) setAnalysisStatus((s) => ({ ...s, preprocessing: true }))
                if (data.percent >= 40) setAnalysisStatus((s) => ({ ...s, patternAnalysis: true }))
                if (data.percent >= 70) setAnalysisStatus((s) => ({ ...s, modelApplication: true }))
              } else if (data.type === "result") {
                setProgress(100)
                setPredictionResult(data.data)
                setStep("complete")
              } else if (data.type === "error") {
                throw new Error(data.error_detail)
              }
            } catch (err) {
              console.error("SSE parse error", err)
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
      setIsError(true)
      setPredictionResult({ results: [] })
      setStep("complete")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep("input")
      setProgress(0)
      setSelectedWeather([])
      setSelectedEvents([])
      setPredictionResult(null)
      setIsError(false)
      setAnalysisStatus({
        preprocessing: false,
        patternAnalysis: false,
        modelApplication: false,
      })
    }, 300)
  }

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("input")
        setProgress(0)
      }, 300)
    }
  }, [open])

  const hasInput = selectedWeather.length > 0 || selectedEvents.length > 0
  const canProceed = true

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="animate-fade-in-up">
          <DialogTitle className="text-xl">AI 예측 모델 실행</DialogTitle>
          <DialogDescription>
            AI 모델을 사용하여 미래 수요를 예측합니다
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">분석 기준일 선택</label>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formattedDate}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">외부 변수 선택</label>

              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">날씨 변화</p>
                <div className="flex flex-wrap gap-2">
                  {weatherOptions.map((option) => (
                    <Button
                      key={option}
                      variant={selectedWeather.includes(option) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOption(option, selectedWeather, setSelectedWeather)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">주변 행사</p>
                <div className="flex flex-wrap gap-2">
                  {eventOptions.map((option) => (
                    <Button
                      key={option}
                      variant={selectedEvents.includes(option) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOption(option, selectedEvents, setSelectedEvents)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleNextStep} className="w-full" disabled={!canProceed}>
              다음 단계
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-4 font-semibold">입력 정보 확인</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">분석 기준일:</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <>
                  {selectedWeather.length > 0 && (
                    <div className="flex flex-col gap-1 pl-2 mt-2">
                      <span className="text-muted-foreground">• 날씨 변화:</span>
                      <span className="pl-2">{selectedWeather.join(", ")}</span>
                    </div>
                  )}
                  {selectedEvents.length > 0 && (
                    <div className="flex flex-col gap-1 pl-2 mt-2">
                      <span className="text-muted-foreground">• 주변 행사:</span>
                      <span className="pl-2">{selectedEvents.join(", ")}</span>
                    </div>
                  )}
                  {!hasInput && (
                    <p className="pl-2 mt-2 text-muted-foreground">선택된 외부 변수 없음</p>
                  )}
                </>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                이전
              </Button>
              <Button onClick={handleNextStep} className="flex-1">
                예측 시작
              </Button>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <AIPredictionProgress progress={progress} status={analysisStatus} />
        )}

        {step === "complete" && (
          <div className="flex flex-col items-center gap-6 py-4 animate-scale-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">예측 완료!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI 분석이 성공적으로 완료되었습니다
              </p>
            </div>
            <div className="w-full rounded-lg border p-4">
              <h4 className="mb-3 font-semibold">예측 결과 요약</h4>
              {isError && (
                <p className="mb-2 text-xs text-red-500">
                  백엔드 서버에 연결할 수 없어 가상 결과를 표시합니다.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">7일 총 예측 (음료)</p>
                  <p className="text-2xl font-bold">
                    {predictionResult?.results
                      ? Math.round(
                          predictionResult.results.reduce(
                            (acc: number, item: any) => acc + (item.q50_daily || 0),
                            0
                          )
                        )
                      : 0}
                    잔
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 권장 발주량</p>
                  <p className="text-2xl font-bold">
                    {predictionResult?.results
                      ? predictionResult.results.reduce(
                          (acc: number, item: any) => acc + (item.recommended_order_qty || 0),
                          0
                        )
                      : 0}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              결과 보기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
