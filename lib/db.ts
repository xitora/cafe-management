// New Database client connected to Django Backend

import {
  type Order,
  type WasteHistory,
  type WasteItem,
  categories,
} from "./data"

export interface InventoryItem {
  id: string
  internalProductId?: number
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

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  category: string
  rating: number
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
  date: string
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
  predictedQty?: number
  product?: string
  accuracy: number
  status: "accurate" | "warning" | "inaccurate"
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

// =============== API Fetchers ===============

const API_BASE = "http://127.0.0.1:8000/api"

async function fetchAPI(endpoint: string) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error)
    return null
  }
}

// =============== CRUD helpers ===============

export async function listInventory(): Promise<InventoryItem[]> {
  const products = await fetchAPI("/products/") || []
  const batches = await fetchAPI("/inventory/") || []
  
  if (!batches || batches.length === 0) {
    return [];
  }

  // Map Product ID to Product Data
  const productMap = new Map()
  for (const p of products) {
    productMap.set(p.id, p)
  }

  // Convert Django InventoryBatch to Frontend InventoryItem
  // If API fails, return empty to not break the UI
  const items: InventoryItem[] = batches.map((b: any, index: number) => {
    const p = productMap.get(b.product) || {}
    
    const idNum = b.id || index;
    let stock = b.current_qty || 0;
    const minStock = 10;
    
    // 사용자 요청: 대부분 적정 상태 유지, 가끔 부족 (10% 확률)
    // 매번 랜덤값이 바뀌지 않도록 ID를 기반으로 고정된 더미 수량 생성
    if (idNum % 10 !== 0 && stock <= minStock) {
      stock = 15 + (idNum % 25); // 15 ~ 39 사이의 적정 재고 부여
    }

    return {
      id: `INV-${String(idNum).padStart(3, "0")}`,
      internalProductId: p.id || b.product,
      category: p.category || "기타",
      product: p.name || `알 수 없는 상품(${b.product})`,
      currentStock: stock,
      unit: "개", // Default unit as it's missing in backend
      minStock: minStock,
      maxStock: 50,
      unitPrice: p.selling_price || 0,
      dailyUsage: 5,
      lastUpdated: b.received_date || daysAgo(0)
    }
  })

  return items
}

export async function createInventoryItem(input: Omit<InventoryItem, "id" | "lastUpdated">): Promise<InventoryItem | null> {
  // First, create or find the product
  // For simplicity, assuming the product already exists or we create a new one.
  // Actually, let's just create a new Product if we can't find it, or use product ID 1.
  // In a real app we'd search for the product. Here we create one to satisfy foreign key.
  let productId = 1;
  const prodRes = await fetch(`${API_BASE}/products/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: `P${Date.now()}`,
      name: input.product,
      category: input.category,
      selling_price: input.unitPrice
    })
  });
  if (prodRes.ok) {
    const prod = await prodRes.json();
    productId = prod.id;
  }

  const res = await fetch(`${API_BASE}/inventory/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: productId,
      received_date: toISO(new Date()),
      expiration_date: daysFromNow(10), // dummy expiration
      current_qty: input.currentStock,
      status: "NORMAL"
    })
  });

  if (!res.ok) return null;
  const created = await res.json();
  return {
    ...input,
    id: `INV-${String(created.id).padStart(3, "0")}`,
    lastUpdated: created.received_date
  };
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<Omit<InventoryItem, "id">>,
): Promise<InventoryItem | null> {
  const numericId = parseInt(id.replace("INV-", ""), 10);
  if (isNaN(numericId)) return null;

  // We only update the inventory batch qty for now
  if (patch.currentStock !== undefined) {
    await fetch(`${API_BASE}/inventory/${numericId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_qty: patch.currentStock
      })
    });
  }
  
  // Return pseudo updated item (in real app, fetch again)
  return {
    id,
    category: patch.category || "기타",
    product: patch.product || "수정된 상품",
    currentStock: patch.currentStock || 0,
    unit: "개",
    minStock: 10,
    maxStock: 50,
    unitPrice: 0,
    dailyUsage: 5,
    lastUpdated: toISO(new Date())
  }
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const numericId = parseInt(id.replace("INV-", ""), 10);
  if (isNaN(numericId)) return false;

  const res = await fetch(`${API_BASE}/inventory/${numericId}/`, {
    method: 'DELETE'
  });
  return res.ok;
}

export async function listOrders(): Promise<Order[]> {
  const orders = await fetchAPI("/orders/") || [];
  const products = await fetchAPI("/products/") || [];
  const productMap = new Map();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  return orders.map((o: any, index: number) => {
    const p = productMap.get(o.product) || {};
    return {
      id: `ORD-${String(o.id || index).padStart(3, "0")}`,
      date: (o.created_at || daysAgo(0)).substring(0, 10),
      supplier: "협력업체", 
      items: `${p.name || "상품"} ${o.recommended_qty || 0}개`,
      totalAmount: o.estimated_cost || 0,
      status: "발주 완료"
    };
  });
}

export async function listSuppliers(): Promise<Supplier[]> {
  return [] // No API for suppliers
}

export async function listWasteHistory(): Promise<WasteHistory[]> {
  const waste = await fetchAPI("/waste/") || [];
  const products = await fetchAPI("/products/") || [];
  const productMap = new Map();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  return waste.map((w: any, index: number) => {
    const p = productMap.get(w.product) || {};
    return {
      id: `WST-${String(w.id || index).padStart(3, "0")}`,
      date: (w.waste_datetime || daysAgo(0)).substring(0, 10),
      product: p.name || "상품",
      category: p.category || "기타",
      quantity: w.quantity || 0,
      reason: w.reason || "기타",
      loss: (p.selling_price || 0) * (w.quantity || 0)
    };
  });
}

export async function createWasteHistory(productId: number, quantity: number, reason: string) {
  try {
    const res = await fetch(`${API_BASE}/waste/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: productId,
        quantity: quantity,
        reason: reason,
        waste_datetime: new Date().toISOString()
      }),
    });
    if (!res.ok) {
      console.error("Failed to post waste:", await res.text());
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Waste DB Error:", error);
    return null;
  }
}

