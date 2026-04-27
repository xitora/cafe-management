// In-memory cafe database with rich seed data anchored to the current date.
// Persisted across HMR via globalThis.

import {
  type InventoryItem,
  type Order,
  type WasteHistory,
  type WasteItem,
  categories,
} from "./data"

// =============== Extended types ===============

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  category: string // primary supply category
  rating: number // 1-5
  leadTimeDays: number
}

export interface Staff {
  id: string
  name: string
  role: "매니저" | "바리스타" | "주방" | "파트타임"
  hiredAt: string
}

export interface SalesTransaction {
  id: string
  date: string // YYYY-MM-DD
  menu: string
  category: "커피" | "음료" | "푸드" | "MD"
  quantity: number
  unitPrice: number
  amount: number
  weather: "맑음" | "흐림" | "비" | "눈"
  temperatureC: number
}

export interface Prediction {
  id: number
  date: string
  type: "수요 예측" | "재고 예측" | "폐기 예측"
  predicted: string
  actual: string
  accuracy: number
  status: "accurate" | "warning" | "inaccurate"
}

export interface DBState {
  inventory: InventoryItem[]
  suppliers: Supplier[]
  staff: Staff[]
  orders: Order[]
  wasteHistory: WasteHistory[]
  expiring: WasteItem[]
  sales: SalesTransaction[]
  predictions: Prediction[]
  seededAt: string // anchor date used for relative seeding
}

// =============== Date helpers ===============

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysAgo(n: number, base = new Date()): string {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return toISO(d)
}

export function daysFromNow(n: number, base = new Date()): string {
  return daysAgo(-n, base)
}

// =============== Deterministic pseudo-random ===============

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260427)
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

// =============== Seed builders ===============

