import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: [true, "Clerk ID is required"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please fill a valid email address"],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxLength: 250,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    genres: [
      {
        type: String,
        trim: true,
      },
    ],
    spotifyPlaylist: {
      type: String,
      trim: true,
      default: "",
    },
    socials: {
      instagram: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      tiktok: { type: String, trim: true, default: "" },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    visibleInRadar: {
      type: Boolean,
      default: true,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
