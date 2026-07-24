import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = (rawUrl && rawUrl.startsWith("http")) ? rawUrl : "https://placeholder-project.supabase.co";
const supabaseKey = rawKey || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

