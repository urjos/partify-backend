import mongoose from "mongoose";

const eventSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event Name is required"],
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
  },
  { timestamp: true },
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
