import { createClient } from "@supabase/supabase-js";
import {
  NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env.js";

let supabaseAdmin;

if (NODE_ENV === "production" && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production");
}

export const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabaseAdmin;
};
