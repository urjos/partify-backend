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

    // Primera vez que vemos a este usuario de Clerk: lo espejamos en Mongo.
    // Necesario porque Event.organizer / attendees.user son ObjectId, no
    // clerkId directo.
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ");

      user = await User.create({
        clerkId,
        name: fullName || clerkUser.username || "Partify user",
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        avatarUrl: clerkUser.imageUrl,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Unauthorized", error: error.message });
  }
};

export default authorize;
