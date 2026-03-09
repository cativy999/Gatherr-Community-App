// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hueujkujdwkcfraxjwoq.supabase.co'
const supabaseKey = 'sb_publishable_vTFfdy9ozV6xfpUc5HT3DA_XgsbaXjJ'
export const supabase = createClient(supabaseUrl, supabaseKey)