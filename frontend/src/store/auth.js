import { create } from 'zustand'
import { auth } from '../api/endpoints'

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('cc_token') || null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const data = await auth.login({ email, password })
      localStorage.setItem('cc_token', data.access_token)
      set({ user: data.user, token: data.access_token })
      return data.user
    } finally {
      set({ loading: false })
    }
  },

  register: async (payload) => {
    set({ loading: true })
    try {
      const data = await auth.register(payload)
      localStorage.setItem('cc_token', data.access_token)
      set({ user: data.user, token: data.access_token })
      return data.user
    } finally {
      set({ loading: false })
    }
  },

  bootstrap: async () => {
    if (get().initialized) return
    const token = localStorage.getItem('cc_token')
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const user = await auth.me()
      set({ user, token })
    } catch {
      localStorage.removeItem('cc_token')
      set({ user: null, token: null })
    } finally {
      set({ initialized: true })
    }
  },

  logout: () => {
    localStorage.removeItem('cc_token')
    set({ user: null, token: null })
  },
}))
