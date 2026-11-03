import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../constants/Config';

export const BACKGROUND_ALERTS_TASK = 'GEOFENCE_BACKGROUND_ALERTS_TASK';

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register for push notifications
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    // Android Notification Channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('geofence-alerts', {
        name: 'Alertes Geofence',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06B6D4',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    if (!Device.isDevice) {
      console.log('[NotificationService] Running on simulator/emulator');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permission not granted');
      return null;
    }

    // Try to get Expo Push Token if project configured
    let pushToken: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      pushToken = tokenData.data;
      console.log('[NotificationService] Expo Push Token obtained:', pushToken);

      // Save token locally and send to backend
      await SecureStore.setItemAsync('expo_push_token', pushToken);
      const authToken = await SecureStore.getItemAsync('auth_token');
      if (authToken && pushToken) {
        await axios.post(
          `${API_URL}/api/push-token`,
          { token: pushToken, platform: Platform.OS },
          { headers: { Authorization: `Bearer ${authToken}` } }
        ).catch(e => console.log('[NotificationService] Push token register server error (silent):', e.message));
      }
    } catch (e: any) {
      console.log('[NotificationService] Expo push token fetch skipped (offline/local):', e.message);
    }

    return pushToken;
  } catch (err: any) {
    console.error('[NotificationService] Error registering notifications:', err);
    return null;
  }
}

/**
 * Trigger an immediate native local system notification.
 * Works even when app is backgrounded or inactive.
 */
export async function scheduleLocalNotification(title: string, body: string, data?: Record<string, any>) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'geofence-alerts' } : {}),
      } as any,
      trigger: null, // trigger immediately
    });
  } catch (err) {
    console.error('[NotificationService] Failed to schedule notification:', err);
  }
}

/**
 * Register Background Task to poll for new critical alerts while app is closed or backgrounded
 */
export async function registerBackgroundAlertsTask() {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ALERTS_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALERTS_TASK, {
        minimumInterval: 60 * 15, // 15 minutes minimum on iOS/Android
        stopOnTerminate: false,   // continue after app termination
        startOnBoot: true,        // restart after device reboot
      });
      console.log('[NotificationService] Background alert task registered successfully');
    }
  } catch (err: any) {
    console.log('[NotificationService] Background task registration notice:', err.message);
  }
}

// Define the background task handler
TaskManager.defineTask(BACKGROUND_ALERTS_TASK, async () => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const res = await axios.get(`${API_URL}/api/alerts?status=unacknowledged&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    const alerts = res.data;
    if (Array.isArray(alerts) && alerts.length > 0) {
      const lastAlertId = await SecureStore.getItemAsync('last_notified_alert_id');
      const newest = alerts[0];

      if (String(newest.id) !== lastAlertId) {
        await SecureStore.setItemAsync('last_notified_alert_id', String(newest.id));
        await scheduleLocalNotification(
          `⚠️ Alerte Flotte Geofence : ${newest.vehicle_name || 'Véhicule'}`,
          newest.message || 'Nouvel incident de sécurité détecté.',
          { alertId: newest.id }
        );
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err: any) {
    console.log('[NotificationService] Background alert check error:', err.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
