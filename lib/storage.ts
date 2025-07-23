import { TriageSession, ChatMessage } from './supabase'

const GUEST_SESSION_KEY = 'luni_guest_session'
const GUEST_USAGE_KEY = 'luni_guest_usage'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export interface GuestUsage {
  casesUsed: number
  lastReset: string
  purchases: string[] // Array of purchase IDs
}

export function getGuestSession(): TriageSession | null {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionData = localStorage.getItem(GUEST_SESSION_KEY)
    if (!sessionData) return null
    
    const session: TriageSession = JSON.parse(sessionData)
    
    // Check if session has expired (24 hours)
    const sessionAge = Date.now() - new Date(session.created_at).getTime()
    if (sessionAge > SESSION_DURATION) {
      localStorage.removeItem(GUEST_SESSION_KEY)
      return null
    }
    
    return session
  } catch {
    return null
  }
}

export function saveGuestSession(session: TriageSession): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session))
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(GUEST_SESSION_KEY)
}

export function getGuestUsage(): GuestUsage {
  if (typeof window === 'undefined') {
    return { casesUsed: 0, lastReset: new Date().toISOString(), purchases: [] }
  }
  
  try {
    const usageData = localStorage.getItem(GUEST_USAGE_KEY)
    if (!usageData) {
      const newUsage: GuestUsage = {
        casesUsed: 0,
        lastReset: new Date().toISOString(),
        purchases: []
      }
      localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(newUsage))
      return newUsage
    }
    
    const usage: GuestUsage = JSON.parse(usageData)
    
    // Check if we need to reset daily usage
    const lastReset = new Date(usage.lastReset)
    const now = new Date()
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (24 * 60 * 60 * 1000))
    
    if (daysSinceReset >= 1) {
      usage.casesUsed = 0
      usage.lastReset = now.toISOString()
      localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage))
    }
    
    return usage
  } catch {
    const newUsage: GuestUsage = {
      casesUsed: 0,
      lastReset: new Date().toISOString(),
      purchases: []
    }
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(newUsage))
    return newUsage
  }
}

export function updateGuestUsage(updates: Partial<GuestUsage>): void {
  if (typeof window === 'undefined') return
  
  const currentUsage = getGuestUsage()
  const newUsage = { ...currentUsage, ...updates }
  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(newUsage))
}

export function canGuestStartNewCase(): boolean {
  const usage = getGuestUsage()
  
  // Check if user has unlimited access
  if (usage.purchases.includes('unlimited')) {
    return true
  }
  
  // Check if user has purchased additional cases
  const additionalCases = usage.purchases.filter(p => p === 'single-case').length
  const totalAllowedCases = 1 + additionalCases // 1 free + purchased
  
  return usage.casesUsed < totalAllowedCases
}

export function incrementGuestUsage(): void {
  const usage = getGuestUsage()
  updateGuestUsage({ casesUsed: usage.casesUsed + 1 })
}

export function addGuestPurchase(purchaseId: string): void {
  const usage = getGuestUsage()
  const newPurchases = [...usage.purchases, purchaseId]
  updateGuestUsage({ purchases: newPurchases })
}