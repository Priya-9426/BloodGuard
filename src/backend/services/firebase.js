let admin;

/**
 * Initialize Firebase Admin SDK lazily on first use.
 * Reads credentials from FIREBASE_SERVICE_ACCOUNT_PATH env variable.
 */
function getAdmin() {
  if (admin) return admin;

  try {
    admin = require('firebase-admin');

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!serviceAccountPath) {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH not set. Push notifications disabled.');
      return null;
    }

    const fs = require('fs');
    const path = require('path');
    const resolvedPath = path.resolve(serviceAccountPath);

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[Firebase] Service account file not found at: ${resolvedPath}. Push notifications disabled.`);
      return null;
    }

    const serviceAccount = require(resolvedPath);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized');
    }

    return admin;
  } catch (err) {
    console.warn('[Firebase] Failed to initialize:', err.message);
    return null;
  }
}

/**
 * Send a simultaneous FCM push notification to multiple donor device tokens.
 * Uses sendEachForMulticast for reliable parallel delivery.
 *
 * IMPORTANT: All donors receive the notification at the exact same time.
 * There is NO sequential dispatch, NO ranking, NO priority ordering.
 */
async function sendBroadcastNotification({ donorTokens, request }) {
  const firebaseAdmin = getAdmin();

  if (!firebaseAdmin || !donorTokens || donorTokens.length === 0) {
    console.log(`[Firebase] Push broadcast skipped (${donorTokens?.length || 0} tokens, service: ${firebaseAdmin ? 'active' : 'disabled'})`);
    return { successCount: 0, failureCount: 0 };
  }

  const validTokens = donorTokens.filter(Boolean);
  if (validTokens.length === 0) {
    console.log('[Firebase] No valid FCM tokens to broadcast to.');
    return { successCount: 0, failureCount: 0 };
  }

  const message = {
    tokens: validTokens,
    notification: {
      title: `🚨 Emergency: ${request.bloodGroup} Blood Needed`,
      body: `${request.unitsRequired} unit(s) required at ${request.hospitalName}. Urgency: ${request.urgency}. Tap to respond.`,
    },
    data: {
      requestId: request._id.toString(),
      bloodGroup: request.bloodGroup,
      unitsRequired: String(request.unitsRequired),
      urgency: request.urgency,
      hospitalName: request.hospitalName,
      type: 'emergency_broadcast',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'bloodguard_emergency',
        priority: 'max',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: `🚨 Emergency: ${request.bloodGroup} Blood Needed`,
            body: `${request.unitsRequired} unit(s) at ${request.hospitalName}`,
          },
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    console.log(`[Firebase] Broadcast complete: ${response.successCount} delivered, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[Firebase] Broadcast failed:', err.message);
    return { successCount: 0, failureCount: validTokens.length };
  }
}

module.exports = { sendBroadcastNotification };
