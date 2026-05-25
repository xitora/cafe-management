import { apiClient } from "./axios"

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await apiClient.get<T>(url)
  return res.data
}

export function formatKRW(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`
}
