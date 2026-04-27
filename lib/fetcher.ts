export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error(`Fetch failed: ${res.status}`)
    throw err
  }
  return res.json()
}

export function formatKRW(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`
}
