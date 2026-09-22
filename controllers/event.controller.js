import Event from "../models/event.model.js";
import User from "../models/user.model.js";

const toGeoLocation = ({ address, latitude, longitude }) => ({
  address,
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude],
  },
});

const toEventItem = (event, userOrId) => {
  const plain = event.toObject ? event.toObject() : event;
  const currentUserId = userOrId?._id
    ? userOrId._id.toString()
    : userOrId
      ? userOrId.toString()
      : undefined;
  const userFavorites = userOrId?.favorites;

  const userRatingObj =
    currentUserId && plain.ratings
      ? plain.ratings.find(
          (r) =>
            (r.user?._id?.toString() || r.user?.toString()) === currentUserId,
        )
      : null;

  const isFavorite = userFavorites
    ? userFavorites.some(
        (fav) =>
          (fav?._id?.toString() || fav?.toString()) === plain._id.toString(),
      )
    : false;

  const currentAttendee = currentUserId && plain.attendees
    ? plain.attendees.find(
        (a) =>
          (a.user?._id?.toString() || a.user?.toString()) === currentUserId,
      )
    : null;
  const attendanceStatus = currentAttendee ? currentAttendee.status : null;

  return {
    id: plain._id.toString(),
    media: plain.media,
    title: plain.title,
    description: plain.description,
    category: plain.category,
    typeMusic: plain.typeMusic ?? "",
    startAt: plain.startAt,
    dateLabel: new Date(plain.startAt).toLocaleString(),
    location: plain.location.address,
    latitude: plain.location.coordinates.coordinates[1],
    longitude: plain.location.coordinates.coordinates[0],
    capacity: plain.capacity ?? undefined,
    isFreeEvent: plain.isFreeEvent,
    price: plain.price,
    priceWomen: plain.priceWomen,
    isMultiplePrices: plain.isMultiplePrices,
    contactMethod: plain.contactMethod ?? "chat",
    contactPhone: plain.contactPhone || plain.organizer?.phone || "",
    externalTicketUrl: plain.externalTicketUrl ?? "",
    hideExactAddress: plain.hideExactAddress ?? false,
    closingAt: plain.closingAt ? plain.closingAt.toISOString() : undefined,
    author: plain.organizer?.name ?? "Partify user",
    authorId: plain.organizer?._id?.toString(),
    dressCode: plain.dressCode ?? "Casual",
    dressCodeDetails: plain.dressCodeDetails ?? "",
    corkageFree: plain.corkageFree ?? false,
    openBar: plain.openBar ?? false,
    isAdultsOnly: plain.isAdultsOnly ?? false,
    requirePhysicalId: plain.requirePhysicalId ?? false,
    authorAvatar: plain.organizer?.avatarUrl,
    authorIsVerified: Boolean(plain.organizer?.isVerified),
    attendeeAvatars: (plain.attendees ?? [])
      .filter((a) => a.status === "going" && a.user?.avatarUrl)
      .slice(0, 3)
      .map((a) => a.user.avatarUrl),
    attendeeCount:
      plain.attendeeCount ??
      (plain.attendees?.filter((a) => a.status === "going").length ?? 0),
    interestedCount:
      plain.interestedCount ??
      (plain.attendees?.filter((a) => a.status === "interested").length ?? 0),
    rating: plain.rating ?? 0,
    ratingsCount:
      plain.ratingsCount ?? (plain.ratings ? plain.ratings.length : 0),
    userRating: userRatingObj ? userRatingObj.score : null,
    isFavorite,
    attendanceStatus,
    isGoing: attendanceStatus === "going",
    isInterested: attendanceStatus === "interested",
    isOwner: currentUserId
      ? (plain.organizer?._id?.toString() || plain.organizer?.toString()) ===
        currentUserId
      : undefined,
  };
};

const ORGANIZER_POPULATE = {
  path: "organizer",
  select: "name avatarUrl phone isVerified",
};
const ATTENDEES_POPULATE = { path: "attendees.user", select: "name avatarUrl" };

