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
import { User as SupabaseUser, AuthChangeEvent } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

const AUTH_ATTEMPT_TIMEOUT_MS = 8000
const AUTH_WATCHDOG_TIMEOUT_MS = 18000
const AUTH_ROLE_TIMEOUT_MS = 5000
const AUTH_RETRY_DELAY_MS = 400

class AuthTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthTimeoutError"
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new AuthTimeoutError(message)), timeoutMs)
  })

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof AuthTimeoutError) {
    return "La sesión tardó demasiado en responder. Revisá la conexión y volvé a intentar."
  }

  if (error instanceof Error && error.message.startsWith("Tu cuenta")) {
    return error.message
  }

  return "No pudimos restaurar tu sesión. Volvé a intentar o iniciá sesión nuevamente."
}

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
  error: string | null
  retry: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const roleCache = useRef<Map<string, string>>(new Map())
  const userRef = useRef<AppUser | null>(null)
  const activeOperationRef = useRef(0)

  const fetchUserRole = useCallback(async (email: string): Promise<string> => {
    // Check cache first
    if (roleCache.current.has(email)) {
      return roleCache.current.get(email)!
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AUTH_ROLE_TIMEOUT_MS)

      try {
        const { data, error: roleError } = await supabase
          .from("authorized_users")
          .select("role")
          .eq("email", email)
          .abortSignal(controller.signal)
          .single()

        if (controller.signal.aborted) {
          throw new AuthTimeoutError("La verificación del usuario tardó demasiado")
        }

        if (roleError) {
          console.error("Error verifying authorized user", roleError)
          throw new Error("Tu cuenta no pudo ser verificada como usuario autorizado.")
        }

        if (!data?.role) {
          throw new Error("Tu cuenta no está autorizada para ingresar al sistema.")
        }

        roleCache.current.set(email, data.role)
        return data.role
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (roleError) {
      if (roleCache.current.has(email)) {
        return roleCache.current.get(email)!
      }

      throw roleError
    }
  }, [])

  const mapUser = useCallback(async (authUser: SupabaseUser): Promise<AppUser> => {
    if (!authUser.email) {
      throw new Error("La sesión no contiene un email válido.")
    }

    const role = await fetchUserRole(authUser.email)

    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split("@")[0],
      picture: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      role,
    }
  }, [fetchUserRole])

  const restoreSession = useCallback(async () => {
    const operationId = ++activeOperationRef.current
    setLoading(true)
    setError(null)

    const watchdogId = setTimeout(() => {
      if (activeOperationRef.current !== operationId) return

      // Invalidate any late result and guarantee that loading always terminates.
      activeOperationRef.current += 1
      userRef.current = null
      setUser(null)
      setError("La sesión no respondió a tiempo. Tocá Reintentar para volver a comprobarla.")
      setLoading(false)
    }, AUTH_WATCHDOG_TIMEOUT_MS)

    let lastError: unknown = null

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const appUser = await withTimeout(
            (async () => {
              const {
                data: { session },
                error: sessionError,
              } = await supabase.auth.getSession()

              if (sessionError) throw sessionError
              if (!session?.user) return null

              return mapUser(session.user)
            })(),
            AUTH_ATTEMPT_TIMEOUT_MS,
            "La restauración de la sesión tardó demasiado"
          )

          if (activeOperationRef.current !== operationId) return

          userRef.current = appUser
          setUser(appUser)
          setError(null)
          setLoading(false)
          return
        } catch (attemptError) {
          lastError = attemptError

          if (attempt === 0) {
            await wait(AUTH_RETRY_DELAY_MS)
          }
        }
      }

      if (activeOperationRef.current !== operationId) return

      console.error("Error restoring Supabase session", lastError)
      userRef.current = null
      setUser(null)
      setError(getAuthErrorMessage(lastError))
      setLoading(false)
    } finally {
      clearTimeout(watchdogId)
    }
  }, [mapUser])

  useEffect(() => {
    const deferredEvents = new Set<number>()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      // This callback must stay synchronous: Supabase executes it while holding
      // an exclusive auth lock. Any Supabase API call here can deadlock the client.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        activeOperationRef.current += 1
        userRef.current = null
        setUser(null)
        setError(null)
        setLoading(false)
        return
      }

      if (event === "SIGNED_IN" && userRef.current?.id === session.user.id) {
        return
      }

      const timeoutId = window.setTimeout(() => {
        deferredEvents.delete(timeoutId)
        void restoreSession()
      }, 0)
      deferredEvents.add(timeoutId)
    })

    void restoreSession()

    return () => {
      activeOperationRef.current += 1
      deferredEvents.forEach((timeoutId) => window.clearTimeout(timeoutId))
      subscription.unsubscribe()
    }
  }, [restoreSession])

  const login = useCallback(async () => {
    setError(null)
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (loginError) {
      setError("No pudimos iniciar el acceso con Google. Volvé a intentar.")
      console.error("Supabase OAuth error", loginError)
    }
  }, [])

  const logout = useCallback(async () => {
    roleCache.current.clear()
    activeOperationRef.current += 1
    userRef.current = null
    await supabase.auth.signOut()
    setUser(null)
    setError(null)
    setLoading(false)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        retry: restoreSession,
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
