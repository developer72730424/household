// 入力のリマインド通知の設定と、通知の文面。

export interface ReminderSettings {
    enabled: boolean;
    hour: number;    // 0-23
    minute: number;  // 0-59
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 21, minute: 0 };

export function normalizeReminder(raw: unknown): ReminderSettings {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_REMINDER };
    const r = raw as Record<string, unknown>;
    const hour = Number(r.hour);
    const minute = Number(r.minute);
    return {
        enabled: r.enabled === true,
        hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_REMINDER.hour,
        minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_REMINDER.minute,
    };
}

export const formatTime = (hour: number, minute: number): string =>
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

// 時刻の入力（"21:30" "9:5" "２１：３０" など）を読む。読めなければ null
export function parseTimeInput(text: string): { hour: number; minute: number } | null {
    const half = text
        .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/[：]/g, ':')
        .trim();
    const m = half.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
}

// 今日すでに記録済みなら、今夜の通知は不要。記録は日付 "YYYY-MM-DD" の一覧で渡す
export function hasEntryOn(dates: string[], today: string): boolean {
    return dates.includes(today);
}

export const REMINDER_TITLE = '今日の収支を記録しましょう';
export const REMINDER_BODY = 'レシートや支出をメモしておくと、月末が楽になります。';