function seedInventory(today: Date): InventoryItem[] {
  // Use the existing rich item structure but with rolling lastUpdated dates
  const base: Omit<InventoryItem, "lastUpdated">[] = [
    { id: "INV-001", category: "원두", product: "아메리카노 원두", currentStock: 3, unit: "kg", minStock: 5, maxStock: 20, unitPrice: 25000, dailyUsage: 2 },
    { id: "INV-002", category: "원두", product: "디카페인 원두", currentStock: 8, unit: "kg", minStock: 2, maxStock: 10, unitPrice: 35000, dailyUsage: 0.5 },
    { id: "INV-003", category: "원두", product: "콜드브루 원두", currentStock: 5, unit: "kg", minStock: 3, maxStock: 15, unitPrice: 30000, dailyUsage: 1.5 },
    { id: "INV-004", category: "원두", product: "에스프레소 블렌드", currentStock: 4, unit: "kg", minStock: 3, maxStock: 12, unitPrice: 28000, dailyUsage: 1.2 },
    { id: "INV-005", category: "유제품", product: "우유 (1L)", currentStock: 25, unit: "개", minStock: 15, maxStock: 50, unitPrice: 2500, dailyUsage: 12 },
    { id: "INV-006", category: "유제품", product: "저지방 우유 (1L)", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 2800, dailyUsage: 4 },
    { id: "INV-007", category: "유제품", product: "오트밀크 (1L)", currentStock: 8, unit: "개", minStock: 5, maxStock: 20, unitPrice: 4500, dailyUsage: 3 },
    { id: "INV-008", category: "유제품", product: "휘핑크림", currentStock: 3, unit: "개", minStock: 4, maxStock: 15, unitPrice: 8000, dailyUsage: 1.5 },
    { id: "INV-009", category: "유제품", product: "연유", currentStock: 6, unit: "개", minStock: 3, maxStock: 12, unitPrice: 5000, dailyUsage: 0.8 },
    { id: "INV-010", category: "유제품", product: "두유 (1L)", currentStock: 12, unit: "개", minStock: 6, maxStock: 25, unitPrice: 3200, dailyUsage: 2 },
    { id: "INV-011", category: "시럽", product: "바닐라 시럽", currentStock: 12, unit: "병", minStock: 3, maxStock: 10, unitPrice: 12000, dailyUsage: 0.5 },
    { id: "INV-012", category: "시럽", product: "카라멜 시럽", currentStock: 8, unit: "병", minStock: 3, maxStock: 10, unitPrice: 12000, dailyUsage: 0.6 },
    { id: "INV-013", category: "시럽", product: "헤이즐넛 시럽", currentStock: 5, unit: "병", minStock: 2, maxStock: 8, unitPrice: 12000, dailyUsage: 0.3 },
    { id: "INV-014", category: "시럽", product: "모카 시럽", currentStock: 4, unit: "병", minStock: 2, maxStock: 8, unitPrice: 13000, dailyUsage: 0.4 },
    { id: "INV-015", category: "시럽", product: "설탕 시럽", currentStock: 15, unit: "병", minStock: 5, maxStock: 20, unitPrice: 8000, dailyUsage: 0.8 },
    { id: "INV-016", category: "시럽", product: "라벤더 시럽", currentStock: 2, unit: "병", minStock: 2, maxStock: 6, unitPrice: 15000, dailyUsage: 0.2 },
    { id: "INV-017", category: "분말류", product: "초코 파우더", currentStock: 5, unit: "kg", minStock: 2, maxStock: 10, unitPrice: 18000, dailyUsage: 0.4 },
    { id: "INV-018", category: "분말류", product: "녹차 파우더", currentStock: 3, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 25000, dailyUsage: 0.2 },
    { id: "INV-019", category: "분말류", product: "말차 파우더", currentStock: 1.5, unit: "kg", minStock: 1, maxStock: 4, unitPrice: 45000, dailyUsage: 0.15 },
    { id: "INV-020", category: "분말류", product: "흑당 파우더", currentStock: 2, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 20000, dailyUsage: 0.25 },
    { id: "INV-021", category: "분말류", product: "바닐라 파우더", currentStock: 0.5, unit: "kg", minStock: 0.5, maxStock: 3, unitPrice: 35000, dailyUsage: 0.1 },
    { id: "INV-022", category: "차류", product: "얼그레이 티백", currentStock: 150, unit: "개", minStock: 50, maxStock: 300, unitPrice: 150, dailyUsage: 10 },
    { id: "INV-023", category: "차류", product: "캐모마일 티백", currentStock: 80, unit: "개", minStock: 30, maxStock: 200, unitPrice: 180, dailyUsage: 5 },
    { id: "INV-024", category: "차류", product: "페퍼민트 티백", currentStock: 60, unit: "개", minStock: 30, maxStock: 150, unitPrice: 180, dailyUsage: 4 },
    { id: "INV-025", category: "차류", product: "유자청", currentStock: 4, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 22000, dailyUsage: 0.3 },
    { id: "INV-026", category: "차류", product: "생강청", currentStock: 2, unit: "kg", minStock: 1, maxStock: 5, unitPrice: 18000, dailyUsage: 0.2 },
    { id: "INV-027", category: "차류", product: "히비스커스 티", currentStock: 40, unit: "개", minStock: 20, maxStock: 100, unitPrice: 200, dailyUsage: 3 },
    { id: "INV-028", category: "과일/채소", product: "레몬", currentStock: 20, unit: "개", minStock: 15, maxStock: 50, unitPrice: 500, dailyUsage: 8 },
    { id: "INV-029", category: "과일/채소", product: "라임", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 600, dailyUsage: 3 },
    { id: "INV-030", category: "과일/채소", product: "딸기 (냉동)", currentStock: 3, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 15000, dailyUsage: 0.5 },
    { id: "INV-031", category: "과일/채소", product: "블루베리 (냉동)", currentStock: 2, unit: "kg", minStock: 1.5, maxStock: 6, unitPrice: 18000, dailyUsage: 0.3 },
    { id: "INV-032", category: "과일/채소", product: "망고 (냉동)", currentStock: 2.5, unit: "kg", minStock: 2, maxStock: 8, unitPrice: 20000, dailyUsage: 0.4 },
    { id: "INV-033", category: "과일/채소", product: "바나나", currentStock: 15, unit: "개", minStock: 10, maxStock: 40, unitPrice: 300, dailyUsage: 6 },
    { id: "INV-034", category: "베이커리", product: "크루아상", currentStock: 12, unit: "개", minStock: 10, maxStock: 30, unitPrice: 3000, dailyUsage: 8 },
    { id: "INV-035", category: "베이커리", product: "머핀 (블루베리)", currentStock: 8, unit: "개", minStock: 6, maxStock: 20, unitPrice: 3500, dailyUsage: 4 },
    { id: "INV-036", category: "베이커리", product: "샌드위치 (햄치즈)", currentStock: 10, unit: "개", minStock: 8, maxStock: 25, unitPrice: 4500, dailyUsage: 6 },
    { id: "INV-037", category: "베이커리", product: "샌드위치 (에그)", currentStock: 6, unit: "개", minStock: 5, maxStock: 20, unitPrice: 4000, dailyUsage: 4 },
    { id: "INV-038", category: "베이커리", product: "스콘", currentStock: 15, unit: "개", minStock: 8, maxStock: 25, unitPrice: 2500, dailyUsage: 5 },
    { id: "INV-039", category: "베이커리", product: "베이글", currentStock: 10, unit: "개", minStock: 8, maxStock: 30, unitPrice: 2800, dailyUsage: 6 },
    { id: "INV-040", category: "베이커리", product: "치즈케이크 (슬라이스)", currentStock: 4, unit: "개", minStock: 4, maxStock: 15, unitPrice: 5500, dailyUsage: 3 },
    { id: "INV-041", category: "포장재", product: "종이컵 (12oz)", currentStock: 800, unit: "개", minStock: 300, maxStock: 1500, unitPrice: 85, dailyUsage: 80 },
    { id: "INV-042", category: "포장재", product: "종이컵 (16oz)", currentStock: 500, unit: "개", minStock: 200, maxStock: 1000, unitPrice: 95, dailyUsage: 50 },
    { id: "INV-043", category: "포장재", product: "플라스틱 뚜껑 (12oz)", currentStock: 150, unit: "개", minStock: 300, maxStock: 1200, unitPrice: 45, dailyUsage: 80 },
    { id: "INV-044", category: "포장재", product: "플라스틱 뚜껑 (16oz)", currentStock: 400, unit: "개", minStock: 200, maxStock: 800, unitPrice: 50, dailyUsage: 50 },
    { id: "INV-045", category: "포장재", product: "빨대 (종이)", currentStock: 1200, unit: "개", minStock: 500, maxStock: 2000, unitPrice: 25, dailyUsage: 100 },
    { id: "INV-046", category: "포장재", product: "홀더 (종이)", currentStock: 300, unit: "개", minStock: 150, maxStock: 600, unitPrice: 60, dailyUsage: 40 },
    { id: "INV-047", category: "포장재", product: "테이크아웃 백", currentStock: 250, unit: "개", minStock: 100, maxStock: 500, unitPrice: 80, dailyUsage: 30 },
    { id: "INV-048", category: "포장재", product: "냅킨", currentStock: 2000, unit: "개", minStock: 500, maxStock: 3000, unitPrice: 10, dailyUsage: 150 },
    { id: "INV-049", category: "기타", product: "설탕 (백설탕)", currentStock: 10, unit: "kg", minStock: 3, maxStock: 15, unitPrice: 3000, dailyUsage: 0.5 },
    { id: "INV-050", category: "기타", product: "얼음", currentStock: 50, unit: "kg", minStock: 20, maxStock: 100, unitPrice: 1000, dailyUsage: 15 },
    { id: "INV-051", category: "기타", product: "시나몬 파우더", currentStock: 0.3, unit: "kg", minStock: 0.2, maxStock: 1, unitPrice: 25000, dailyUsage: 0.02 },
    { id: "INV-052", category: "기타", product: "코코넛 플레이크", currentStock: 0.5, unit: "kg", minStock: 0.3, maxStock: 2, unitPrice: 18000, dailyUsage: 0.05 },
  ]
  return base.map((b, i) => ({
    ...b,
    lastUpdated: daysAgo(i % 7, today),
  }))
}

