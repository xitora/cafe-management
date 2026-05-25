// Centralized data for cafe inventory management system

export interface InventoryItem {
  id: string
  category: string
  product: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  unitPrice: number
  dailyUsage: number
  lastUpdated: string
}

export interface WasteItem {
  id: string
  product: string
  quantity: number
  expiryDate: string
  daysLeft: number
  cost: string
}

export interface WasteHistory {
  id: string
  product: string
  quantity: string
  reason: string
  cost: string
  date: string
  handler: string
}

export interface Order {
  id: string
  product: string
  supplier: string
  quantity: string
  price: string
  status: "pending" | "approved" | "shipping" | "delivered"
  date: string
  urgent?: boolean
}

export interface RecommendedOrder {
  product: string
  currentStock: string
  dailyUsage: string
  recommendedQty: string
  urgency: "high" | "medium" | "low"
}

// Categories for cafe items
export const categories = [
  "전체",
  "원두",
  "유제품",
  "시럽",
  "분말류",
  "차류",
  "과일/채소",
  "베이커리",
  "포장재",
  "기타"
] as const

export type Category = typeof categories[number]

// Comprehensive cafe inventory data
export const inventoryItems: InventoryItem[] = [
  // 원두 (Coffee Beans)
  { id: "INV-001", category: "원두", product: "아메리카노 원두", currentStock: 3, unit: "kg", minStock: 5, maxStock: 20, unitPrice: 25000, dailyUsage: 2, lastUpdated: "2026-04-13" },
  { id: "INV-002", category: "원두", product: "디카페인 원두", currentStock: 8, unit: "kg", minStock: 2, maxStock: 10, unitPrice: 35000, dailyUsage: 0.5, lastUpdated: "2026-04-12" },
  { id: "INV-003", category: "원두", product: "콜드브루 원두", currentStock: 5, unit: "kg", minStock: 3, maxStock: 15, unitPrice: 30000, dailyUsage: 1.5, lastUpdated: "2026-04-13" },
  { id: "INV-004", category: "원두", product: "에스프레소 블렌드", currentStock: 4, unit: "kg", minStock: 3, maxStock: 12, unitPrice: 28000, dailyUsage: 1.2, lastUpdated: "2026-04-13" },
  
  // 유제품 (Dairy)
  { id: "INV-005", category: "유제품", product: "우유 (1L)", currentStock: 25, unit: "개", minStock: 15, maxStock: 50, unitPrice: 2500, dailyUsage: 12, lastUpdated: "2026-04-13" },
  { id: "INV-006", category: "유제품", product: "저지방 우유 (1L)", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 2800, dailyUsage: 4, lastUpdated: "2026-04-13" },
  { id: "INV-007", category: "유제품", product: "오트밀크 (1L)", currentStock: 8, unit: "개", minStock: 5, maxStock: 20, unitPrice: 4500, dailyUsage: 3, lastUpdated: "2026-04-12" },
  { id: "INV-008", category: "유제품", product: "휘핑크림", currentStock: 3, unit: "개", minStock: 4, maxStock: 15, unitPrice: 8000, dailyUsage: 1.5, lastUpdated: "2026-04-13" },
  { id: "INV-009", category: "유제품", product: "연유", currentStock: 6, unit: "개", minStock: 3, maxStock: 12, unitPrice: 5000, dailyUsage: 0.8, lastUpdated: "2026-04-11" },
  { id: "INV-010", category: "유제품", product: "두유 (1L)", currentStock: 12, unit: "개", minStock: 6, maxStock: 25, unitPrice: 3200, dailyUsage: 2, lastUpdated: "2026-04-13" },
  
  // 시럽 (Syrups)
  { id: "INV-011", category: "시럽", product: "바닐라 시럽", currentStock: 12, unit: "병", minStock: 3, maxStock: 10, unitPrice: 12000, dailyUsage: 0.5, lastUpdated: "2026-04-11" },
  { id: "INV-012", category: "시럽", product: "카라멜 시럽", currentStock: 8, unit: "병", minStock: 3, maxStock: 10, unitPrice: 12000, dailyUsage: 0.6, lastUpdated: "2026-04-12" },
  { id: "INV-013", category: "시럽", product: "헤이즐넛 시럽", currentStock: 5, unit: "병", minStock: 2, maxStock: 8, unitPrice: 12000, dailyUsage: 0.3, lastUpdated: "2026-04-10" },
  { id: "INV-014", category: "시럽", product: "모카 시럽", currentStock: 4, unit: "병", minStock: 2, maxStock: 8, unitPrice: 13000, dailyUsage: 0.4, lastUpdated: "2026-04-12" },
  { id: "INV-015", category: "시럽", product: "설탕 시럽", currentStock: 15, unit: "병", minStock: 5, maxStock: 20, unitPrice: 8000, dailyUsage: 0.8, lastUpdated: "2026-04-13" },
  { id: "INV-016", category: "시럽", product: "라벤더 시럽", currentStock: 2, unit: "병", minStock: 2, maxStock: 6, unitPrice: 15000, dailyUsage: 0.2, lastUpdated: "2026-04-09" },
  
  // 분말류 (Powders)
  { id: "INV-017", category: "분말류", product: "초코 파우더", currentStock: 5, unit: "kg", minStock: 2, maxStock: 10, unitPrice: 18000, dailyUsage: 0.4, lastUpdated: "2026-04-12" },
  { id: "INV-018", category: "분말류", product: "녹차 파우더", currentStock: 3, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 25000, dailyUsage: 0.2, lastUpdated: "2026-04-11" },
  { id: "INV-019", category: "분말류", product: "말차 파우더", currentStock: 1.5, unit: "kg", minStock: 1, maxStock: 4, unitPrice: 45000, dailyUsage: 0.15, lastUpdated: "2026-04-13" },
  { id: "INV-020", category: "분말류", product: "흑당 파우더", currentStock: 2, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 20000, dailyUsage: 0.25, lastUpdated: "2026-04-10" },
  { id: "INV-021", category: "분말류", product: "바닐라 파우더", currentStock: 0.5, unit: "kg", minStock: 0.5, maxStock: 3, unitPrice: 35000, dailyUsage: 0.1, lastUpdated: "2026-04-13" },
  
  // 차류 (Tea)
  { id: "INV-022", category: "차류", product: "얼그레이 티백", currentStock: 150, unit: "개", minStock: 50, maxStock: 300, unitPrice: 150, dailyUsage: 10, lastUpdated: "2026-04-12" },
  { id: "INV-023", category: "차류", product: "캐모마일 티백", currentStock: 80, unit: "개", minStock: 30, maxStock: 200, unitPrice: 180, dailyUsage: 5, lastUpdated: "2026-04-11" },
  { id: "INV-024", category: "차류", product: "페퍼민트 티백", currentStock: 60, unit: "개", minStock: 30, maxStock: 150, unitPrice: 180, dailyUsage: 4, lastUpdated: "2026-04-10" },
  { id: "INV-025", category: "차류", product: "유자청", currentStock: 4, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 22000, dailyUsage: 0.3, lastUpdated: "2026-04-13" },
  { id: "INV-026", category: "차류", product: "생강청", currentStock: 2, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 18000, dailyUsage: 0.2, lastUpdated: "2026-04-12" },
  { id: "INV-027", category: "차류", product: "히비스커스 티", currentStock: 40, unit: "개", minStock: 20, maxStock: 100, unitPrice: 200, dailyUsage: 3, lastUpdated: "2026-04-09" },
  
  // 과일/채소 (Fruits & Vegetables)
  { id: "INV-028", category: "과일/채소", product: "레몬", currentStock: 20, unit: "개", minStock: 15, maxStock: 50, unitPrice: 500, dailyUsage: 8, lastUpdated: "2026-04-13" },
  { id: "INV-029", category: "과일/채소", product: "라임", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 600, dailyUsage: 3, lastUpdated: "2026-04-12" },
  { id: "INV-030", category: "과일/채소", product: "딸기 (냉동)", currentStock: 3, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 15000, dailyUsage: 0.5, lastUpdated: "2026-04-13" },
  { id: "INV-031", category: "과일/채소", product: "블루베리 (냉동)", currentStock: 2, unit: "kg", minStock: 1.5, maxStock: 6, unitPrice: 18000, dailyUsage: 0.3, lastUpdated: "2026-04-12" },
  { id: "INV-032", category: "과일/채소", product: "망고 (냉동)", currentStock: 2.5, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 20000, dailyUsage: 0.4, lastUpdated: "2026-04-11" },
  { id: "INV-033", category: "과일/채소", product: "바나나", currentStock: 15, unit: "개", minStock: 10, maxStock: 40, unitPrice: 300, dailyUsage: 6, lastUpdated: "2026-04-13" },
  
  // 베이커리 (Bakery)
  { id: "INV-034", category: "베이커리", product: "크루아상", currentStock: 12, unit: "개", minStock: 10, maxStock: 30, unitPrice: 3000, dailyUsage: 8, lastUpdated: "2026-04-13" },
  { id: "INV-035", category: "베이커리", product: "머핀 (블루베리)", currentStock: 8, unit: "개", minStock: 6, maxStock: 20, unitPrice: 3500, dailyUsage: 4, lastUpdated: "2026-04-13" },
  { id: "INV-036", category: "베이커리", product: "샌드위치 (햄치즈)", currentStock: 10, unit: "개", minStock: 8, maxStock: 25, unitPrice: 4500, dailyUsage: 6, lastUpdated: "2026-04-13" },
  { id: "INV-037", category: "베이커리", product: "샌드위치 (에그)", currentStock: 6, unit: "개", minStock: 5, maxStock: 20, unitPrice: 4000, dailyUsage: 4, lastUpdated: "2026-04-13" },
  { id: "INV-038", category: "베이커리", product: "스콘", currentStock: 15, unit: "개", minStock: 8, maxStock: 25, unitPrice: 2500, dailyUsage: 5, lastUpdated: "2026-04-12" },
  { id: "INV-039", category: "베이커리", product: "베이글", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 2800, dailyUsage: 6, lastUpdated: "2026-04-13" },
  { id: "INV-040", category: "베이커리", product: "치즈케이크 (슬라이스)", currentStock: 4, unit: "개", minStock: 4, maxStock: 15, unitPrice: 5500, dailyUsage: 3, lastUpdated: "2026-04-13" },
  
  // 포장재 (Packaging)
  { id: "INV-041", category: "포장재", product: "종이컵 (12oz)", currentStock: 800, unit: "개", minStock: 300, maxStock: 1500, unitPrice: 85, dailyUsage: 80, lastUpdated: "2026-04-12" },
  { id: "INV-042", category: "포장재", product: "종이컵 (16oz)", currentStock: 500, unit: "개", minStock: 200, maxStock: 1000, unitPrice: 95, dailyUsage: 50, lastUpdated: "2026-04-12" },
  { id: "INV-043", category: "포장재", product: "플라스틱 뚜껑 (12oz)", currentStock: 150, unit: "개", minStock: 300, maxStock: 1200, unitPrice: 45, dailyUsage: 80, lastUpdated: "2026-04-13" },
  { id: "INV-044", category: "포장재", product: "플라스틱 뚜껑 (16oz)", currentStock: 400, unit: "개", minStock: 200, maxStock: 800, unitPrice: 50, dailyUsage: 50, lastUpdated: "2026-04-12" },
  { id: "INV-045", category: "포장재", product: "빨대 (종이)", currentStock: 1200, unit: "개", minStock: 500, maxStock: 2000, unitPrice: 25, dailyUsage: 100, lastUpdated: "2026-04-11" },
  { id: "INV-046", category: "포장재", product: "홀더 (종이)", currentStock: 300, unit: "개", minStock: 150, maxStock: 600, unitPrice: 60, dailyUsage: 40, lastUpdated: "2026-04-12" },
  { id: "INV-047", category: "포장재", product: "테이크아웃 백", currentStock: 250, unit: "개", minStock: 100, maxStock: 500, unitPrice: 80, dailyUsage: 30, lastUpdated: "2026-04-13" },
  { id: "INV-048", category: "포장재", product: "냅킨", currentStock: 2000, unit: "개", minStock: 500, maxStock: 3000, unitPrice: 10, dailyUsage: 150, lastUpdated: "2026-04-10" },
  
  // 기타 (Others)
  { id: "INV-049", category: "기타", product: "설탕 (백설탕)", currentStock: 10, unit: "kg", minStock: 3, maxStock: 15, unitPrice: 3000, dailyUsage: 0.5, lastUpdated: "2026-04-11" },
  { id: "INV-050", category: "기타", product: "얼음", currentStock: 50, unit: "kg", minStock: 20, maxStock: 100, unitPrice: 1000, dailyUsage: 15, lastUpdated: "2026-04-13" },
  { id: "INV-051", category: "기타", product: "시나몬 파우더", currentStock: 0.3, unit: "kg", minStock: 0.2, maxStock: 1, unitPrice: 25000, dailyUsage: 0.02, lastUpdated: "2026-04-08" },
  { id: "INV-052", category: "기타", product: "코코넛 플레이크", currentStock: 0.5, unit: "kg", minStock: 0.3, maxStock: 2, unitPrice: 18000, dailyUsage: 0.05, lastUpdated: "2026-04-07" },
]

