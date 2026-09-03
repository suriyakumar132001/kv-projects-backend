const Notification = require("../models/Notification");
const User = require("../models/User");

async function createNotification({
  recipient,
  type,
  title,
  message,
  link,
  relatedModel,
  relatedId,
}) {
  return Notification.create({
    recipient,
    type,
    title,
    message,
    link: typeof link === "function" ? link(await User.findById(recipient)) : link,
    relatedModel,
    relatedId,
  });
}

async function notifyRoles(roles, payload) {
  const users = await User.find({ role: { $in: roles } }).select("_id role");

  return Promise.all(
    users.map((user) =>
      createNotification({
        ...payload,
        recipient: user._id,
        link:
          typeof payload.link === "function"
            ? payload.link(user)
            : payload.link,
      }),
    ),
  );
}

module.exports = { createNotification, notifyRoles };