import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Proxy to Django Backend
    const res = await fetch("http://127.0.0.1:8000/api/forecasts/predict/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    if (!res.ok) {
      throw new Error(`Django backend responded with status ${res.status}`)
    }

    // 스트림(SSE)을 프론트엔드로 바로 넘겨줍니다.
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("Prediction Proxy Error:", error)
    return NextResponse.json({ error: "AI 모델(Django) 연동 중 오류가 발생했습니다.", detail: String(error) }, { status: 500 })
  }
}
