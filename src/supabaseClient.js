import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://whebeojozroxxxyfdpkx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZWJlb2pvenJveHh4eWZkcGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDM5MDAsImV4cCI6MjEwNTI3OTkwMH0.R9gMLkk-GKlHbNTWLdasM6JYal1NgCeKIV3LwTz_M4k'

export const supabase = createClient(supabaseUrl, supabaseKey)