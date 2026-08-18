const Notification = require("../models/Notification");

async function createNotification(payload) {
  return Notification.create(payload);
}

async function createNotificationForMany(recipientIds, payload) {
  const docs = recipientIds.map((recipient) => ({ ...payload, recipient }));
  return Notification.insertMany(docs);
}

module.exports = { createNotification, createNotificationForMany };
