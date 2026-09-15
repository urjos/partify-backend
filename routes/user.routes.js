import { Router } from "express";

import authorize from "../middlewares/auth.middleware.js";
import {
  checkUsernameAvailability,
  getMyProfile,
  getUser,
  getUsers,
  updateMyProfile,
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.get("/check-username", authorize, checkUsernameAvailability);
userRouter.get("/me", authorize, getMyProfile);
userRouter.put("/me", authorize, updateMyProfile);
userRouter.get("/:id", authorize, getUser);
userRouter.put("/:id", authorize, updateMyProfile);

userRouter.post("/", (req, res) => res.send({ title: "CREATE a new user" }));
userRouter.delete("/:id", (req, res) => res.send({ title: "DELETE user" }));

export default userRouter;
