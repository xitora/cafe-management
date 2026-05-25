import { NextResponse } from "next/server"
import { fetchWeather } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get("region") || "서울"
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")

  try {
    const weatherData = await fetchWeather(region, lat, lon)
    return NextResponse.json(weatherData)
  } catch (error) {
    console.error("Failed to fetch weather:", error)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
