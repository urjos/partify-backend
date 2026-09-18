import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

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
      unique: true,
      match: [/\S+@\S+\.\S+/, "Please fill a valid email address"],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
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

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    visibleInRadar: {
      type: Boolean,
      default: true,
    },
    ratings: {
      type: [ratingSchema],
      default: [],
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

// Índice para filtrado de usuarios en radar nocturno
userSchema.index({ visibleInRadar: 1 });

const User = mongoose.model("User", userSchema);

export default User;
