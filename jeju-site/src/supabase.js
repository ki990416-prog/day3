import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경변수가 없으면 null (화면에서 안내 문구를 보여준다)
export const supabase = url && key ? createClient(url, key) : null
