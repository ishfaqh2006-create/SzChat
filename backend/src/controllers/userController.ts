import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/db.js';
import { pushService } from '../services/pushService.js';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const users = await db.searchUsers(query, req.user!.id);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
};

export const getVapidPublicKey = async (_req: AuthRequest, res: Response) => {
  try {
    const publicKey = pushService.getPublicKey();
    res.json({ publicKey });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve VAPID public key' });
  }
};

export const subscribePush = async (req: AuthRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid push subscription format' });
    }
    db.savePushSubscription(req.user!.id, subscription);
    res.json({ success: true, message: 'Push subscription registered successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
};

export const sendTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    const subscriptions = db.getPushSubscriptions(req.user!.id);
    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'No active push subscriptions found for this account' });
    }

    let sentCount = 0;
    for (const sub of subscriptions) {
      const ok = await pushService.sendNotification(sub, {
        title: 'SzChat Notification Test',
        body: 'Real-time push notifications are fully configured & working on your device!',
        icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=szchat_app_logo',
        url: '/',
      });
      if (ok) sentCount++;
      else db.removePushSubscription(req.user!.id, sub.endpoint);
    }

    res.json({ success: true, sentCount, total: subscriptions.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};
