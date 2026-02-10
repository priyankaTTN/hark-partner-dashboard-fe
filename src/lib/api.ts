import { DASHBOARD_BASE_URL } from "@/config/constant"

type FetchAPIOptions = {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

export async function fetchAPI<T = unknown>(
  path: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const { method = "GET", body, headers: customHeaders = {}, credentials } = options
  const url = `${DASHBOARD_BASE_URL}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...customHeaders,
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
    ...(credentials !== undefined && { credentials }),
  })
  if (!res.ok) {
    const errText = await res.text()
    let errMessage = errText
    try {
      const errJson = JSON.parse(errText)
      errMessage = errJson.message ?? errJson.error ?? errText
    } catch {
      // use errText as-is
    }
    throw new Error(errMessage || `Request failed: ${res.status}`)
  }
  const contentType = res.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>
  }
  return res.text() as Promise<T>
}

export const login = (username: string, password: string) =>
  fetchAPI<{ token?: string }>("/api/v1/auth/milq", {
    method: "POST",
    body: { username, password },
    credentials: "include",
  })
export const fetchMe = () =>
  fetchAPI<{ id: string; email: string; name: string }>("/api/v0/me", {
    method: "GET",
    credentials: "include",
  })

export type CreateQuestionPayload = {
  title: string
  description?: string
  color: string
  hidden: boolean
  allowSameNamePlaylist: boolean
  allowSuggestion: boolean
}

export const createQuestion = (body: CreateQuestionPayload) =>
  fetchAPI<unknown>("/api/v1/questions", {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

export const deleteQuestion = (id: string | number) =>
  fetchAPI<unknown>(`/api/v0/questions/${id}`, {
    method: "DELETE",
    credentials: "include",
  })