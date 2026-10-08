import React from 'react';

import ReminderScreen from '@/components/screens/Reminder';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';
import { applyReminder, requestReminderPermission } from '@/utils/notifications';
import type { ReminderSettings } from '@/utils/reminder';

export default function ReminderRoute() {
    const { reminder, setReminder } = useAppData();

    // 通知をオンにするときだけ許可を求める。許可されなければ、設定は「オフ」のまま保存する
    const change = async (next: ReminderSettings): Promise<'ok' | 'denied'> => {
        if (next.enabled && (await requestReminderPermission()) === 'denied') {
            setReminder({ ...next, enabled: false });
            await applyReminder({ ...next, enabled: false });
            return 'denied';
        }
        setReminder(next);
        await applyReminder(next);
        return 'ok';
    };

    return <ReminderScreen settings={reminder} onChange={change} onBack={useGoBack()} />;
}
