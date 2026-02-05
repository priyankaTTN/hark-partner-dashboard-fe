import { login as apiLogin, fetchMe as apiFetchMe } from "@/lib/api"

/** Login response shape for thunk (res.data) */
export type LoginData = { token?: string; [key: string]: unknown }
/** FetchMe response shape for thunk (res.data) */
export type MeData = { uid?: string; [key: string]: unknown }

export const user = {
  login(username: string, password: string): Promise<{ data: LoginData }> {
    return apiLogin(username, password).then((body) => ({ data: body as LoginData }))
  },
  fetchMe(): Promise<{ data: MeData }> {
    return apiFetchMe().then((body) => ({ data: body as MeData }))
  },
}
