import { createClient } from '@supabase/supabase-js';

// 여기에 Supabase에서 받은 URL과 키를 넣어줘
const supabaseUrl = 'https://ndtttlaixwuwjlewwlgs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdHR0bGFpeHd1d2psZXd3bGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzOTk3OTksImV4cCI6MjA1ODk3NTc5OX0.P4MS-42cxjDAduGKdSjXT1QnGZ40XDjNBKETttJfmnw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
