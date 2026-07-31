import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://isezuvblfrwjbiplznau.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZXp1dmJsZnJ3amJpcGx6bmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MDUxNjYsImV4cCI6MjEwMDA4MTE2Nn0._3TUMWr-VDwkrMliQ79tiTgc2XQk1XzX8wfpRX8AdF4";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

