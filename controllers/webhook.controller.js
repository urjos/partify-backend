import { Webhook } from "svix";
import { CLERK_WEBHOOK_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

export const handleClerkWebhook = async (req, res) => {
  const payload =
    req.body instanceof Buffer ? req.body.toString("utf8") : req.body;

  const headers = req.headers;

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event;
  try {
    // 1. Verificamos la firma (si falla, saltará al catch)
    wh.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });

    // 2. Si pasó la verificación, nosotros mismos parseamos el string a JSON
    event = JSON.parse(payload.toString("utf8"));
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const { type, data } = event;

  switch (type) {
    case "user.created": {
      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ");

      await User.create({
        clerkId: data.id,
        name: fullName || data.username || "Partify user",
        email: data.email_addresses?.[0]?.email_address,
        avatarUrl: data.image_url,
      });

      console.log(`User created in MongoDB: ${data.id}`);
      break;
    }

    case "user.updated": {
      const updatedName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ");

      await User.findOneAndUpdate(
        { clerkId: data.id },
        {
          name: updatedName || data.username,
          email: data.email_addresses?.[0]?.email_address,
          avatarUrl: data.image_url,
        },
        { upsert: true, new: true },
      );

      console.log(`User updated in MongoDB: ${data.id}`);
      break;
    }

    case "user.deleted": {
      await User.findOneAndDelete({ clerkId: data.id });
      console.log(`User deleted from MongoDB: ${data.id}`);
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${type}`);
  }

  res.status(200).json({ received: true });
};