export const getEvents = async (req, res, next) => {
  try {
    const { category, lat, lng, radiusKm } = req.query;

    const filter = { status: "active" };
    if (category) filter.category = category;

    if (lat && lng) {
      const radiusKmNumber = Number(radiusKm) || 10;
      const radiusInRadians = radiusKmNumber / 6378.1; // Radio de la Tierra en km
      filter["location.coordinates"] = {
        $geoWithin: {
          $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
        },
      };
    }

    const events = await Event.find(filter)
      .sort({ startAt: 1 })
      .populate(ORGANIZER_POPULATE)
      .populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      data: events.map((event) => toEventItem(event, req.user)),
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
      data: toEventItem(event, req.user),
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
      typeMusic,
      startAt,
      location,
      capacity,
      isFreeEvent,
      price,
      priceWomen,
      isMultiplePrices,
      contactMethod,
      contactPhone,
      externalTicketUrl,
      hideExactAddress,
      closingAt,
      dressCode,
      dressCodeDetails,
      corkageFree,
      openBar,
      isAdultsOnly,
      requirePhysicalId,
    } = req.body;

    const event = await Event.create({
      media,
      title,
      description,
      category,
      typeMusic: typeMusic || "",
      startAt,
      location: toGeoLocation(location),
      capacity: capacity || null,
      isFreeEvent: isFreeEvent ?? true,
      price:
        isFreeEvent === false &&
        !isMultiplePrices &&
        price !== undefined &&
        price !== null &&
        price !== ""
          ? Number(price)
          : null,
      priceWomen:
        isFreeEvent === false &&
        !isMultiplePrices &&
        priceWomen !== undefined &&
        priceWomen !== null &&
        priceWomen !== ""
          ? Number(priceWomen)
          : null,
      isMultiplePrices: isMultiplePrices ?? false,
      contactMethod: contactMethod || "chat",
      contactPhone: contactPhone || "",
      externalTicketUrl: externalTicketUrl || "",
      hideExactAddress: hideExactAddress ?? false,
      closingAt: closingAt ? new Date(closingAt) : null,
      organizer: req.user._id,
      dressCode: dressCode || "Casual",
      dressCodeDetails: dressCodeDetails
        ? dressCodeDetails.trim().slice(0, 50)
        : "",
      corkageFree: Boolean(corkageFree),
      openBar: Boolean(openBar),
      isAdultsOnly: Boolean(isAdultsOnly),
      requirePhysicalId: Boolean(requirePhysicalId),
    });

    await event.populate(ORGANIZER_POPULATE);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: toEventItem(event, req.user),
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
      typeMusic,
      startAt,
      location,
      capacity,
      isFreeEvent,
      price,
      priceWomen,
      isMultiplePrices,
      contactMethod,
      contactPhone,
      externalTicketUrl,
      hideExactAddress,
      closingAt,
      dressCode,
      dressCodeDetails,
      corkageFree,
      openBar,
      isAdultsOnly,
      requirePhysicalId,
    } = req.body;

    if (media) event.media = media;
    if (title) event.title = title;
    if (description) event.description = description;
    if (category) event.category = category;
    if (typeMusic !== undefined) event.typeMusic = typeMusic;
    if (startAt) event.startAt = startAt;
    if (location) event.location = toGeoLocation(location);
    if (capacity !== undefined) event.capacity = capacity || null;

    const nextIsFree = isFreeEvent !== undefined ? isFreeEvent : event.isFreeEvent;
    const nextIsMultiple = isMultiplePrices !== undefined ? isMultiplePrices : event.isMultiplePrices;
    if (isFreeEvent !== undefined) event.isFreeEvent = isFreeEvent;
    if (isMultiplePrices !== undefined) event.isMultiplePrices = isMultiplePrices;

    if (nextIsFree || nextIsMultiple) {
      event.price = null;
      event.priceWomen = null;
    } else {
      if (price !== undefined) {
        event.price = price !== null && price !== "" ? Number(price) : null;
      }
      if (priceWomen !== undefined) {
        event.priceWomen =
          priceWomen !== null && priceWomen !== "" ? Number(priceWomen) : null;
      }
    }

    if (contactMethod !== undefined) event.contactMethod = contactMethod;
    if (contactPhone !== undefined) event.contactPhone = contactPhone;
    if (externalTicketUrl !== undefined)
      event.externalTicketUrl = externalTicketUrl;
    if (hideExactAddress !== undefined)
      event.hideExactAddress = hideExactAddress;
    if (closingAt !== undefined)
      event.closingAt = closingAt ? new Date(closingAt) : null;
    if (dressCode !== undefined) event.dressCode = dressCode;
    if (dressCodeDetails !== undefined)
      event.dressCodeDetails = dressCodeDetails.trim().slice(0, 50);
    if (corkageFree !== undefined) event.corkageFree = Boolean(corkageFree);
    if (openBar !== undefined) event.openBar = Boolean(openBar);
    if (isAdultsOnly !== undefined) event.isAdultsOnly = Boolean(isAdultsOnly);
    if (requirePhysicalId !== undefined)
      event.requirePhysicalId = Boolean(requirePhysicalId);

    await event.save();
    await event.populate(ORGANIZER_POPULATE);

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: toEventItem(event, req.user),
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
      data: toEventItem(event, req.user),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserEvents = async (req, res, next) => {
  try {
    let organizerId = req.params.id;
    if (organizerId === "me") {
      organizerId = req.user._id;
    } else if (!organizerId.match(/^[0-9a-fA-F]{24}$/)) {
      const targetUser = await User.findOne({ clerkId: organizerId });
      if (targetUser) {
        organizerId = targetUser._id;
      }
    }

    const events = await Event.find({
      organizer: organizerId,
      status: "active",
    })
      .sort({ startAt: 1 })
      .populate(ORGANIZER_POPULATE)
      .populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      data: events.map((event) => toEventItem(event, req.user)),
    });
  } catch (error) {
    next(error);
  }
};

export const rateEvent = async (req, res, next) => {
  try {
    const { score } = req.body;
    const numericScore = Number(score);

    if (!numericScore || numericScore < 1 || numericScore > 5) {
      const error = new Error("Score must be a number between 1 and 5");
      error.statusCode = 400;
      throw error;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    // Remove existing rating from this user if any
    event.ratings = (event.ratings || []).filter(
      (r) => (r.user?.toString()) !== req.user._id.toString(),
    );

    event.ratings.push({
      user: req.user._id,
      score: numericScore,
      createdAt: new Date(),
    });

    await event.save();
    await event.populate(ORGANIZER_POPULATE);
    await event.populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      message: "Event rated successfully",
      data: toEventItem(event, req.user),
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      const error = new Error("Event not found");
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(req.user._id);
    const eventIdStr = event._id.toString();

    const isFav = (user.favorites || []).some(
      (f) => f.toString() === eventIdStr,
    );

    if (isFav) {
      user.favorites = user.favorites.filter((f) => f.toString() !== eventIdStr);
    } else {
      user.favorites = [...(user.favorites || []), event._id];
    }

    await user.save();
    req.user = user;

    await event.populate(ORGANIZER_POPULATE);
    await event.populate(ATTENDEES_POPULATE);

    res.status(200).json({
      success: true,
      message: isFav ? "Removed from favorites" : "Added to favorites",
      data: toEventItem(event, user),
    });
  } catch (error) {
    next(error);
  }
};
