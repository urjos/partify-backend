import express from "express";

import { PORT } from "./config/env.js";

import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import eventRouter from "./routes/event.routes.js";
import connnectToDatabase from "./database/mongodb.js";
import webhookRouter from "./routes/webhook.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import mongoSanitize from "express-mongo-sanitize";
import corsMiddleware from "./middlewares/cors.middleware.js";

const app = express();

app.use(corsMiddleware);

// This route must receive the unparsed payload for Svix signature verification.
app.use(
  "/api/v1/webhooks",
  bodyParser.raw({ type: "application/json" }),
  webhookRouter,
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mongoSanitize({ replaceWith: "_" }));

// All JSON API routes receive Arcjet bot protection and rate limiting. Webhooks
// are deliberately handled above because their signed raw body cannot be parsed.
app.use("/api/v1", arcjetMiddleware);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/events", eventRouter);

app.use(errorMiddleware);

app.listen(PORT, async () => {
  console.log(`Server running is running on http://localhost:${PORT}`);

  await connnectToDatabase();
});

export default app;