function seedSuppliers(): Supplier[] {
  return [
    { id: "SUP-001", name: "커피빈 공급", contact: "02-1234-5678", email: "sales@coffeebean.kr", category: "원두", rating: 4.8, leadTimeDays: 2 },
    { id: "SUP-002", name: "서울우유", contact: "02-2345-6789", email: "b2b@seoulmilk.kr", category: "유제품", rating: 4.6, leadTimeDays: 1 },
    { id: "SUP-003", name: "패키지원", contact: "031-3456-7890", email: "order@packageone.kr", category: "포장재", rating: 4.4, leadTimeDays: 3 },
    { id: "SUP-004", name: "베버리지월드", contact: "02-4567-8901", email: "info@bevworld.kr", category: "시럽", rating: 4.5, leadTimeDays: 2 },
    { id: "SUP-005", name: "프레시푸드", contact: "031-5678-9012", email: "fresh@freshfood.kr", category: "베이커리", rating: 4.7, leadTimeDays: 1 },
    { id: "SUP-006", name: "그린마켓", contact: "02-6789-0123", email: "hello@greenmarket.kr", category: "과일/채소", rating: 4.3, leadTimeDays: 1 },
    { id: "SUP-007", name: "티팩토리", contact: "031-7890-1234", email: "tea@teafactory.kr", category: "차류", rating: 4.6, leadTimeDays: 4 },
    { id: "SUP-008", name: "파우더플러스", contact: "02-8901-2345", email: "sales@powderplus.kr", category: "분말류", rating: 4.2, leadTimeDays: 3 },
  ]
}

