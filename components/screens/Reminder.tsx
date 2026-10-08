import React, { useMemo, useState } from 'react';
import { Alert, Keyboard, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { formatTime, parseTimeInput, type ReminderSettings } from '@/utils/reminder';

interface Props {
    settings: ReminderSettings;
    // 通知の許可を求め、設定を保存して通知を登録し直す。許可されなかった場合は 'denied'
    onChange: (next: ReminderSettings) => Promise<'ok' | 'denied'>;
    onBack: () => void;
}

const PRESETS: [number, number][] = [[8, 0], [12, 30], [18, 0], [21, 0], [22, 30]];

export default function ReminderScreen({ settings, onChange, onBack }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);
    const [timeText, setTimeText] = useState(formatTime(settings.hour, settings.minute));
    const [busy, setBusy] = useState(false);

    const apply = async (next: ReminderSettings) => {
        setBusy(true);
        try {
            const result = await onChange(next);
            if (result === 'denied') {
                Alert.alert(
                    '通知が許可されていません',
                    'リマインドを使うには、端末の設定でこのアプリの通知を許可してください。',
                    [
                        { text: 'あとで', style: 'cancel' },
                        { text: '設定を開く', onPress: () => void Linking.openSettings() },
                    ],
                );
            }
        } catch (e) {
            console.error(e);
            Alert.alert('エラー', '通知の設定に失敗しました');
        } finally {
            setBusy(false);
        }
    };

    const setTime = (hour: number, minute: number) => {
        setTimeText(formatTime(hour, minute));
        void apply({ ...settings, hour, minute });
    };

    const submitTime = () => {
        const parsed = parseTimeInput(timeText);
        if (!parsed) {
            Alert.alert('入力エラー', '時刻は「21:00」のように入力してください');
            setTimeText(formatTime(settings.hour, settings.minute));
            return;
        }
        Keyboard.dismiss();
        setTime(parsed.hour, parsed.minute);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← 戻る</Text></TouchableOpacity>
                <Text style={styles.title}>リマインド通知</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.card}>
                <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>毎日、記録をリマインド</Text>
                        <Text style={styles.desc}>決めた時刻に「今日の収支を記録しましょう」と通知します。</Text>
                    </View>
                    {/* OS 標準の Switch はシミュレーターのタップ操作で反応しないことがあるため、自前のスイッチにしている */}
                    <TouchableOpacity
                        style={[styles.toggle, settings.enabled && styles.toggleOn]}
                        onPress={() => void apply({ ...settings, enabled: !settings.enabled })}
                        disabled={busy}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: settings.enabled }}
                        accessibilityLabel="毎日のリマインド"
                        activeOpacity={0.8}
                    >
                        <View style={[styles.knob, settings.enabled && styles.knobOn]} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.card, !settings.enabled && { opacity: 0.5 }]} pointerEvents={settings.enabled ? 'auto' : 'none'}>
                <Text style={styles.label}>通知する時刻</Text>
                <View style={styles.timeRow}>
                    <TextInput
                        style={styles.timeInput}
                        value={timeText}
                        onChangeText={setTimeText}
                        onSubmitEditing={submitTime}
                        onBlur={submitTime}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        returnKeyType="done"
                    />
                    <Text style={styles.desc}>24時間表記（例：21:00）</Text>
                </View>
                <View style={styles.presets}>
                    {PRESETS.map(([h, m]) => {
                        const active = settings.hour === h && settings.minute === m;
                        return (
                            <TouchableOpacity key={`${h}:${m}`} style={[styles.preset, active && styles.presetActive]} onPress={() => setTime(h, m)}>
                                <Text style={[styles.presetText, active && styles.presetTextActive]}>{formatTime(h, m)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <Text style={styles.note}>
                通知はこの端末の中だけで届き、外部には送信されません。端末の設定で通知をオフにしている場合は届きません。
            </Text>
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? 10 : (Platform.OS === 'ios' ? 12 : 8) },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    card: { backgroundColor: c.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    label: { fontSize: 15, fontWeight: '700', color: c.text },
    desc: { fontSize: 12, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
    toggle: { width: 52, height: 32, borderRadius: 16, backgroundColor: c.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleOn: { backgroundColor: c.primary },
    knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignSelf: 'flex-start' },
    knobOn: { alignSelf: 'flex-end' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
    timeInput: { width: 100, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10, fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center' },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    preset: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.chip, borderWidth: 1, borderColor: c.border },
    presetActive: { backgroundColor: c.primary, borderColor: c.primary },
    presetText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    presetTextActive: { color: '#fff' },
    note: { marginHorizontal: 20, marginTop: 14, fontSize: 12, color: c.textMuted, lineHeight: 18 },
});
