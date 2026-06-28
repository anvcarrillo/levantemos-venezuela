import { createClient } from '@supabase/supabase-js'

export type Category = {
  id: number
  name: string
  slug: string
}

export type FoundationCategory = {
  id: number
  name: string
  slug: string
  created_at: string
}

export type ZoneCategory = {
  id: number
  name: string
  slug: string
  created_at: string
}

export type Resource = {
  id: string
  url: string
  url_normalized: string | null
  title: string | null
  description: string | null
  category_id: number
  status: string | null
  upvotes: number
  report_count: number
  deactivated_at: string | null
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
  category_id: number | null
  created_at: string
  category?: FoundationCategory
}

export type Zone = {
  id: string
  name: string
  category_id: number | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  notes: string | null
  created_at: string
  category?: ZoneCategory
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
