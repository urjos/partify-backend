import { Router } from "express";
import authorize from "../middlewares/auth.middleware.js";
import {
  cancelEvent,
  createEvent,
  getEvent,
  getEvents,
  getUserEvents,
  rateEvent,
  setAttendance,
  toggleFavorite,
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
eventRouter.patch("/:id/rate", authorize, rateEvent);
eventRouter.patch("/:id/favorite", authorize, toggleFavorite);

export default eventRouter;
