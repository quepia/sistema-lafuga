"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { User as SupabaseUser } from "@supabase/supabase-js"

interface AppUser extends SupabaseUser {
  role: string
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchUserRole = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("authorized_users")
        .select("role")
        .eq("email", authUser.email!)
        .single()

      if (data) {
        return data.role
      }
      return null
    } catch (e) {
      console.error("Error fetching user role", e)
      return null
    }
  }, [supabase])

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const role = await fetchUserRole(session.user)
        if (role) {
          // Merge Supabase user with our role
          setUser({ ...session.user, role })
        } else {
          // User authenticated but not in whitelist
          // We let middleware handle the redirect, but we can also set user to null or special state
          // Setting user to null might cause "loading" loops if not careful.
          // We'll set user but with no role? Or null?
          // If we set User, app thinks logged in.
          // But middleware redirects to /unauthorized.
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user)
        if (role) {
          setUser({ ...session.user, role })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserRole])

  const login = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `http://localhost:3000/auth/callback`,
      },
    })
  }, [supabase])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }, [supabase, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
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