function seedStaff(today: Date): Staff[] {
  return [
    { id: "STF-001", name: "김민수", role: "매니저", hiredAt: daysAgo(800, today) },
    { id: "STF-002", name: "이영희", role: "바리스타", hiredAt: daysAgo(420, today) },
    { id: "STF-003", name: "박지훈", role: "바리스타", hiredAt: daysAgo(180, today) },
    { id: "STF-004", name: "최서연", role: "주방", hiredAt: daysAgo(95, today) },
    { id: "STF-005", name: "정유나", role: "파트타임", hiredAt: daysAgo(45, today) },
  ]
}

function seedOrders(today: Date): Order[] {
  // Spread orders across the past 14 days, mixing statuses
  const data: Array<Omit<Order, "date"> & { offset: number }> = [
    { id: "ORD-001", product: "아메리카노 원두", supplier: "커피빈 공급", quantity: "10kg", price: "₩250,000", status: "pending", urgent: true, offset: 0 },
    { id: "ORD-002", product: "우유 (1L)", supplier: "서울우유", quantity: "50개", price: "₩125,000", status: "approved", offset: 1 },
    { id: "ORD-003", product: "종이컵 (12oz)", supplier: "패키지원", quantity: "1,000개", price: "₩85,000", status: "shipping", offset: 2 },
    { id: "ORD-004", product: "시럽 세트", supplier: "베버리지월드", quantity: "5세트", price: "₩150,000", status: "delivered", offset: 3 },
    { id: "ORD-005", product: "샌드위치 재료", supplier: "프레시푸드", quantity: "1박스", price: "₩180,000", status: "pending", offset: 0 },
    { id: "ORD-006", product: "플라스틱 뚜껑 (12oz)", supplier: "패키지원", quantity: "500개", price: "₩45,000", status: "approved", urgent: true, offset: 1 },
    { id: "ORD-007", product: "오트밀크 (1L)", supplier: "서울우유", quantity: "30개", price: "₩135,000", status: "delivered", offset: 5 },
    { id: "ORD-008", product: "크루아상", supplier: "프레시푸드", quantity: "60개", price: "₩180,000", status: "delivered", offset: 6 },
    { id: "ORD-009", product: "디카페인 원두", supplier: "커피빈 공급", quantity: "5kg", price: "₩175,000", status: "shipping", offset: 4 },
    { id: "ORD-010", product: "얼그레이 티백", supplier: "티팩토리", quantity: "300개", price: "₩45,000", status: "delivered", offset: 8 },
    { id: "ORD-011", product: "초코 파우더", supplier: "파우더플러스", quantity: "5kg", price: "₩90,000", status: "approved", offset: 2 },
    { id: "ORD-012", product: "레몬", supplier: "그린마켓", quantity: "100개", price: "₩50,000", status: "delivered", offset: 7 },
    { id: "ORD-013", product: "냅킨", supplier: "패키지원", quantity: "5,000개", price: "₩50,000", status: "delivered", offset: 10 },
    { id: "ORD-014", product: "유자청", supplier: "티팩토리", quantity: "5kg", price: "₩110,000", status: "delivered", offset: 12 },
    { id: "ORD-015", product: "치즈케이크", supplier: "프레시푸드", quantity: "20개", price: "₩110,000", status: "delivered", offset: 9 },
  ]
  return data.map(({ offset, ...o }) => ({ ...o, date: daysAgo(offset, today) }))
}

