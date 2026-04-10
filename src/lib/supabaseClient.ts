import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/** 未配置环境变量时为 null；业务层可先判断再调用云端 */
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, anonKey!) : null
