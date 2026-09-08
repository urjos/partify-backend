import { Router } from "express";
import { handleClerkWebhook } from "../controllers/webhook.controller.js";

const webhookRouter = Router();

webhookRouter.post("/clerk", handleClerkWebhook);

export default webhookRouter;
