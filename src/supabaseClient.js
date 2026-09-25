import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://whebeojozroxxxyfdpkx.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZWJlb2pvenJveHh4eWZkcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDM5MDAsImV4cCI6MjEwNTI3OTkwMH0.R9gMLkk-GKlHbNTWLdasM6JYal1NgCeKIV3LwTz_M4k'

export const supabase = createClient(supabaseUrl, supabaseKey)