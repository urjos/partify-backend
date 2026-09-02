import Event from "../models/event.model.js";

const toGeoLocation = ({ address, latitude, longitude }) => ({
  address,
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude],
  },
});

const toEventItem = (event, currentUserId) => {
  const plain = event.toObject ? event.toObject() : event;

  return {
    id: plain._id.toString(),
    media: plain.media,
    title: plain.title,
    description: plain.description,
    category: plain.category,
    startAt: plain.startAt,
    dateLabel: new Date(plain.startAt).toLocaleString(),
    location: plain.location.address,
    latitude: plain.location.coordinates.coordinates[1],
    longitude: plain.location.coordinates.coordinates[0],
    capacity: plain.capacity ?? undefined,
    isFreeEvent: plain.isFreeEvent,
    price: plain.price,
    author: plain.organizer?.name ?? "Partify user",
    attendeeAvatars: (plain.attendees ?? [])
      .filter((a) => a.status === "going" && a.user?.avatarUrl)
      .slice(0, 3)
      .map((a) => a.user.avatarUrl),
    attendeeCount: plain.attendeeCount,
    interestedCount: plain.interestedCount,
    isGoing: currentUserId
      ? plain.attendees?.some(
          (a) =>
            a.user?._id?.toString() === currentUserId.toString() &&
            a.status === "going",
        )
      : undefined,
    isOwner: currentUserId
      ? plain.organizer?._id?.toString() === currentUserId.toString()
      : undefined,
  };
};

const ORGANIZER_POPULATE = { path: "organizer", select: "name avatarUrl" };
const ATTENDEES_POPULATE = { path: "attendees.user", select: "name avatarUrl" };

export const getEvents = async (req, res, next) => {
  try {
    const { category, lat, lng, radiusKm } = req.query;

    const filter = { status: "active" };
    if (category) filter.category = category;

    if (lat && lng) {
      filter["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: (Number(radiusKm) || 25) * 1000, // km -> metros
        },
      };
    }

    const events = await Event.find(filter)
      .sort({ startAt: 1 })
      .populate(ORGANIZER_POPULATE)
      .populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      data: events.map((event) => toEventItem(event, req.user?._id)),
    });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate(ORGANIZER_POPULATE)
      .populate(ATTENDEES_POPULATE);

    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: toEventItem(event, req.user?._id),
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const {
      media,
      title,
      description,
      category,
      startAt,
      location,
      capacity,
      isFreeEvent,
      price,
    } = req.body;

    const event = await Event.create({
      media,
      title,
      description,
      category,
      startAt,
      location: toGeoLocation(location),
      capacity: capacity || null,
      isFreeEvent: isFreeEvent ?? true,
      price: isFreeEvent === false ? price : 0,
      organizer: req.user._id,
    });

    await event.populate(ORGANIZER_POPULATE);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: toEventItem(event, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      const error = new Error("You can only edit events you created");
      error.statusCode = 403;
      throw error;
    }

    const {
      media,
      title,
      description,
      category,
      startAt,
      location,
      capacity,
      isFreeEvent,
      price,
    } = req.body;

    if (media) event.media = media;
    if (title) event.title = title;
    if (description) event.description = description;
    if (category) event.category = category;
    if (startAt) event.startAt = startAt;
    if (location) event.location = toGeoLocation(location);
    if (capacity !== undefined) event.capacity = capacity || null;
    if (isFreeEvent !== undefined) event.isFreeEvent = isFreeEvent;
    if (price !== undefined) event.price = isFreeEvent === false ? price : 0;

    await event.save();
    await event.populate(ORGANIZER_POPULATE);

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: toEventItem(event, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

// El frontend llama a esto "Cancel event" y lo quita de su lista local,
export const cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      const error = new Error("You can only cancel events you created");
      error.statusCode = 403;
      throw error;
    }

    event.status = "cancelled";
    await event.save();

    res.status(200).json({
      success: true,
      message: "Event cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

// No estaba en las rutas originales, pero el frontend necesita esto para
// el botón "I'm going" / "Interested" del detalle de evento.
export const setAttendance = async (req, res, next) => {
  try {
    const { status } = req.body; // "going" | "interested" | null

    if (status !== null && !["going", "interested"].includes(status)) {
      const error = new Error("status must be 'going', 'interested', or null");
      error.statusCode = 400;
      throw error;
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    event.attendees = event.attendees.filter(
      (a) => a.user.toString() !== req.user._id.toString(),
    );

    if (status !== null) {
      event.attendees.push({ user: req.user._id, status });
    }

    await event.save();
    await event.populate(ORGANIZER_POPULATE);
    await event.populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      data: toEventItem(event, req.user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserEvents = async (req, res, next) => {
  try {
    const events = await Event.find({
      organizer: req.params.id,
      status: "active",
    })
      .sort({ startAt: 1 })
      .populate(ORGANIZER_POPULATE)
      .populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      data: events.map((event) => toEventItem(event, req.user?._id)),
    });
  } catch (error) {
    next(error);
  }
};
