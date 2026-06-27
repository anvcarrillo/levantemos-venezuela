import { createClient } from '@supabase/supabase-js'

export type Category = {
  id: string
  name: string
  slug: string
}

export type Resource = {
  id: string
  url: string
  url_normalized: string | null
  title: string | null
  description: string | null
  category_id: string
  status: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export type Foundation = {
  id: string
  name: string
  focus_area: string | null
  region: string | null
  donation_url: string | null
  accepts_international: boolean
  notes: string | null
  created_at: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
