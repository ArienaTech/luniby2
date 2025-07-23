import { createClient } from '@supabase/supabase-js'

// Use default values to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface TriageSession {
  id: string
  user_id?: string
  session_name: string
  pet_name: string
  region: 'NZ' | 'AU' | 'UK'
  messages: ChatMessage[]
  soap_note?: SOAPNote
  severity?: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  audio_url?: string
  image_url?: string
}

export interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
}