function seedExpiring(today: Date): WasteItem[] {
  return [
    { id: "EXP-001", product: "샌드위치 (햄치즈)", quantity: 10, expiryDate: daysFromNow(1, today), daysLeft: 1, cost: "₩35,000" },
    { id: "EXP-002", product: "샐러드 (시저)", quantity: 5, expiryDate: daysFromNow(1, today), daysLeft: 1, cost: "₩25,000" },
    { id: "EXP-003", product: "우유 (1L)", quantity: 8, expiryDate: daysFromNow(2, today), daysLeft: 2, cost: "₩20,000" },
    { id: "EXP-004", product: "요거트", quantity: 15, expiryDate: daysFromNow(3, today), daysLeft: 3, cost: "₩22,500" },
    { id: "EXP-005", product: "크루아상", quantity: 6, expiryDate: daysFromNow(1, today), daysLeft: 1, cost: "₩18,000" },
    { id: "EXP-006", product: "머핀 (블루베리)", quantity: 4, expiryDate: daysFromNow(2, today), daysLeft: 2, cost: "₩14,000" },
    { id: "EXP-007", product: "스콘", quantity: 7, expiryDate: daysFromNow(3, today), daysLeft: 3, cost: "₩17,500" },
    { id: "EXP-008", product: "베이글", quantity: 5, expiryDate: daysFromNow(2, today), daysLeft: 2, cost: "₩14,000" },
    { id: "EXP-009", product: "오트밀크 (1L)", quantity: 3, expiryDate: daysFromNow(3, today), daysLeft: 3, cost: "₩13,500" },
    { id: "EXP-010", product: "딸기 (냉동)", quantity: 2, expiryDate: daysFromNow(2, today), daysLeft: 2, cost: "₩30,000" },
  ]
}

function seedWasteHistory(today: Date): WasteHistory[] {
  const handlers = ["김민수", "이영희", "박지훈", "최서연", "정유나"]
  const reasons = ["유통기한 만료", "파손", "품질 불량", "오염", "조리 실수"]
  const products = [
    ["샌드위치 (BLT)", "5개", 17500],
    ["딸기 케이크", "2개", 16000],
    ["우유 (1L)", "3개", 7500],
    ["아메리카노 원두", "0.5kg", 12500],
    ["샐러드 (그릭)", "4개", 20000],
    ["크루아상", "8개", 24000],
    ["스콘", "6개", 15000],
    ["오트밀크 (1L)", "2개", 9000],
    ["블루베리 (냉동)", "0.3kg", 5400],
    ["머핀 (블루베리)", "5개", 17500],
    ["치즈케이크", "3개", 16500],
    ["베이글", "7개", 19600],
    ["플레인 요거트", "10개", 15000],
    ["라임", "8개", 4800],
    ["바닐라 시럽", "1병", 12000],
  ]
  return products.map((p, i) => ({
    id: `WST-${String(i + 1).padStart(3, "0")}`,
    product: p[0] as string,
    quantity: p[1] as string,
    reason: reasons[i % reasons.length],
    cost: `₩${(p[2] as number).toLocaleString()}`,
    date: daysAgo(i + 1, today),
    handler: handlers[i % handlers.length],
  }))
}

