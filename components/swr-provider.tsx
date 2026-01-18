"use client"

import { SWRConfig, Cache } from "swr"
import { ReactNode } from "react"

interface SWRProviderProps {
    children: ReactNode
}

/**
 * Global SWR configuration provider
 * - Disables revalidation on focus to prevent UI freezes on tab switch
 * - Adds deduplication to prevent duplicate requests
 * - Keeps previous data while revalidating (stale-while-revalidate)
 */
export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                // Disable automatic revalidation on window focus
                // This prevents the "freeze" when switching tabs
                revalidateOnFocus: false,

                // Only revalidate on reconnect if data is stale
                revalidateOnReconnect: true,

                // Keep previous data while revalidating (stale-while-revalidate)
                keepPreviousData: true,

                // Deduplicate requests within 30 seconds
                dedupingInterval: 30000,

                // Limit error retries
                errorRetryCount: 2,

                // Show stale data immediately, then revalidate in background
                revalidateIfStale: true,

                // Revalidate on mount for fresh data
                revalidateOnMount: true,
            }}
        >
            {children}
        </SWRConfig>
    )
}

export default SWRProvider
