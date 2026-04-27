import { NextResponse } from "next/server"
import { createInventoryItem, listInventory } from "@/lib/db"

export async function GET() {
  return NextResponse.json({ items: listInventory() })
}

export async function POST(req: Request) {
  const body = await req.json()
  const required = [
    "product",
    "category",
    "currentStock",
    "unit",
    "minStock",
    "maxStock",
    "unitPrice",
    "dailyUsage",
  ] as const
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 })
    }
  }
  const item = createInventoryItem({
    product: String(body.product),
    category: String(body.category),
    currentStock: Number(body.currentStock),
    unit: String(body.unit),
    minStock: Number(body.minStock),
    maxStock: Number(body.maxStock),
    unitPrice: Number(body.unitPrice),
    dailyUsage: Number(body.dailyUsage),
  })
  return NextResponse.json({ item }, { status: 201 })
}
