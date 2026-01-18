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
import { createBrowserClient } from "@supabase/ssr"
import { User as SupabaseUser, AuthChangeEvent } from "@supabase/supabase-js"

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

  // Cache the last processed user ID to avoid redundant role fetches
  const lastProcessedUserIdRef = useRef<string | null>(null)
  const roleCache = useRef<Map<string, string>>(new Map())

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchUserRole = useCallback(async (email: string): Promise<string | null> => {
    // Check cache first
    if (roleCache.current.has(email)) {
      return roleCache.current.get(email)!
    }

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const { data, error } = await supabase
        .from("authorized_users")
        .select("role")
        .eq("email", email)
        .single()
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (data?.role) {
        roleCache.current.set(email, data.role)
        return data.role
      }
      return null
    } catch (e) {
      // On timeout or error, return cached value if available
      if (roleCache.current.has(email)) {
        return roleCache.current.get(email)!
      }
      console.error("Error fetching user role", e)
      return null
    }
  }, [supabase])

  const mapUser = useCallback(async (authUser: SupabaseUser): Promise<AppUser | null> => {
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
        lastProcessedUserIdRef.current = session.user.id
        const appUser = await mapUser(session.user)
        setUser(appUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      // Skip TOKEN_REFRESHED events if we already have the user data
      // This prevents blocking the UI on tab focus when token refreshes
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === lastProcessedUserIdRef.current && user) {
        return
      }

      // Skip if this is the same user we already processed
      if (session?.user?.id === lastProcessedUserIdRef.current && user) {
        // Only update if user metadata changed (like name or picture)
        const currentMetadata = JSON.stringify({
          name: user.name,
          picture: user.picture
        })
        const newMetadata = JSON.stringify({
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email!.split("@")[0],
          picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
        })
        if (currentMetadata === newMetadata) {
          return
        }
      }

      if (session?.user) {
        lastProcessedUserIdRef.current = session.user.id
        const appUser = await mapUser(session.user)
        setUser(appUser)
      } else {
        lastProcessedUserIdRef.current = null
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mapUser, user])

  const login = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }, [supabase])

  const logout = useCallback(async () => {
    roleCache.current.clear()
    lastProcessedUserIdRef.current = null
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
