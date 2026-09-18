import User from "../models/user.model.js";
import Event from "../models/event.model.js";

const attachUserStats = async (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };

  const organizedCount = await Event.countDocuments({
    organizer: user._id,
    status: "active",
  });

  const attendedCount = await Event.countDocuments({
    "attendees.user": user._id,
    "attendees.status": "going",
  });

  const events = await Event.find({ organizer: user._id });
  let totalScore = 0;
  let totalRatings = 0;
  for (const ev of events) {
    if (ev.ratings && ev.ratings.length > 0) {
      for (const r of ev.ratings) {
        totalScore += r.score;
        totalRatings++;
      }
    }
  }

  userObj.organizedCount = organizedCount;
  userObj.attendedCount = attendedCount;
  userObj.rating =
    totalRatings > 0 ? Number((totalScore / totalRatings).toFixed(1)) : 5.0;

  return userObj;
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    const dataWithStats = await attachUserStats(req.user);
    res.status(200).json({ success: true, data: dataWithStats });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    let user;
    if (req.params.id === "me") {
      user = req.user;
    } else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.params.id);
    } else {
      user = await User.findOne({ clerkId: req.params.id });
    }

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const dataWithStats = await attachUserStats(user);
    res.status(200).json({ success: true, data: dataWithStats });
  } catch (error) {
    next(error);
  }
};

export const checkUsernameAvailability = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(clean)) {
      return res.status(200).json({
        success: true,
        data: { available: false, reason: "invalid_format", username: clean },
      });
    }

    const query = { username: clean };
    if (req.user?._id) {
      query._id = { $ne: req.user._id };
    }

    const existing = await User.findOne(query);

    res.status(200).json({
      success: true,
      data: { available: !existing, username: clean },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    let targetUserId = req.user._id;

    if (req.params.id && req.params.id !== "me") {
      let targetUser;
      if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        targetUser = await User.findById(req.params.id);
      } else {
        targetUser = await User.findOne({ clerkId: req.params.id });
      }

      if (!targetUser) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      if (targetUser._id.toString() !== req.user._id.toString()) {
        const error = new Error("You can only edit your own profile");
        error.statusCode = 403;
        throw error;
      }
      targetUserId = targetUser._id;
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      username,
      bio,
      avatarUrl,
      location,
      genres,
      spotifyPlaylist,
      phone,
      visibleInRadar,
    } = req.body;

    if (name !== undefined) user.name = name.trim();

    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername && cleanUsername !== user.username) {
        if (!/^[a-z0-9._]{3,30}$/.test(cleanUsername)) {
          const error = new Error("Formato de nombre de usuario inválido");
          error.statusCode = 400;
          throw error;
        }
        const existing = await User.findOne({
          username: cleanUsername,
          _id: { $ne: user._id },
        });
        if (existing) {
          const error = new Error("El nombre de usuario ya está en uso");
          error.statusCode = 409;
          throw error;
        }
      }
      user.username = cleanUsername;
    }

    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (location !== undefined) user.location = location.trim();
    if (genres !== undefined) user.genres = Array.isArray(genres) ? genres : [];
    if (spotifyPlaylist !== undefined)
      user.spotifyPlaylist = spotifyPlaylist.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (visibleInRadar !== undefined)
      user.visibleInRadar = Boolean(visibleInRadar);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

