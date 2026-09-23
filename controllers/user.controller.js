import User from "../models/user.model.js";
import Event from "../models/event.model.js";
import { SUPABASE_URL } from "../config/env.js";
import { getSupabaseAdmin } from "../config/supabase.js";

const USERS_MEDIA_BUCKET = "users-media";

const ownedAvatarPath = (avatarUrl, clerkId) => {
  if (!avatarUrl || typeof avatarUrl !== "string" || !SUPABASE_URL) return null;

  try {
    const url = new URL(avatarUrl);
    const supabaseUrl = new URL(SUPABASE_URL);
    const prefix = `/storage/v1/object/public/${USERS_MEDIA_BUCKET}/avatars/`;
    if (url.origin !== supabaseUrl.origin || !url.pathname.startsWith(prefix)) {
      return null;
    }

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith(`${clerkId}_`) ? `avatars/${path}` : null;
  } catch {
    return null;
  }
};

const removeOwnedAvatar = async (avatarUrl, clerkId) => {
  const path = ownedAvatarPath(avatarUrl, clerkId);
  const supabase = getSupabaseAdmin();
  if (!path || !supabase) return;

  const { error } = await supabase.storage.from(USERS_MEDIA_BUCKET).remove([path]);
  if (error) console.error("Unable to remove replaced avatar", error.message);
};

const attachUserStats = async (user, currentUserId) => {
  const userObj = user.toObject ? user.toObject() : { ...user };

  const organizedCount = await Event.countDocuments({
    organizer: user._id,
    status: "active",
  });

  const attendedCount = await Event.countDocuments({
    "attendees.user": user._id,
    "attendees.status": "going",
  });

  let totalScore = 0;
  let totalRatings = 0;

  if (user.ratings && user.ratings.length > 0) {
    for (const r of user.ratings) {
      totalScore += r.score;
      totalRatings++;
    }
  }

  const events = await Event.find({ organizer: user._id });
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
  userObj.isVerified = Boolean(user.isVerified);
  userObj.rating =
    totalRatings > 0 ? Number((totalScore / totalRatings).toFixed(1)) : 5.0;
  userObj.ratingsCount = totalRatings;

  if (currentUserId && user.ratings) {
    const existing = user.ratings.find(
      (r) =>
        (r.user?.toString() || r.user?._id?.toString()) ===
        currentUserId.toString(),
    );
    userObj.userRating = existing ? existing.score : null;
  } else {
    userObj.userRating = null;
  }

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
    const dataWithStats = await attachUserStats(req.user, req.user._id);
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

    const currentUserId = req.user?._id;
    const dataWithStats = await attachUserStats(user, currentUserId);
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
    const previousAvatarUrl = avatarUrl !== undefined ? user.avatarUrl : null;
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== "string") {
        const error = new Error("avatarUrl must be a URL or null");
        error.statusCode = 400;
        throw error;
      }

      // A Supabase avatar can only refer to the authenticated user's namespace.
      // Provider avatars are external and intentionally never sent to Storage.remove.
      if (
        avatarUrl &&
        avatarUrl.includes(`/storage/v1/object/public/${USERS_MEDIA_BUCKET}/`) &&
        !ownedAvatarPath(avatarUrl, user.clerkId)
      ) {
        const error = new Error("avatarUrl does not belong to the authenticated user");
        error.statusCode = 403;
        throw error;
      }

      user.avatarUrl = avatarUrl;
    }
    if (location !== undefined) user.location = location.trim();
    if (genres !== undefined) user.genres = Array.isArray(genres) ? genres : [];
    if (spotifyPlaylist !== undefined)
      user.spotifyPlaylist = spotifyPlaylist.trim();
    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      user.phone = cleanPhone || undefined;
    }
    if (visibleInRadar !== undefined)
      user.visibleInRadar = Boolean(visibleInRadar);

    await user.save();
    if (avatarUrl !== undefined) {
      await removeOwnedAvatar(previousAvatarUrl, user.clerkId);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const rateUser = async (req, res, next) => {
  try {
    const { score } = req.body;
    const numericScore = Number(score);

    if (!numericScore || numericScore < 1 || numericScore > 5) {
      const error = new Error("El puntaje debe ser un número entre 1 y 5");
      error.statusCode = 400;
      throw error;
    }

    let user;
    if (req.params.id === "me") {
      const error = new Error("No puedes calificarte a ti mismo");
      error.statusCode = 400;
      throw error;
    } else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.params.id);
    } else {
      user = await User.findOne({ clerkId: req.params.id });
    }

    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    if (user._id.toString() === req.user._id.toString()) {
      const error = new Error("No puedes calificarte a ti mismo");
      error.statusCode = 400;
      throw error;
    }

    // Filtrar calificación anterior del mismo usuario para actualizar
    user.ratings = (user.ratings || []).filter(
      (r) =>
        (r.user?.toString() || r.user?._id?.toString()) !==
        req.user._id.toString(),
    );

    user.ratings.push({
      user: req.user._id,
      score: numericScore,
      createdAt: new Date(),
    });

    await user.save();

    const dataWithStats = await attachUserStats(user, req.user._id);

    res.status(200).json({
      success: true,
      message: "Calificación guardada exitosamente",
      data: dataWithStats,
    });
  } catch (error) {
    next(error);
  }
};

