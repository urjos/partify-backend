import { createClerkClient, verifyToken } from "@clerk/backend";
import { CLERK_SECRET_KEY } from "../config/env.js";
import User from "../models/user.model.js";

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const authorize = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { sub: clerkId } = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    let user = await User.findOne({ clerkId });

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ");
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;

      const profileFields = {
        name: fullName || clerkUser.username || "Partify user",
        email,
        avatarUrl: clerkUser.imageUrl,
      };

      try {
        user = await User.create({ clerkId, ...profileFields });
      } catch (err) {
        if (err.code === 11000 && email) {
          user = await User.findOneAndUpdate(
            { email },
            { $set: { clerkId, ...profileFields } },
            { new: true, upsert: true, runValidators: true },
          );
        } else {
          throw err;
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Token error:", error);
    res
      .status(401)
      .json({ success: false, message: "Unauthorized", error: error.message });
  }
};

export default authorize;