export async function listExpiring(): Promise<WasteItem[]> {
  const batches = await fetchAPI("/inventory/") || []
  const products = await fetchAPI("/products/") || []

  if (!batches || batches.length === 0) {
    return [];
  }
  const productMap = new Map()
  for (const p of products) {
    productMap.set(p.id, p)
  }

  const today = new Date()
  const expiring: WasteItem[] = []
  
  batches.forEach((b: any, index: number) => {
    if (b.expiration_date) {
      const expDate = new Date(b.expiration_date)
      const diffTime = expDate.getTime() - today.getTime()
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (daysLeft <= 3 && daysLeft >= 0) {
        const p = productMap.get(b.product) || {}
        expiring.push({
          id: `EXP-${index}`,
          product: p.name || "상품",
          quantity: b.current_qty || 0,
          expiryDate: b.expiration_date,
          daysLeft: daysLeft,
          cost: `₩${(p.selling_price || 0) * (b.current_qty || 0)}`
        })
      }
    }
  })
  return expiring;
}

export async function listSales(): Promise<SalesTransaction[]> {
  const sales = await fetchAPI("/sales/") || []
  
  if (sales.length === 0) {
    return [];
  }

  return sales.map((s: any, index: number) => {
    // Format YYYYMMDD to YYYY-MM-DD
    const dateStr = s.sale_date.length === 8 
      ? `${s.sale_date.substring(0,4)}-${s.sale_date.substring(4,6)}-${s.sale_date.substring(6,8)}`
      : s.sale_date

    return {
      id: `TX-${s.id || index}`,
      date: dateStr,
      menu: s.product_name || "알 수 없는 메뉴",
      category: (s.category as "커피" | "음료" | "푸드" | "MD") || "기타",
      quantity: s.quantity || 0,
      unitPrice: s.total_price ? Math.round(s.total_price / (s.quantity || 1)) : 0,
      amount: s.total_price || 0,
      weather: "맑음", // Mock weather
      temperatureC: 20
    }
  })
}

export async function listPredictions(): Promise<Prediction[]> {
  const forecasts = await fetchAPI("/forecasts/") || []
  const products = await fetchAPI("/products/") || []

  if (!forecasts || forecasts.length === 0) {
    return [];
  }
  const productMap = new Map()
  for (const p of products) {
    productMap.set(p.id, p)
  }

  return forecasts.map((f: any, index: number) => {
    const p = productMap.get(f.product) || {}
    return {
      id: f.id || index,
      date: f.target_date || daysAgo(0),
      type: "수요 예측",
      predicted: `${p.name || "상품"} ${f.predicted_qty}개`,
      predictedQty: f.predicted_qty,
      product: p.name || "상품",
      actual: "-",
      accuracy: 0,
      status: "warning"
    }
  })
}

export async function listPredictionLogs() {
  const logs = await fetchAPI("/prediction-logs/") || []
  return logs.map((log: any) => ({
    id: log.id,
    date: new Date(log.run_datetime).toLocaleString(),
    type: "수요 예측 실행",
    predicted: log.impact_summary,
    actual: "적용 중",
    accuracy: 0,
    status: "accurate",
    weather: log.weather_factors || "선택 안함",
    events: log.event_factors || "선택 안함",
  }))
}

export async function fetchAIPredictions(date: string) {
  try {
    const res = await fetch(`${API_BASE}/forecasts/predict/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date }),
      cache: "no-store",
    })
    if (!res.ok) return null
    
    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let resultData = null;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'result') {
              return data.data;
            } else if (data.type === 'error') {
              console.error("AI Error:", data.error_detail);
            }
          } catch (e) {}
        }
      }
    }
    return resultData;
  } catch (error) {
    console.error("AI Prediction Fetch Error:", error)
    return null
  }
}

export async function fetchWeather(region = "서울", lat?: string | null, lon?: string | null) {
  let url = `/weather/?region=${region}`;
  if (lat && lon) {
    url += `&lat=${lat}&lon=${lon}`;
  }
  return await fetchAPI(url);
}

export { categories }