function seedSales(today: Date): SalesTransaction[] {
  // Generate ~90 days of daily sales aggregates per menu
  const menus: Array<{ menu: string; category: SalesTransaction["category"]; price: number; baseQty: number }> = [
    { menu: "아이스 아메리카노", category: "커피", price: 4000, baseQty: 80 },
    { menu: "카페라떼", category: "커피", price: 4500, baseQty: 55 },
    { menu: "바닐라라떼", category: "커피", price: 5000, baseQty: 38 },
    { menu: "콜드브루", category: "커피", price: 5000, baseQty: 30 },
    { menu: "카푸치노", category: "커피", price: 4500, baseQty: 22 },
    { menu: "에스프레소", category: "커피", price: 3500, baseQty: 18 },
    { menu: "녹차라떼", category: "음료", price: 5500, baseQty: 18 },
    { menu: "초코라떼", category: "음료", price: 5500, baseQty: 15 },
    { menu: "레몬에이드", category: "음료", price: 5000, baseQty: 20 },
    { menu: "유자차", category: "음료", price: 5000, baseQty: 12 },
    { menu: "크루아상", category: "푸드", price: 4500, baseQty: 14 },
    { menu: "샌드위치 (햄치즈)", category: "푸드", price: 6500, baseQty: 10 },
    { menu: "치즈케이크", category: "푸드", price: 6000, baseQty: 8 },
    { menu: "텀블러", category: "MD", price: 18000, baseQty: 1 },
    { menu: "원두 (200g)", category: "MD", price: 15000, baseQty: 2 },
  ]
  const weathers: SalesTransaction["weather"][] = ["맑음", "흐림", "비", "눈"]
  const result: SalesTransaction[] = []
  let idx = 0
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d, today)
    const dayOfWeek = new Date(date).getDay() // 0=Sun
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weatherIdx = Math.floor(rand() * weathers.length)
    const weather = weathers[weatherIdx]
    const tempC = Math.round(15 + rand() * 18 - (weather === "비" ? 4 : 0))
    for (const m of menus) {
      // weekend boost, weather effect for iced drinks, slight noise
      let qty = m.baseQty
      if (isWeekend) qty *= 1.35
      if (m.menu.includes("아이스") || m.menu === "콜드브루" || m.menu === "레몬에이드") {
        qty *= tempC > 22 ? 1.25 : tempC < 10 ? 0.7 : 1
      }
      if (m.menu.includes("라떼") && tempC < 12) qty *= 1.15
      if (weather === "비") qty *= 0.92
      qty = Math.max(0, Math.round(qty * (0.8 + rand() * 0.4)))
      idx++
      result.push({
        id: `TX-${String(idx).padStart(5, "0")}`,
        date,
        menu: m.menu,
        category: m.category,
        quantity: qty,
        unitPrice: m.price,
        amount: qty * m.price,
        weather,
        temperatureC: tempC,
      })
    }
  }
  return result
}

