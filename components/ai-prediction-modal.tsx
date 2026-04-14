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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface AIPredictionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = "input" | "confirm" | "analyzing" | "complete"

const weatherOptions = ["비", "눈", "우박", "안개"]
const eventOptions = ["지역 축제", "콘서트", "전시회", "스포츠 경기"]
const disasterOptions = ["태풍", "폭설", "폭우", "폭염"]

export function AIPredictionModal({ open, onOpenChange }: AIPredictionModalProps) {
  const [step, setStep] = useState<Step>("input")
  const [progress, setProgress] = useState(0)
  const [selectedWeather, setSelectedWeather] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedDisasters, setSelectedDisasters] = useState<string[]>([])
  const [isHoliday, setIsHoliday] = useState(false)
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

  const startAnalysis = () => {
    setProgress(0)
    setAnalysisStatus({
      preprocessing: false,
      patternAnalysis: false,
      modelApplication: false,
    })

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setStep("complete")
          return 100
        }

        if (prev >= 30 && !analysisStatus.preprocessing) {
          setAnalysisStatus((s) => ({ ...s, preprocessing: true }))
        }
        if (prev >= 60 && !analysisStatus.patternAnalysis) {
          setAnalysisStatus((s) => ({ ...s, patternAnalysis: true }))
        }
        if (prev >= 90 && !analysisStatus.modelApplication) {
          setAnalysisStatus((s) => ({ ...s, modelApplication: true }))
        }

        return prev + 2
      })
    }, 100)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep("input")
      setProgress(0)
      setSelectedWeather([])
      setSelectedEvents([])
      setSelectedDisasters([])
      setIsHoliday(false)
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md overflow-hidden">
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
              <label className="text-sm font-medium">외부 변수 입력</label>
              
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

              <div className="flex items-center gap-2 rounded-lg border p-4">
                <Checkbox
                  id="holiday"
                  checked={isHoliday}
                  onCheckedChange={(checked) => setIsHoliday(checked as boolean)}
                />
                <label htmlFor="holiday" className="text-sm font-medium cursor-pointer">
                  공휴일 / 휴일
                </label>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">천재지변</p>
                <div className="flex flex-wrap gap-2">
                  {disasterOptions.map((option) => (
                    <Button
                      key={option}
                      variant={selectedDisasters.includes(option) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOption(option, selectedDisasters, setSelectedDisasters)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleNextStep} className="w-full">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">외부 변수:</span>
                  <span className="font-medium">
                    {[...selectedWeather, ...selectedEvents, ...selectedDisasters].length + (isHoliday ? 1 : 0)}개 카테고리
                  </span>
                </div>
                {selectedWeather.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2">
                    <span className="text-muted-foreground">• 날씨 변화:</span>
                    <span className="pl-2">{selectedWeather.join(", ")}</span>
                  </div>
                )}
                {selectedEvents.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2">
                    <span className="text-muted-foreground">• 주변 행사:</span>
                    <span className="pl-2">{selectedEvents.join(", ")}</span>
                  </div>
                )}
                {isHoliday && (
                  <div className="pl-2">
                    <span className="text-muted-foreground">• 공휴일/휴일</span>
                  </div>
                )}
                {selectedDisasters.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2">
                    <span className="text-muted-foreground">• 천재지변:</span>
                    <span className="pl-2">{selectedDisasters.join(", ")}</span>
                  </div>
                )}
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
          <div className="flex flex-col items-center gap-6 py-4 animate-fade-in">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">AI 모델 분석 중...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                과거 데이터를 학습하고 미래 수요를 예측하고 있습니다
              </p>
            </div>
            <div className="w-full">
              <div className="mb-2 flex justify-between text-sm">
                <span>진행률</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="w-full rounded-lg border p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className={cn("flex items-center gap-2", progress >= 30 ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("h-2 w-2 rounded-full", progress >= 30 ? "bg-blue-500" : "bg-muted")} />
                  데이터 전처리 {progress >= 30 ? "완료" : "대기"}
                </div>
                <div className={cn("flex items-center gap-2", progress >= 60 ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("h-2 w-2 rounded-full", progress >= 60 ? "bg-blue-500" : "bg-muted")} />
                  패턴 분석 {progress >= 60 ? "완료" : progress >= 30 ? "중" : "대기"}
                </div>
                <div className={cn("flex items-center gap-2", progress >= 90 ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("h-2 w-2 rounded-full", progress >= 90 ? "bg-blue-500" : "bg-muted")} />
                  예측 모델 적용 {progress >= 90 ? "완료" : "대기"}
                </div>
              </div>
            </div>
          </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">1일 예측</p>
                  <p className="text-2xl font-bold">180잔</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">7일 예측</p>
                  <p className="text-2xl font-bold">1,305잔</p>
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
