import cors from "cors";
import { CORS_ORIGINS, NODE_ENV } from "../config/env.js";

const developmentOrigins = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19006",
];

const allowedOrigins = (CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must list allowed origins in production");
}

const origins =
  allowedOrigins.length > 0 ? allowedOrigins : developmentOrigins;

const corsMiddleware = cors({
  origin(origin, callback) {
    // Native clients and server-to-server webhook requests do not send Origin.
    if (!origin || origins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS");
    error.statusCode = 403;
    return callback(error);
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  maxAge: 600,
});

export default corsMiddleware;