function seedPredictions(today: Date): Prediction[] {
  const types: Prediction["type"][] = ["수요 예측", "재고 예측", "폐기 예측"]
  const records: Prediction[] = []
  for (let i = 0; i < 30; i++) {
    const type = types[i % types.length]
    let predicted: string, actual: string, accuracy: number
    if (type === "수요 예측") {
      const p = 150 + Math.floor(rand() * 90)
      const a = Math.round(p * (0.85 + rand() * 0.25))
      predicted = `${p}잔`
      actual = `${a}잔`
      accuracy = Math.round((100 - (Math.abs(p - a) / p) * 100) * 10) / 10
    } else if (type === "재고 예측") {
      const p = 3 + Math.floor(rand() * 8)
      const a = Math.round(p * (0.8 + rand() * 0.4) * 10) / 10
      predicted = `원두 ${p}kg`
      actual = `원두 ${a}kg`
      accuracy = Math.round((100 - (Math.abs(p - a) / p) * 100) * 10) / 10
    } else {
      const p = 20000 + Math.floor(rand() * 40000)
      const a = Math.round(p * (0.6 + rand() * 0.7))
      predicted = `₩${p.toLocaleString()}`
      actual = `₩${a.toLocaleString()}`
      accuracy = Math.round((100 - (Math.abs(p - a) / p) * 100) * 10) / 10
    }
    accuracy = Math.max(40, Math.min(99.5, accuracy))
    const status: Prediction["status"] =
      accuracy >= 90 ? "accurate" : accuracy >= 75 ? "warning" : "inaccurate"
    records.push({
      id: i + 1,
      date: daysAgo(i, today),
      type,
      predicted,
      actual,
      accuracy,
      status,
    })
  }
  return records
}

// =============== Database singleton ===============

const g = globalThis as unknown as { __cafeDB?: DBState }

function buildSeed(): DBState {
  const today = new Date()
  return {
    inventory: seedInventory(today),
    suppliers: seedSuppliers(),
    staff: seedStaff(today),
    orders: seedOrders(today),
    wasteHistory: seedWasteHistory(today),
    expiring: seedExpiring(today),
    sales: seedSales(today),
    predictions: seedPredictions(today),
    seededAt: toISO(today),
  }
}

export function getDB(): DBState {
  if (!g.__cafeDB) {
    g.__cafeDB = buildSeed()
  } else {
    // If date rolled over, reseed time-sensitive parts
    const todayISO = toISO(new Date())
    if (g.__cafeDB.seededAt !== todayISO) {
      const fresh = buildSeed()
      // preserve user-mutated inventory/orders if possible
      g.__cafeDB = {
        ...fresh,
        inventory: g.__cafeDB.inventory,
        orders: g.__cafeDB.orders,
      }
      g.__cafeDB.seededAt = todayISO
    }
  }
  return g.__cafeDB!
}

export function resetDB(): void {
  g.__cafeDB = buildSeed()
}

// =============== CRUD helpers ===============

export function listInventory(): InventoryItem[] {
  return getDB().inventory
}

export function createInventoryItem(input: Omit<InventoryItem, "id" | "lastUpdated">): InventoryItem {
  const db = getDB()
  const nextNum = db.inventory.length + 1
  const item: InventoryItem = {
    ...input,
    id: `INV-${String(nextNum).padStart(3, "0")}`,
    lastUpdated: toISO(new Date()),
  }
  db.inventory.push(item)
  return item
}

export function updateInventoryItem(
  id: string,
  patch: Partial<Omit<InventoryItem, "id">>,
): InventoryItem | null {
  const db = getDB()
  const idx = db.inventory.findIndex((i) => i.id === id)
  if (idx < 0) return null
  db.inventory[idx] = {
    ...db.inventory[idx],
    ...patch,
    lastUpdated: toISO(new Date()),
  }
  return db.inventory[idx]
}

export function deleteInventoryItem(id: string): boolean {
  const db = getDB()
  const before = db.inventory.length
  db.inventory = db.inventory.filter((i) => i.id !== id)
  return db.inventory.length < before
}

export function listOrders(): Order[] {
  return getDB().orders
}

export function listSuppliers(): Supplier[] {
  return getDB().suppliers
}

export function listWasteHistory(): WasteHistory[] {
  return getDB().wasteHistory
}

export function listExpiring(): WasteItem[] {
  return getDB().expiring
}

export function listSales(): SalesTransaction[] {
  return getDB().sales
}

export function listPredictions(): Prediction[] {
  return getDB().predictions
}

export { categories }
