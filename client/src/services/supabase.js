import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rffaqdgvalndyivmtaui.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZmFxZGd2YWxuZHlpdm10YXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDgzNDgsImV4cCI6MjEwMzgyNDM0OH0.k_saLECdq-8vSKV56lvr2zXOJMGt2-RwtgShli4LV14';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
