import { Router } from "express";
import authorize from "../middlewares/auth.middleware";

const eventRouter = Router();

eventRouter.get("/", (req, res) => res.send({ title: "GET all events" }));

eventRouter.get("/:id", (req, res) => res.send({ title: "GET event details" }));

eventRouter.post("/", authorize, (req, res) =>
  res.send({ title: "CREATE a new event" }),
);

eventRouter.put("/:id", (req, res) => res.send({ title: "UPDATE event" }));

eventRouter.delete("/:id", (req, res) => res.send({ title: "DELETE event" }));

eventRouter.get("/user/:id", (req, res) =>
  res.send({ title: "GET all user events" }),
);

export default eventRouter;