// Calculate stock level percentage
export function getStockLevelPercent(item: InventoryItem): number {
  return Math.round((item.currentStock / item.maxStock) * 100)
}

// Get stock status
export function getStockStatus(item: InventoryItem): "low" | "normal" | "high" {
  const percent = getStockLevelPercent(item)
  const minPercent = (item.minStock / item.maxStock) * 100
  
  if (item.currentStock < item.minStock) return "low"
  if (percent > 100) return "high"
  return "normal"
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value)
}

// Expiring items for waste management
export const expiringItems: WasteItem[] = [
  { id: "EXP-001", product: "샌드위치 (햄치즈)", quantity: 10, expiryDate: "2026-04-14", daysLeft: 1, cost: "₩35,000" },
  { id: "EXP-002", product: "샐러드 (시저)", quantity: 5, expiryDate: "2026-04-14", daysLeft: 1, cost: "₩25,000" },
  { id: "EXP-003", product: "우유 (1L)", quantity: 8, expiryDate: "2026-04-15", daysLeft: 2, cost: "₩20,000" },
  { id: "EXP-004", product: "요거트", quantity: 15, expiryDate: "2026-04-16", daysLeft: 3, cost: "₩22,500" },
  { id: "EXP-005", product: "크루아상", quantity: 6, expiryDate: "2026-04-14", daysLeft: 1, cost: "₩18,000" },
]

