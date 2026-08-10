import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

// Auto-generate VAPID keys if not specified in environment
const keysFilePath = path.join(process.cwd(), '.vapid_keys.json');

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    if (fs.existsSync(keysFilePath)) {
      const stored = JSON.parse(fs.readFileSync(keysFilePath, 'utf-8'));
      if (stored.publicKey && stored.privateKey) {
        vapidKeys = stored;
      }
    }
  } catch {
    // Ignore read errors
  }

  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
    };
    try {
      fs.writeFileSync(keysFilePath, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    } catch {
      // Ignore write errors
    }
  }
}

const contactEmail = process.env.VAPID_SUBJECT || 'mailto:support@szchat.app';

try {
  webpush.setVapidDetails(contactEmail, vapidKeys.publicKey, vapidKeys.privateKey);
} catch (err) {
  console.error('Failed to set VAPID details:', err);
}

export const pushService = {
  getPublicKey(): string {
    return vapidKeys.publicKey;
  },

  async sendNotification(subscription: PushSubscriptionData, payload: { title: string; body: string; icon?: string; url?: string; chatId?: string }) {
    try {
      await webpush.sendNotification(
        subscription as any,
        JSON.stringify(payload)
      );
      return true;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription is expired or invalid
        return false;
      }
      console.error('Push notification sending failed:', err.message || err);
      return false;
    }
  },
};
