import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nsqiytflqwlyqhdmueki.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWl5dGZscXdseXFoZG11ZWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTc5MDQsImV4cCI6MjA1NTQ5MzkwNH0.IyrTn7Hrz-ktNM6iC1Chk8Z-kWK9rhmWljb0n2XLpjo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
