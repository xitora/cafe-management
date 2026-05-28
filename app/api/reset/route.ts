import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/reset/", {
      method: "POST",
      cache: "no-store",
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false }, { status: 500 });
    }
  } catch (error) {
    console.error("Reset proxy error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
