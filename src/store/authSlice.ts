import type { AnyAction, ThunkDispatch } from "@reduxjs/toolkit"
import { createSlice } from "@reduxjs/toolkit"
import { user } from "@/services/user"

type AppDispatch = ThunkDispatch<unknown, unknown, AnyAction>

function logout() {
  localStorage.removeItem("isAuthenticated")
  localStorage.removeItem("token")
}

export type AuthState = {
  loading: boolean
  errorMessage: string | null
  twoFaData: Record<string, unknown> | null
  me: Record<string, unknown> | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  loading: false,
  errorMessage: null,
  twoFaData: null,
  me: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    LOGIN_START(state) {
      state.loading = true
      state.errorMessage = null
    },
    TWO_FA_LOGIN(state, action: { payload: Record<string, unknown> }) {
      state.loading = false
      state.errorMessage = null
      state.twoFaData = action.payload
      state.isAuthenticated = true
      localStorage.setItem("isAuthenticated", "true")
      const token = action.payload?.token
      if (typeof token === "string") localStorage.setItem("token", token)
    },
    LOGIN_SUCCESS(state) {
      state.loading = true
      state.errorMessage = null
    },
    RECEIVE_ME(state, action: { payload: Record<string, unknown> }) {
      state.loading = false
      state.errorMessage = null
      state.me = action.payload
      state.isAuthenticated = true
      localStorage.setItem("isAuthenticated", "true")
    },
    LOGIN_ERROR(state, action: { payload: { errorMessage: string } }) {
      state.loading = false
      state.errorMessage = action.payload.errorMessage
    },
    LOGOUT(state) {
      logout()
      state.loading = false
      state.errorMessage = null
      state.twoFaData = null
      state.me = null
      state.isAuthenticated = false
    },
  },
})

export const {
  LOGIN_START,
  TWO_FA_LOGIN,
  LOGIN_SUCCESS,
  RECEIVE_ME,
  LOGIN_ERROR,
  LOGOUT,
} = authSlice.actions

type LoginCb = ((data: Record<string, unknown>) => void) | undefined

export const login =
  (username: string, password: string, cb?: LoginCb) =>
  (dispatch: AppDispatch) => {
    dispatch(LOGIN_START())
    user
      .login(username, password)
      .then((res) => {
        const data = (res || {}).data
        const token = data && (data as { token?: string }).token
        if (token) {
          if (cb) cb(data as Record<string, unknown>)
          dispatch(
            TWO_FA_LOGIN({ ...(data as Record<string, unknown>), email: username })
          )
          return
        }
        dispatch(LOGIN_SUCCESS())
        return user
          .fetchMe()
          .then((meRes) => {
            const meData = (meRes || {}).data
            const uid = meData && (meData as { uid?: string }).uid
            if (uid) {
              if (cb) cb(meData as Record<string, unknown>)
              return dispatch(RECEIVE_ME(meData as Record<string, unknown>))
            }
            logout()
            return dispatch(
              LOGIN_ERROR({
                errorMessage: "You must be an admin to login.",
              })
            )
          })
          .catch((e: Error & { response?: { data?: { message?: string } } }) =>
            dispatch(
              LOGIN_ERROR({
                errorMessage: (e.response && e.response.data && e.response.data.message) || e.message || "Login failed",
              })
            )
          )
      })
      .catch((e: Error & { response?: { data?: { message?: string } } }) => {
        const errorMessage =
          (e.response && e.response.data && e.response.data.message) ||
          e.message ||
          "Login failed"
        dispatch(LOGIN_ERROR({ errorMessage }))
      })
  }

export const logoutThunk = () => (dispatch: AppDispatch) => {
  dispatch(LOGOUT())
}

export default authSlice.reducer
