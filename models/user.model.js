import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "User Name is required"],
      trim: true,
      minlength: 2,
      maxLength: 50,
    },
    email: {
      type: String,
      required: [true, "User Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Pleas fill a valid email address"],
    },

    password: {
      type: String,
      required: [true, "User password is required"],
      minlength: 6,
    },
  },
  { timestamp: true },
);

const User = mongoose.model("User", userSchema);

export default User;
