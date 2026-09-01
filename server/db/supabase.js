import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rffaqdgvalndyivmtaui.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZmFxZGd2YWxuZHlpdm10YXVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI0ODM0OCwiZXhwIjoyMTAzODI0MzQ4fQ.iMBrZQbC_Mvlqh4NiJSwzL3l6kkKEilLex81esuIXWA';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZmFxZGd2YWxuZHlpdm10YXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDgzNDgsImV4cCI6MjEwMzgyNDM0OH0.k_saLECdq-8vSKV56lvr2zXOJMGt2-RwtgShli4LV14';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabaseAdmin;
