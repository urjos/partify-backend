import mongoose from "mongoose";

const EVENT_CATEGORIES = [
  "Music",
  "Nightlife",
  "House party",
  "Outdoors",
  "Food & Drink",
  "Art & Culture",
  "Sports",
  "Networking",
];

const mediaItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const attendeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["going", "interested"],
      required: true,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxLength: 2000,
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
      enum: {
        values: EVENT_CATEGORIES,
        message: "{VALUE} is not a supported category",
      },
    },
    media: {
      type: [mediaItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "An event needs at least one photo or video",
      },
    },
    startAt: {
      type: Date,
      required: [true, "Event start date/time is required"],
    },
    location: {
      address: {
        type: String,
        required: [true, "Event location address is required"],
        trim: true,
      },
      // GeoJSON Point — habilita queries "eventos cerca de mí" con $near.
      // OJO: coordinates va [longitude, latitude], al revés de como
      // normalmente se piensa/escribe lat primero.
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        },
      },
    },
    capacity: {
      type: Number,
      min: 1,
      default: null,
    },
    isFreeEvent: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
      required: function () {
        return this.isFreeEvent === false;
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event must have an organizer"],
    },
    attendees: {
      type: [attendeeSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Índice geoespacial — imprescindible para $near / $geoWithin.
eventSchema.index({ "location.coordinates": "2dsphere" });

// Índices que vas a usar seguido: feed ordenado por fecha, y "mis eventos".
eventSchema.index({ startAt: 1 });
eventSchema.index({ organizer: 1 });

// Virtuals: cuentas derivadas en vez de guardadas — así nunca se
// desincronizan del arreglo real de attendees.
eventSchema.virtual("attendeeCount").get(function () {
  return this.attendees.filter((a) => a.status === "going").length;
});

eventSchema.virtual("interestedCount").get(function () {
  return this.attendees.filter((a) => a.status === "interested").length;
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

const Event = mongoose.model("Event", eventSchema);

export default Event;
