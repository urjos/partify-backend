import mongoose from "mongoose";

const EVENT_CATEGORIES = [
  "Rooftop",
  "Fiesta en Casa",
  "Underground",
  "After",
  "Discoteca",
  "Pool party",
  "Cumpleaños",
  "After office",
  "Fiesta electrónica",
  "Festival",
  "Otro",
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
    typeMusic: {
      type: String,
      default: "",
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
      default: null,
    },
    priceWomen: {
      type: Number,
      min: 0,
      default: null,
    },
    isMultiplePrices: {
      type: Boolean,
      default: false,
    },
    contactMethod: {
      type: String,
      enum: ["chat", "external"],
      default: "chat",
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    externalTicketUrl: {
      type: String,
      trim: true,
      default: "",
    },
    hideExactAddress: {
      type: Boolean,
      default: false,
    },
    closingAt: {
      type: Date,
      default: null,
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
    dressCode: {
      type: String,
      default: "Casual",
      trim: true,
    },
    dressCodeDetails: {
      type: String,
      maxlength: 50,
      default: "",
      trim: true,
    },
    corkageFree: {
      type: Boolean,
      default: false,
    },
    openBar: {
      type: Boolean,
      default: false,
    },
    isAdultsOnly: {
      type: Boolean,
      default: false,
    },
    requirePhysicalId: {
      type: Boolean,
      default: false,
    },
    ratings: {
      type: [ratingSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Índices de Producción para consultas de alto rendimiento
// 1. Índice geoespacial — imprescindible para $near / $geoWithin y radar de eventos.
eventSchema.index({ "location.coordinates": "2dsphere" });

// 2. Feed principal activo ordenado por fecha de inicio
eventSchema.index({ status: 1, startAt: 1 });

// 3. Filtrado por categoría en feed activo
eventSchema.index({ status: 1, category: 1, startAt: 1 });

// 4. Búsqueda de eventos organizados por usuario (ordenados por fecha de creación)
eventSchema.index({ organizer: 1, createdAt: -1 });

// 5. Búsqueda de eventos a los que asiste un usuario (Going / Interested)
eventSchema.index({ "attendees.user": 1 });

// Virtuals: cuentas derivadas en vez de guardadas — así nunca se
// desincronizan del arreglo real de attendees.
eventSchema.virtual("attendeeCount").get(function () {
  return this.attendees.filter((a) => a.status === "going").length;
});

eventSchema.virtual("interestedCount").get(function () {
  return this.attendees.filter((a) => a.status === "interested").length;
});

eventSchema.virtual("rating").get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
  return Number((sum / this.ratings.length).toFixed(1));
});

eventSchema.virtual("ratingsCount").get(function () {
  return this.ratings ? this.ratings.length : 0;
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

const Event = mongoose.model("Event", eventSchema);

export default Event;
