import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface AIPredictionProgressProps {
  progress: number
  status: {
    preprocessing: boolean
    patternAnalysis: boolean
    modelApplication: boolean
  }
}

export function AIPredictionProgress({ progress, status }: AIPredictionProgressProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 animate-fade-in w-full max-w-md mx-auto">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <span className="absolute text-sm font-bold text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="w-full space-y-2">
        <Progress value={progress} className="w-full h-2" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">AI 모델 분석 중...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          과거 데이터를 학습하고 미래 수요를 예측하고 있습니다
        </p>
      </div>

    </div>
  )
}