// Waste history
export const wasteHistory: WasteHistory[] = [
  { id: "WST-001", product: "샌드위치 (BLT)", quantity: "5개", reason: "유통기한 만료", cost: "₩17,500", date: "2026-04-12", handler: "김민수" },
  { id: "WST-002", product: "딸기 케이크", quantity: "2개", reason: "유통기한 만료", cost: "₩16,000", date: "2026-04-12", handler: "이영희" },
  { id: "WST-003", product: "우유 (1L)", quantity: "3개", reason: "파손", cost: "₩7,500", date: "2026-04-11", handler: "박지훈" },
  { id: "WST-004", product: "아메리카노 원두", quantity: "0.5kg", reason: "품질 불량", cost: "₩12,500", date: "2026-04-10", handler: "김민수" },
  { id: "WST-005", product: "샐러드 (그릭)", quantity: "4개", reason: "유통기한 만료", cost: "₩20,000", date: "2026-04-10", handler: "이영희" },
]

// Orders
export const orders: Order[] = [
  { id: "ORD-001", product: "아메리카노 원두", supplier: "커피빈 공급", quantity: "10kg", price: "₩250,000", status: "pending", date: "2026-04-13", urgent: true },
  { id: "ORD-002", product: "우유 (1L)", supplier: "서울우유", quantity: "50개", price: "₩125,000", status: "approved", date: "2026-04-12" },
  { id: "ORD-003", product: "종이컵 (12oz)", supplier: "패키지원", quantity: "1,000개", price: "₩85,000", status: "shipping", date: "2026-04-11" },
  { id: "ORD-004", product: "시럽 세트", supplier: "베버리지월드", quantity: "5세트", price: "₩150,000", status: "delivered", date: "2026-04-10" },
  { id: "ORD-005", product: "샌드위치 재료", supplier: "프레시푸드", quantity: "1박스", price: "₩180,000", status: "pending", date: "2026-04-13" },
  { id: "ORD-006", product: "플라스틱 뚜껑", supplier: "패키지원", quantity: "500개", price: "₩45,000", status: "approved", date: "2026-04-12", urgent: true },
]

