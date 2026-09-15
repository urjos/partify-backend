import User from "../models/user.model.js";

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
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    if (req.params.id === "me") {
      return res.status(200).json({ success: true, data: req.user });
    }

    let user;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.params.id);
    } else {
      user = await User.findOne({ clerkId: req.params.id });
    }

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ success: true, data: user });
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
      socials,
      phone,
      visibleInRadar,
    } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (username !== undefined) user.username = username.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (location !== undefined) user.location = location.trim();
    if (genres !== undefined) user.genres = Array.isArray(genres) ? genres : [];
    if (spotifyPlaylist !== undefined)
      user.spotifyPlaylist = spotifyPlaylist.trim();
    if (socials !== undefined) {
      user.socials = {
        instagram:
          socials.instagram !== undefined
            ? socials.instagram.trim()
            : user.socials?.instagram || "",
        facebook:
          socials.facebook !== undefined
            ? socials.facebook.trim()
            : user.socials?.facebook || "",
        tiktok:
          socials.tiktok !== undefined
            ? socials.tiktok.trim()
            : user.socials?.tiktok || "",
      };
    }
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

