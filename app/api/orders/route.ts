import { NextResponse } from "next/server"
import { getStockStatus } from "@/lib/data"
import { listInventory, listOrders, listSuppliers } from "@/lib/db"

export async function GET() {
  const orders = listOrders()
  const inventory = listInventory()
  const suppliers = listSuppliers()

  // Build recommended orders dynamically from inventory state
  const lowItems = inventory
    .filter((i) => getStockStatus(i) !== "high")
    .map((i) => ({
      item: i,
      gap: i.minStock - i.currentStock,
      daysLeft: i.dailyUsage > 0 ? i.currentStock / i.dailyUsage : 999,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)

  const recommended = lowItems.map(({ item, daysLeft }) => {
    const urgency: "high" | "medium" | "low" =
      daysLeft <= 2 ? "high" : daysLeft <= 5 ? "medium" : "low"
    const recommendedQty = Math.max(
      item.minStock,
      Math.ceil(item.dailyUsage * 14 - item.currentStock),
    )
    return {
      product: item.product,
      currentStock: `${item.currentStock}${item.unit}`,
      dailyUsage: `${item.dailyUsage}${item.unit}`,
      recommendedQty: `${recommendedQty}${item.unit}`,
      urgency,
    }
  })

  return NextResponse.json({ orders, recommended, suppliers })
}
