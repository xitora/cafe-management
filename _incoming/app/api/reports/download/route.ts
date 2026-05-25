import { NextResponse } from "next/server"
import { addDays, format, differenceInDays } from "date-fns"
import { inventoryItems } from "@/lib/data"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  
  const from = fromStr ? new Date(fromStr) : new Date()
  const to = toStr ? new Date(toStr) : addDays(from, 7)
  const daysDiff = Math.max(1, differenceInDays(to, from) + 1)
  
  // Date array
  const dates = []
  for (let i = 0; i < daysDiff; i++) {
    dates.push(addDays(from, i))
  }
  
  // Generate CSV Content
  let csv = "\uFEFF" // UTF-8 BOM
  csv += `리포트 기간,${format(from, "yyyy-MM-dd")} ~ ${format(to, "yyyy-MM-dd")}\n\n`
  
  // 1. 매출 더미 데이터
  csv += "=== 1. 일별 매출 데이터 ===\n"
  csv += "날짜,품목명,카테고리,판매량,매출액\n"
  
  // Random selection of popular items for sales
  const popularItems = inventoryItems.filter(i => i.category !== "포장재" && i.category !== "기타").slice(0, 15)
  
  dates.forEach(d => {
    const dateStr = format(d, "yyyy-MM-dd")
    popularItems.forEach(item => {
      // 70% chance to have sales on a given day for a popular item
      if (Math.random() > 0.3) {
        const qty = Math.floor(Math.random() * 20) + 1
        const revenue = qty * item.unitPrice
        csv += `${dateStr},${item.product},${item.category},${qty},${revenue}\n`
      }
    })
  })
  
  // 2. 재고 더미 데이터 (현재 기준 스냅샷)
  csv += "\n=== 2. 품목별 재고 현황 ===\n"
  csv += "품목코드,품목명,카테고리,현재재고,적정재고,단가,재고비율(%)\n"
  
  inventoryItems.forEach(item => {
    // Generate random stock level
    const stock = Math.floor(Math.random() * item.maxStock)
    const ratio = Math.round((stock / item.maxStock) * 100)
    csv += `${item.id},${item.product},${item.category},${stock},${item.minStock},${item.unitPrice},${ratio}%\n`
  })
  
  // 3. 폐기 내역 더미 데이터
  csv += "\n=== 3. 기간 내 폐기 내역 ===\n"
  csv += "날짜,품목명,카테고리,폐기수량,폐기사유,손실금액\n"
  
  const wasteReasons = ["유통기한 만료", "포장 훼손", "품질 저하", "조리 실수"]
  const perishableItems = inventoryItems.filter(i => ["유제품", "과일/채소", "베이커리", "원두"].includes(i.category))
  
  dates.forEach(d => {
    const dateStr = format(d, "yyyy-MM-dd")
    // 60% chance of waste per day
    if (Math.random() > 0.4) {
      // Generate 1~3 waste records for the day
      const wasteCount = Math.floor(Math.random() * 3) + 1;
      for (let w = 0; w < wasteCount; w++) {
        const item = perishableItems[Math.floor(Math.random() * perishableItems.length)]
        if (item) {
          const qty = Math.floor(Math.random() * 5) + 1
          const reason = wasteReasons[Math.floor(Math.random() * wasteReasons.length)]
          const loss = qty * item.unitPrice
          csv += `${dateStr},${item.product},${item.category},${qty},${reason},${loss}\n`
        }
      }
    }
  })
  
  // 4. 예측 판매량 및 정확도 더미 데이터
  csv += "\n=== 4. 일별 수요 예측 및 정확도 ===\n"
  csv += "날짜,예측유형,예측판매량(잔),실제판매량(잔),정확도(%)\n"
  
  dates.forEach(d => {
    const dateStr = format(d, "yyyy-MM-dd")
    const actual = Math.floor(Math.random() * 200) + 100
    // Accuracy between 80% and 98%
    const accuracy = 80 + Math.random() * 18
    // Calculate predicted based on actual and accuracy
    // If actual = 100, accuracy = 90%, diff is 10. Predicted could be 110 or 90.
    const variance = (actual * (100 - accuracy)) / 100
    const predicted = Math.round(actual + (Math.random() > 0.5 ? variance : -variance))
    csv += `${dateStr},수요 예측,${predicted},${actual},${accuracy.toFixed(1)}\n`
  })
  
  const headers = new Headers()
  headers.set('Content-Type', 'text/csv; charset=utf-8')
  headers.set('Content-Disposition', `attachment; filename="cafe_full_report_${format(from, "yyyyMMdd")}_${format(to, "yyyyMMdd")}.csv"`)
  
  return new NextResponse(csv, { headers })
}
