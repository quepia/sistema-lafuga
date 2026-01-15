"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

// Cookie helper functions
function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`
}

interface User {
  id: number
  email: string
  name: string
  picture: string | null
  role: string
  created_at: string | null
  last_login: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: () => void
  logout: () => void
  setToken: (token: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const initializedRef = useRef(false)

  // Load token from localStorage on mount and sync with cookie
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const storedToken = localStorage.getItem("access_token")
    if (storedToken) {
      setTokenState(storedToken)
      setCookie("access_token", storedToken, 7)
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setLoading(false)
        return true
      } else {
        localStorage.removeItem("access_token")
        deleteCookie("access_token")
        setTokenState(null)
        setUser(null)
        setLoading(false)
        return false
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("access_token")
      deleteCookie("access_token")
      setTokenState(null)
      setUser(null)
      setLoading(false)
      return false
    }
  }

  const login = useCallback(() => {
    window.location.href = `${API_URL}/auth/login/google`
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    deleteCookie("access_token")
    setTokenState(null)
    setUser(null)
    router.push("/login")
  }, [router])

  const setToken = useCallback(async (newToken: string): Promise<boolean> => {
    localStorage.setItem("access_token", newToken)
    setCookie("access_token", newToken, 7)
    setTokenState(newToken)
    return await fetchUser(newToken)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
