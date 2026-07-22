const webpush = require('web-push');
const User = require('../models/User');

const configured =
  Boolean(process.env.VAPID_PUBLIC_KEY) && Boolean(process.env.VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@taskflow.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys missing — desktop push notifications disabled');
}

const getPublicKey = () => process.env.VAPID_PUBLIC_KEY || '';

const saveSubscription = async (userId, subscription) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid push subscription');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const existingIndex = user.pushSubscriptions.findIndex(
    (s) => s.endpoint === subscription.endpoint
  );

  const entry = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  if (existingIndex >= 0) {
    user.pushSubscriptions[existingIndex] = entry;
  } else {
    if (user.pushSubscriptions.length >= 10) {
      user.pushSubscriptions.shift();
    }
    user.pushSubscriptions.push(entry);
  }

  await user.save();
  return user.pushSubscriptions;
};

const removeSubscription = async (userId, endpoint) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { pushSubscriptions: { endpoint } },
  });
};

const sendPushToUser = async (userId, payload) => {
  if (!configured) return;

  const user = await User.findById(userId).select('pushSubscriptions');
  if (!user?.pushSubscriptions?.length) return;

  const body = JSON.stringify({
    title: payload.title || 'TaskFlow',
    message: payload.message || '',
    url: payload.url || '/',
    tag: payload.tag || 'taskflow-reminder',
  });

  const staleEndpoints = [];

  await Promise.all(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime,
            keys: sub.keys,
          },
          body
        );
      } catch (error) {
        // Gone / expired subscription
        if (error.statusCode === 404 || error.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error('Push send failed:', error.statusCode || error.message);
        }
      }
    })
  );

  if (staleEndpoints.length) {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } },
    });
  }
};

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  isPushConfigured: () => configured,
};
