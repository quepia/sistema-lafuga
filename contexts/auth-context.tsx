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

interface AppUser {
  id: string
  email: string
  name: string
  picture: string | null
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

  const fetchUserRole = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("authorized_users")
        .select("role")
        .eq("email", email)
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

  const mapUser = useCallback(async (authUser: SupabaseUser) => {
    const role = await fetchUserRole(authUser.email!)
    if (role) {
      return {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email!.split("@")[0],
        picture: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        role: role
      }
    }
    return null
  }, [fetchUserRole])

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const appUser = await mapUser(session.user)
        setUser(appUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Optimization: if user is already set and same ID, maybe skip? 
        // But need to ensure role is fresh? We'll remap.
        const appUser = await mapUser(session.user)
        setUser(appUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mapUser])

  const login = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
