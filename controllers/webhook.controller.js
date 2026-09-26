import { Webhook } from "svix";
import { CLERK_WEBHOOK_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

export const handleClerkWebhook = async (req, res) => {
  if (!CLERK_WEBHOOK_SECRET) {
    return res
      .status(503)
      .json({ error: "Webhook verification is unavailable" });
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: "Webhook body must be raw" });
  }

  const payload = req.body.toString("utf8");

  const headers = req.headers;

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event;
  try {
    event = wh.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "user.created": {
        const fullName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ");
        const email = data.email_addresses?.[0]?.email_address;
        const profileFields = {
          name: fullName || data.username || "Partify user",
          email,
          avatarUrl: data.image_url,
        };

        try {
          await User.findOneAndUpdate(
            { clerkId: data.id },
            { $set: profileFields, $setOnInsert: { clerkId: data.id } },
            { upsert: true, new: true, runValidators: true },
          );
        } catch (err) {
          if (err.code === 11000 && email) {
            await User.findOneAndUpdate(
              { email },
              { $set: { clerkId: data.id, ...profileFields } },
              { new: true, upsert: true, runValidators: true },
            );
          } else {
            throw err;
          }
        }

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
          { upsert: true, new: true, runValidators: true },
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
  } catch (err) {
    console.error(`Webhook handler error (${type}):`, err.message);
  }

  res.status(200).json({ received: true });
};
