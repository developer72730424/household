import React, { useMemo } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, useAppColors } from '@/hooks/use-app-colors';
import { MEMO_MAX_LENGTH, PAYMENT_METHODS, type PaymentMethod } from '@/utils/entries';
import { pickReceipt, receiptUri } from '@/utils/receipt-files';

interface Props {
    memo: string;
    onChangeMemo: (t: string) => void;
    // 支払い方法（支出のときだけ渡す。収入では undefined にして隠す）
    payment?: PaymentMethod | null;
    onChangePayment?: (p: PaymentMethod | null) => void;
    // レシート写真: 保存済みのファイル名、または選んだばかり（まだ保存していない）の URI
    photoName?: string | null;
    pendingPhotoUri?: string | null;
    onPickPhoto?: (uri: string) => void;
    onRemovePhoto?: () => void;
}

// 入力画面の「メモ・支払い方法・レシート写真」のまとまり
export default function EntryExtras({ memo, onChangeMemo, payment, onChangePayment, photoName, pendingPhotoUri, onPickPhoto, onRemovePhoto }: Props) {
    const c = useAppColors();
    const styles = useMemo(() => createStyles(c), [c]);

    const showPhoto = !!onPickPhoto;
    const shownUri = pendingPhotoUri ?? receiptUri(photoName ?? undefined);

    const choose = async (source: 'camera' | 'library') => {
        const result = await pickReceipt(source);
        if (result.ok) onPickPhoto?.(result.uri);
        else if (result.reason === 'denied') {
            Alert.alert(
                source === 'camera' ? 'カメラが許可されていません' : '写真へのアクセスが許可されていません',
                '端末の設定でこのアプリの許可をオンにしてください。',
                [{ text: 'あとで', style: 'cancel' }, { text: '設定を開く', onPress: () => void Linking.openSettings() }],
            );
        }
    };

    const addPhoto = () => {
        Alert.alert('レシート写真', undefined, [
            { text: '撮影する', onPress: () => void choose('camera') },
            { text: '写真から選ぶ', onPress: () => void choose('library') },
            { text: 'キャンセル', style: 'cancel' },
        ]);
    };

    return (
        <View>
            {onChangePayment && (
                <>
                    <Text style={styles.label}>支払い方法</Text>
                    <View style={styles.chips}>
                        {PAYMENT_METHODS.map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.chip, payment === p && styles.chipActive]}
                                // もう一度押すと選択を解除する（未指定に戻せる）
                                onPress={() => onChangePayment(payment === p ? null : p)}
                            >
                                <Text style={[styles.chipText, payment === p && styles.chipTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
                style={[styles.input, styles.memoInput]}
                value={memo}
                onChangeText={onChangeMemo}
                placeholder="例：友人と、まとめ買い"
                placeholderTextColor={c.textMuted}
                multiline
                maxLength={MEMO_MAX_LENGTH}
            />

            {showPhoto && (
                <>
                    <Text style={styles.label}>レシート写真（任意）</Text>
                    {shownUri ? (
                        <View style={styles.photoRow}>
                            <Image source={{ uri: shownUri }} style={styles.photo} resizeMode="cover" />
                            <TouchableOpacity style={styles.photoBtn} onPress={addPhoto}><Text style={styles.photoBtnText}>変更</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.photoBtn} onPress={onRemovePhoto}><Text style={[styles.photoBtnText, { color: c.danger }]}>削除</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addPhoto} onPress={addPhoto} accessibilityLabel="レシート写真を追加">
                            <Text style={styles.addPhotoText}>📷 写真を追加</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    );
}

const createStyles = (c: AppColors) => StyleSheet.create({
    label: { fontSize: 14, fontWeight: '600', color: c.textSecondary, marginTop: 18, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.chip, borderWidth: 1, borderColor: c.border },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, color: c.text, fontSize: 15 },
    memoInput: { minHeight: 64, textAlignVertical: 'top' },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    photo: { width: 84, height: 84, borderRadius: 10, backgroundColor: c.chip },
    photoBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: c.chip },
    photoBtnText: { fontSize: 14, fontWeight: '600', color: c.primaryText },
    addPhoto: { padding: 16, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center' },
    addPhotoText: { fontSize: 14, color: c.primaryText, fontWeight: '600' },
});
