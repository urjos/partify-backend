import { Router } from "express";
import authorize from "../middlewares/auth.middleware.js";
import {
  cancelEvent,
  createEvent,
  getEvent,
  getEvents,
  getUserEvents,
  setAttendance,
  updateEvent,
} from "../controllers/event.controller.js";

const eventRouter = Router();

eventRouter.get("/", authorize, getEvents);
eventRouter.get("/user/:id", authorize, getUserEvents);
eventRouter.get("/:id", authorize, getEvent);

eventRouter.post("/", authorize, createEvent);
eventRouter.put("/:id", authorize, updateEvent);
eventRouter.delete("/:id", authorize, cancelEvent);
eventRouter.patch("/:id/attendance", authorize, setAttendance);

export default eventRouter;
