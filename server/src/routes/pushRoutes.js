const express = require('express');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  isPushConfigured,
} = require('../services/pushService');

const router = express.Router();

router.get(
  '/vapid-public-key',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        publicKey: getPublicKey(),
        enabled: isPushConfigured(),
      },
    });
  })
);

router.post(
  '/subscribe',
  protect,
  asyncHandler(async (req, res) => {
    if (!req.body?.endpoint || !req.body?.keys?.p256dh || !req.body?.keys?.auth) {
      res.status(400);
      throw new Error('Invalid push subscription');
    }
    await saveSubscription(req.user._id, req.body);
    res.json({ success: true, message: 'Desktop notifications enabled' });
  })
);

router.delete(
  '/subscribe',
  protect,
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400);
      throw new Error('Subscription endpoint is required');
    }
    await removeSubscription(req.user._id, endpoint);
    res.json({ success: true, message: 'Desktop notifications disabled' });
  })
);

module.exports = router;
