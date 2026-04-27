import { NextResponse } from "next/server"
import { deleteInventoryItem, updateInventoryItem } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const updated = updateInventoryItem(id, body)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ item: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ok = deleteInventoryItem(id)
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