// Recommended orders
export const recommendedOrders: RecommendedOrder[] = [
  { product: "아메리카노 원두", currentStock: "3kg", dailyUsage: "2kg", recommendedQty: "10kg", urgency: "high" },
  { product: "우유 (1L)", currentStock: "8개", dailyUsage: "5개", recommendedQty: "30개", urgency: "medium" },
  { product: "플라스틱 뚜껑", currentStock: "150개", dailyUsage: "80개", recommendedQty: "500개", urgency: "high" },
  { product: "시럽 (바닐라)", currentStock: "2병", dailyUsage: "0.5병", recommendedQty: "5병", urgency: "low" },
]

// Status configurations
export const orderStatusConfig = {
  pending: { label: "대기 중", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  approved: { label: "승인됨", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  shipping: { label: "배송 중", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  delivered: { label: "배송완료", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
}

export const stockStatusConfig = {
  low: { label: "부족", color: "bg-destructive/10 text-destructive" },
  normal: { label: "적정", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  high: { label: "과잉", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
}

// Weekly sales data (for bar chart)
export const weeklyData = [
  { day: "월", sales: 320, orders: 45, waste: 8 },
  { day: "화", sales: 280, orders: 38, waste: 5 },
  { day: "수", sales: 350, orders: 52, waste: 12 },
  { day: "목", sales: 410, orders: 60, waste: 6 },
  { day: "금", sales: 520, orders: 78, waste: 10 },
  { day: "토", sales: 680, orders: 95, waste: 15 },
  { day: "일", sales: 450, orders: 65, waste: 9 },
]

// 14-day forecast data for dashboard (7 days actual + predicted, 7 days predicted only)
export const forecastData = [
  { date: "5/18", actual: 305, predicted: 312 },
  { date: "5/19", actual: 280, predicted: 275 },
  { date: "5/20", actual: 340, predicted: 348 },
  { date: "5/21", actual: 380, predicted: 365 },
  { date: "5/22", actual: 490, predicted: 495 },
  { date: "5/23", actual: 620, predicted: 600 },
  { date: "5/24", actual: 510, predicted: 525 },
  { date: "5/25", actual: null, predicted: 320 },
  { date: "5/26", actual: null, predicted: 290 },
  { date: "5/27", actual: null, predicted: 350 },
  { date: "5/28", actual: null, predicted: 390 },
  { date: "5/29", actual: null, predicted: 510 },
  { date: "5/30", actual: null, predicted: 630 },
  { date: "5/31", actual: null, predicted: 530 },
]

// Monthly accuracy trend data
export const monthlyAccuracyData = [
  { week: "1주차", accuracy: 85.2 },
  { week: "2주차", accuracy: 87.1 },
  { week: "3주차", accuracy: 86.8 },
  { week: "4주차", accuracy: 89.5 },
]

// Top products
export const topProducts = [
  { rank: 1, name: "아이스 아메리카노", sales: 2450, revenue: "₩9,800,000", trend: "up" as const },
  { rank: 2, name: "카페라떼", sales: 1820, revenue: "₩8,190,000", trend: "up" as const },
  { rank: 3, name: "바닐라라떼", sales: 1240, revenue: "₩6,200,000", trend: "down" as const },
  { rank: 4, name: "콜드브루", sales: 980, revenue: "₩4,900,000", trend: "up" as const },
  { rank: 5, name: "카푸치노", sales: 760, revenue: "₩3,420,000", trend: "stable" as const },
]

// Prediction history
export const predictionHistory = [
  { id: 1, date: "2026-04-13", type: "수요 예측", predicted: "180잔", actual: "175잔", accuracy: 97.2, status: "accurate" as const },
  { id: 2, date: "2026-04-12", type: "수요 예측", predicted: "165잔", actual: "172잔", accuracy: 95.9, status: "accurate" as const },
  { id: 3, date: "2026-04-11", type: "재고 예측", predicted: "원두 5kg", actual: "원두 4.2kg", accuracy: 84.0, status: "warning" as const },
  { id: 4, date: "2026-04-10", type: "수요 예측", predicted: "210잔", actual: "185잔", accuracy: 88.1, status: "warning" as const },
  { id: 5, date: "2026-04-09", type: "폐기 예측", predicted: "₩25,000", actual: "₩42,000", accuracy: 59.5, status: "inaccurate" as const },
  { id: 6, date: "2026-04-08", type: "수요 예측", predicted: "195잔", actual: "198잔", accuracy: 98.5, status: "accurate" as const },
]
