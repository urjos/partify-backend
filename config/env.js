import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const PORT = process.env.PORT || 5500;
export const NODE_ENV = process.env.NODE_ENV || "development";

export const {
  DB_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ARCJET_ENV,
  ARCJET_KEY,
  CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET,
  CORS_ORIGINS,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;
