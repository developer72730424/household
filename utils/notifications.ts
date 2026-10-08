// 入力のリマインド通知（毎日、指定の時刻にローカル通知を出す）。expo-notifications に依存する。
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_BODY, REMINDER_TITLE, type ReminderSettings } from './reminder';

const CHANNEL_ID = 'daily-reminder';

// 通知を前面で受け取ったときの表示（アプリを開いている最中は出さない）
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
    }),
});

export type PermissionResult = 'granted' | 'denied';

export async function requestReminderPermission(): Promise<PermissionResult> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    // 一度拒否されていると、OS の仕様でもう一度は尋ねられない（設定アプリから変える必要がある）
    if (!current.canAskAgain) return 'denied';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
}

// 設定に合わせて通知を登録し直す（古い登録は先に消す）。無効なら登録しない
export async function applyReminder(settings: ReminderSettings): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.enabled) return;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: '入力のリマインド',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    await Notifications.scheduleNotificationAsync({
        content: { title: REMINDER_TITLE, body: REMINDER_BODY },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: settings.hour,
            minute: settings.minute,
            channelId: CHANNEL_ID,
        },
    });
}
