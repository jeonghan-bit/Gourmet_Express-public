'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1 * 60 * 1000, // 1 minute (reduced from 5 minutes)
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true, // Refetch when reconnecting
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Analytics />
      {!pathname.startsWith("/admin") && <SpeedInsights />}
    </QueryClientProvider>
  )
}
